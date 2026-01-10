// app/src/routes/players.cjs
const { enrichGameListItem } = require("../services/enrich.cjs");

function stableRankFromScores(scores) {
  if (!Array.isArray(scores) || scores.length !== 4) return [null, null, null, null];
  const arr = scores.map((v, seat) => ({ seat, score: Number(v) || 0 }));
  arr.sort((a, b) => b.score - a.score);
  const placeBySeat = Array(4).fill(null);
  let place = 1;
  for (let i = 0; i < arr.length; i++) {
    if (i > 0 && arr[i].score < arr[i - 1].score) place = i + 1;
    placeBySeat[arr[i].seat] = place;
  }
  return placeBySeat;
}

function pickSeatByPlayerId(players, playerId, fallbackNickname) {
  if (!Array.isArray(players)) return null;

  // enrich後なら playerId が入る
  const byPid = players.find((p) => p?.playerId && p.playerId === playerId);
  if (byPid && typeof byPid.seat === "number") return byPid.seat;

  // fallback: nickname
  if (fallbackNickname) {
    const byNick = players.find((p) => p?.nickname === fallbackNickname);
    if (byNick && typeof byNick.seat === "number") return byNick.seat;
  }

  return null;
}

function buildRecentGameItem({ enrichedDoc, playerId, fallbackNickname }) {
  const uuid = enrichedDoc.uuid;
  const startTime = enrichedDoc.startTime ?? null;

  const mySeat = pickSeatByPlayerId(enrichedDoc.players, playerId, fallbackNickname);

  // delta: derived.playerStats の seat を参照
  let delta = 0;
  const stats = enrichedDoc?.derived?.playerStats;
  if (Array.isArray(stats) && typeof mySeat === "number") {
    const st = stats.find((s) => s?.seat === mySeat);
    if (st) delta = Number(st.deltaTotal) || 0;
  }

  // place
  const placeBySeat = stableRankFromScores(enrichedDoc.finalScores);
  const place = typeof mySeat === "number" ? placeBySeat[mySeat] : null;

  // table/title
  const tableLabel = enrichedDoc?.table?.label ?? null;
  const title = enrichedDoc?.table?.title ?? enrichedDoc?.table?.label ?? uuid;

  // opponents
  const opponents = (enrichedDoc.players || [])
    .filter((p) => (typeof mySeat === "number" ? p?.seat !== mySeat : p?.playerId !== playerId))
    .map((p) => ({
      seat: typeof p?.seat === "number" ? p.seat : null,
      nickname: p?.nickname ?? "",
      playerId: p?.playerId ?? null,
      displayName: p?.displayName ?? p?.nickname ?? "",
      image: p?.image ?? null,
    }));

  return { uuid, startTime, delta, place, tableLabel, title, opponents };
}

function mountPlayersRoutes(app, { mongo, mappings }) {
  // GET /api/players
  app.get("/api/players", async (_req, res) => {
    const players = mappings?.listPlayers ? mappings.listPlayers() : [];
    res.json({ players });
  });

  // GET /api/players/:playerId
  app.get("/api/players/:playerId", async (req, res) => {
    const playerId = req.params.playerId;

    // profile
    const profile = mappings?.getPlayerProfile ? mappings.getPlayerProfile(playerId) : null;
    if (!profile) return res.status(404).json({ error: "player not found" });

    // nicknames (identities.yaml)
    const nicknames = mappings?.listNicknamesByPlayerId
      ? mappings.listNicknamesByPlayerId(playerId)
      : [];

    // A方式では DB に players.playerId が無いので nickname で検索する
    if (!nicknames.length) {
      return res.json({
        profile,
        nicknames: [],
        aggregate: {
          games: 0, rounds: 0, deltaTotal: 0, hule: 0, tsumo: 0, ron: 0, dealIn: 0, riichi: 0, calls: 0, top1: 0,
        },
        rates: {
          avgDeltaPerGame: 0, riichiPerRound: 0, dealInPerRound: 0, hulePerRound: 0, topRate: 0,
        },
        recentGames: [],
      });
    }

    const rawDocs = await mongo.colDerived
      .find(
        { "players.nickname": { $in: nicknames } },
        {
          projection: {
            _id: 0,
            uuid: 1,
            startTime: 1,
            endTime: 1,
            players: 1,
            finalScores: 1,
            derived: 1,
          },
        }
      )
      .sort({ startTime: -1 })
      .limit(50)
      .toArray();

    // 返却用に enrich（overlay適用）
    const docs = rawDocs.map((d) =>
      enrichGameListItem(d) // listItem だけだと derived が落ちるので…
    );

    // ↑ ここが気になるなら、listItem では derived が落ちるので「専用 enrich」を使う方が良い
    // ただ、recentGames/aggregate では derived.playerStats を見るので、ここでは自前で enrich します：
    const { enrichGameDetail } = require("../services/enrich.cjs");
    const enrichedDocs = rawDocs.map((d) =>
      enrichGameDetail({ uuid: d.uuid, derived: d.derived }) // derived を enrich
    ).map((d, idx) => ({
      // list情報も合わせて持つ
      uuid: rawDocs[idx].uuid,
      startTime: rawDocs[idx].startTime,
      endTime: rawDocs[idx].endTime,
      finalScores: rawDocs[idx].finalScores,
      players: require("../services/enrich.cjs").enrichGameListItem(rawDocs[idx]).players,
      table: require("../services/enrich.cjs").enrichGameListItem(rawDocs[idx]).table,
      derived: d.derived,
    }));

    // aggregate
    const agg = {
      games: 0,
      rounds: 0,
      deltaTotal: 0,
      hule: 0,
      tsumo: 0,
      ron: 0,
      dealIn: 0,
      riichi: 0,
      calls: 0,
      top1: 0,
    };

    for (const doc of enrichedDocs) {
      agg.games++;

      // 自分の seat
      const mySeat = pickSeatByPlayerId(doc.players, playerId, nicknames[0]);

      // derived.playerStats
      const st = Array.isArray(doc?.derived?.playerStats) && typeof mySeat === "number"
        ? doc.derived.playerStats.find((s) => s?.seat === mySeat)
        : null;

      if (st) {
        agg.rounds += Number(st.rounds) || 0;
        agg.deltaTotal += Number(st.deltaTotal) || 0;
        agg.hule += Number(st.hule) || 0;
        agg.tsumo += Number(st.tsumo) || 0;
        agg.ron += Number(st.ron) || 0;
        agg.dealIn += Number(st.dealIn) || 0;
        agg.riichi += Number(st.riichi) || 0;
        agg.calls += Number(st.calls) || 0;
      }

      // top1
      const placeBySeat = stableRankFromScores(doc.finalScores);
      const place = typeof mySeat === "number" ? placeBySeat[mySeat] : null;
      if (place === 1) agg.top1++;
    }

    const rates = {
      avgDeltaPerGame: agg.games ? agg.deltaTotal / agg.games : 0,
      riichiPerRound: agg.rounds ? agg.riichi / agg.rounds : 0,
      dealInPerRound: agg.rounds ? agg.dealIn / agg.rounds : 0,
      hulePerRound: agg.rounds ? agg.hule / agg.rounds : 0,
      topRate: agg.games ? agg.top1 / agg.games : 0,
    };

    const fallbackNickname = nicknames[0] ?? "";

    const recentGames = enrichedDocs.map((doc) =>
      buildRecentGameItem({ enrichedDoc: doc, playerId, fallbackNickname })
    );

    res.json({ profile, nicknames, aggregate: agg, rates, recentGames });
  });
}

module.exports = { mountPlayersRoutes };

// app/src/services/playerSummary.cjs
const { getOverlay, applyPlayerOverride, resolveTableByUuid } = require("../mappings/overlay.cjs");

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function computePlacementFromFinalScores(players, finalScores) {
  if (!Array.isArray(finalScores) || finalScores.length !== 4) return null;

  const rows = [];
  for (const p of players || []) {
    const seat = p?.seat;
    if (typeof seat !== "number") continue;
    rows.push({ seat, score: safeNum(finalScores[seat]) });
  }
  if (rows.length !== 4) return null;

  rows.sort((a, b) => b.score - a.score);

  const seatToRank = new Map();
  let rank = 1;
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && rows[i].score !== rows[i - 1].score) rank = i + 1;
    seatToRank.set(rows[i].seat, rank);
  }
  return seatToRank;
}

async function buildPlayerSummary({ mongo, playerId, limitRecent = 30 }) {
  const ov = getOverlay();
  const p0 = ov.playersById.get(playerId);
  if (!p0) return null;

  const profile = applyPlayerOverride(playerId, {
    playerId: p0.id,
    displayName: p0.displayName,
    image: p0.image,
    tags: p0.tags,
  });

  // nicknames mapped to this playerId
  const nicknames = [];
  for (const [nn, pid] of ov.playerIdByNickname.entries()) {
    if (pid === playerId) nicknames.push(nn);
  }

  const docs = await mongo.colDerived
    .find({}, { projection: { _id: 0, uuid: 1, startTime: 1, endTime: 1, players: 1, finalScores: 1, derived: 1 } })
    .sort({ startTime: -1 })
    .toArray();

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

  const recent = [];

  for (const d of docs) {
    const derived = d.derived || {};
    const st = (derived.playerStats || []).find((x) => nicknames.includes(x?.nickname));
    if (!st) continue;

    agg.games += 1;
    agg.rounds += safeNum(st.rounds);
    agg.deltaTotal += safeNum(st.deltaTotal);
    agg.hule += safeNum(st.hule);
    agg.tsumo += safeNum(st.tsumo);
    agg.ron += safeNum(st.ron);
    agg.dealIn += safeNum(st.dealIn);
    agg.riichi += safeNum(st.riichi);
    agg.calls += safeNum(st.calls);

    const seatToRank = computePlacementFromFinalScores(d.players, d.finalScores);
    let rank = null;
    let seat = null;

    const pl = (d.players || []).find((x) => nicknames.includes(x?.nickname));
    if (pl && typeof pl.seat === "number") seat = pl.seat;
    if (seatToRank && seat !== null) rank = seatToRank.get(seat) ?? null;
    if (rank === 1) agg.top1 += 1;

    recent.push({
      uuid: d.uuid,
      startTime: d.startTime ?? null,
      endTime: d.endTime ?? null,
      table: resolveTableByUuid(d.uuid),
      delta: safeNum(st.deltaTotal),
      rank,
    });

    if (recent.length >= limitRecent) break;
  }

  const rates = {
    avgDeltaPerGame: agg.games ? agg.deltaTotal / agg.games : 0,
    riichiPerRound: agg.rounds ? agg.riichi / agg.rounds : 0,
    dealInPerRound: agg.rounds ? agg.dealIn / agg.rounds : 0,
    hulePerRound: agg.rounds ? agg.hule / agg.rounds : 0,
    topRate: agg.games ? agg.top1 / agg.games : 0,
  };

  return { profile, nicknames, aggregate: agg, rates, recentGames: recent };
}

module.exports = { buildPlayerSummary };

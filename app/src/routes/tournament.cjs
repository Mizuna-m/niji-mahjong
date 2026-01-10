// app/src/routes/tournament.cjs
const {
  resolvePlayerByNickname,
  resolveTableByUuid,
  applyGameOverride,
} = require("../mappings/overlay.cjs");

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function normalizeScores(s) {
  if (!Array.isArray(s)) return [0, 0, 0, 0];
  const a = s.slice(0, 4).map((v) => safeNum(v));
  while (a.length < 4) a.push(0);
  return a;
}

/**
 * 予選: 同点は seat が小さい方が上（=席順が先）
 * scores[seat] が最大の seat を返す
 */
function winnerSeatByScores(scores) {
  const s = normalizeScores(scores);
  let bestSeat = 0;
  let bestScore = s[0];

  for (let seat = 1; seat < 4; seat++) {
    const v = s[seat];
    if (v > bestScore) {
      bestScore = v;
      bestSeat = seat;
    } else if (v === bestScore) {
      if (seat < bestSeat) bestSeat = seat;
    }
  }
  return bestSeat;
}

/**
 * 1,2,2,4 の competition ranking を seatごとに作る（同点は seat小さい方が上）
 */
function placementByScores(scores) {
  const s = normalizeScores(scores);
  const rows = [];
  for (let seat = 0; seat < 4; seat++) rows.push({ seat, score: s[seat] });

  // score desc, tie seat asc
  rows.sort((a, b) => (b.score - a.score) || (a.seat - b.seat));

  const placeBySeat = Array(4).fill(null);
  let place = 1;
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && rows[i].score !== rows[i - 1].score) place = i + 1;
    placeBySeat[rows[i].seat] = place;
  }
  return placeBySeat;
}

/**
 * overlay（tables.yaml / overrides.yaml）から卓情報を組み立て
 */
function resolveGameMeta(uuid) {
  const table = resolveTableByUuid(uuid); // {uuid,label,note} or null
  const base = { uuid, table };
  const merged = applyGameOverride(uuid, base);

  const groupId =
    merged?.groupId ??
    merged?.table?.groupId ??
    merged?.tournament?.groupId ??
    null;

  const phase =
    merged?.phase ??
    merged?.table?.phase ??
    merged?.tournament?.phase ??
    null;

  const tableLabel =
    merged?.tableLabel ??
    merged?.table?.label ??
    null;

  const title =
    merged?.title ??
    merged?.table?.title ??
    merged?.table?.label ??
    (tableLabel || uuid);

  return { phase, groupId, tableLabel, title, table: merged?.table ?? table };
}

function defaultGroupLabel(groupId) {
  const g = String(groupId ?? "").trim();
  if (!g) return "予選グループ";
  return `予選${g}グループ`;
}

/**
 * derived.playerStats から seat の deltaTotal を取る（無いときは 0）
 */
function deltaBySeat(derived, seat) {
  const arr = derived?.playerStats;
  if (!Array.isArray(arr)) return 0;
  const st = arr.find((x) => typeof x?.seat === "number" && x.seat === seat);
  return safeNum(st?.deltaTotal);
}

/**
 * Mongo doc -> winner item
 */
function buildWinnerItem(doc) {
  const uuid = doc.uuid;
  const meta = resolveGameMeta(uuid);
  if (!meta.groupId) return null;

  const finalScores = normalizeScores(doc.finalScores);
  const placeBySeat = placementByScores(finalScores);
  const winSeat = winnerSeatByScores(finalScores);

  const players = Array.isArray(doc.players) ? doc.players : [];
  const pBySeat = new Map();
  for (const p of players) {
    if (typeof p?.seat === "number") pBySeat.set(p.seat, p);
  }

  const winnerNick = String(pBySeat.get(winSeat)?.nickname ?? "").trim();
  const winnerResolved = resolvePlayerByNickname(winnerNick);

  const winner = {
    seat: winSeat,
    nickname: winnerNick,
    playerId: winnerResolved.playerId ?? null,
    displayName: winnerResolved.displayName ?? winnerNick,
    image: winnerResolved.image ?? null,
    points: safeNum(finalScores[winSeat]),
    delta: deltaBySeat(doc.derived, winSeat),
    place: 1,
  };

  const opponents = [];
  for (let seat = 0; seat < 4; seat++) {
    if (seat === winSeat) continue;
    const nick = String(pBySeat.get(seat)?.nickname ?? "").trim();
    const r = resolvePlayerByNickname(nick);
    opponents.push({
      seat,
      nickname: nick,
      playerId: r.playerId ?? null,
      displayName: r.displayName ?? nick,
      image: r.image ?? null,
      points: safeNum(finalScores[seat]),
      place: placeBySeat[seat],
    });
  }

  opponents.sort((a, b) => (a.place - b.place) || (a.seat - b.seat));

  return {
    groupId: meta.groupId,
    gameUuid: uuid,
    startTime: doc.startTime ?? null,
    endTime: doc.endTime ?? null,
    tableLabel: meta.tableLabel,
    title: meta.title,
    winner,
    opponents,
  };
}

/**
 * wildcard 用：全非1位プレイヤーを並べる
 */
function sortWildcardCandidates(a, b) {
  if (b.points !== a.points) return b.points - a.points; // points desc
  if (a.seat !== b.seat) return a.seat - b.seat; // tie seat asc
  if (a.startTime !== b.startTime) return (a.startTime ?? 0) - (b.startTime ?? 0);
  const gu = String(a.gameUuid).localeCompare(String(b.gameUuid), "ja");
  if (gu !== 0) return gu;
  return String(a.nickname).localeCompare(String(b.nickname), "ja");
}

/**
 * competition ranking 付与（1,2,2,4...）
 * 同点判定は points のみ（席順は並び順に効く）
 */
function attachCompetitionRankByPoints(sortedRows) {
  let lastPoints = null;
  let lastRank = 0;

  return sortedRows.map((r, idx) => {
    const p = safeNum(r.points);
    if (idx === 0) {
      lastRank = 1;
      lastPoints = p;
    } else if (p !== lastPoints) {
      lastRank = idx + 1;
      lastPoints = p;
    }
    return { ...r, rank: lastRank };
  });
}

/**
 * 指定groupIdの対局（予選）を探す
 * 予選が「各グループ1卓のみ」前提なので、最初に見つかった1件を採用
 */
async function findQualifierGameByGroupId(mongo, groupId) {
  const docs = await mongo.colDerived
    .find(
      {},
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
    .sort({ startTime: 1 })
    .toArray();

  const gid = String(groupId ?? "").trim();
  for (const d of docs) {
    const meta = resolveGameMeta(d.uuid);
    if (meta.phase !== "qualifier") continue;
    if (!meta.groupId) continue;
    if (String(meta.groupId) === gid) {
      return { doc: d, meta };
    }
  }
  return null;
}

function mountTournamentRoutes(app, { mongo }) {
  /**
   * 予選グループ一覧
   * GET /api/tournament/qualifier/groups
   */
  app.get("/api/tournament/qualifier/groups", async (_req, res) => {
    const docs = await mongo.colDerived
      .find({}, { projection: { _id: 0, uuid: 1 } })
      .toArray();

    const set = new Set();
    for (const d of docs) {
      const meta = resolveGameMeta(d.uuid);
      if (meta.phase !== "qualifier") continue;
      if (!meta.groupId) continue;
      set.add(String(meta.groupId));
    }

    const groups = [...set]
      .sort((a, b) => String(a).localeCompare(String(b), "ja"))
      .map((groupId) => ({ groupId, label: defaultGroupLabel(groupId) }));

    res.json({ groups });
  });

  /**
   * 予選グループ standings
   * GET /api/tournament/qualifier/groups/:groupId/standings
   *
   * フロント期待形（あなたの page.tsx に合わせる）：
   * {
   *   groupId,
   *   tables: [{ tableLabel, title, startTime, gameUuid }],
   *   standings: [{ playerId, displayName, image, games, tournamentPoints, place, isWinner, qualified }]
   * }
   */
  app.get("/api/tournament/qualifier/groups/:groupId/standings", async (req, res) => {
    const groupId = String(req.params.groupId ?? "").trim();
    const found = await findQualifierGameByGroupId(mongo, groupId);
    if (!found) return res.status(404).json({ error: "not found" });

    const { doc, meta } = found;

    const scores = normalizeScores(doc.finalScores);
    const placeBySeat = placementByScores(scores);
    const winSeat = winnerSeatByScores(scores);

    const players = Array.isArray(doc.players) ? doc.players : [];
    const pBySeat = new Map();
    for (const p of players) {
      if (typeof p?.seat === "number") pBySeat.set(p.seat, p);
    }

    const standings = [];
    for (let seat = 0; seat < 4; seat++) {
      const nick = String(pBySeat.get(seat)?.nickname ?? "").trim();
      const r = resolvePlayerByNickname(nick);

      const tournamentPoints = safeNum(scores[seat]); // 予選は素点そのまま

      standings.push({
        seat,
        playerId: r.playerId ?? null,
        displayName: r.displayName ?? nick,
        image: r.image ?? null,
        games: 1,
        tournamentPoints,
        place: placeBySeat[seat],
        isWinner: seat === winSeat,
        qualified: seat === winSeat, // 予選は1回なので1位は確定通過
      });
    }

    // 表示順：place asc（同順位なら seat asc）
    standings.sort((a, b) => (a.place - b.place) || (a.seat - b.seat));

    res.json({
      groupId,
      tables: [
        {
          gameUuid: doc.uuid,
          startTime: doc.startTime ?? null,
          tableLabel: meta.tableLabel ?? null,
          title: meta.title ?? null,
        },
      ],
      standings: standings.map((x) => ({
        playerId: x.playerId,
        displayName: x.displayName,
        image: x.image,
        games: x.games,
        tournamentPoints: x.tournamentPoints,
        place: x.place,
        isWinner: x.isWinner,
        qualified: x.qualified,
      })),
    });
  });

  /**
   * 予選グループ1位一覧（通過確定）
   * GET /api/tournament/qualifier/winners
   */
  app.get("/api/tournament/qualifier/winners", async (_req, res) => {
    const docs = await mongo.colDerived
      .find(
        {},
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
      .sort({ startTime: 1 })
      .toArray();

    const items = [];
    for (const d of docs) {
      const m = resolveGameMeta(d.uuid);
      if (m.phase !== "qualifier") continue;
      const it = buildWinnerItem(d);
      if (it) items.push(it);
    }

    items.sort((a, b) => String(a.groupId).localeCompare(String(b.groupId), "ja"));
    res.json({ phase: "qualifier", winners: items });
  });

  /**
   * ワイルドカード順位（卓1位除外済み）
   * GET /api/tournament/qualifier/wildcards
   */
  app.get("/api/tournament/qualifier/wildcards", async (_req, res) => {
    const docs = await mongo.colDerived
      .find(
        {},
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
      .sort({ startTime: 1 })
      .toArray();

    const candidates = [];

    for (const d of docs) {
      const meta = resolveGameMeta(d.uuid);
      if (meta.phase !== "qualifier") continue;
      if (!meta.groupId) continue;

      const scores = normalizeScores(d.finalScores);
      const winSeat = winnerSeatByScores(scores);

      const players = Array.isArray(d.players) ? d.players : [];
      const pBySeat = new Map();
      for (const p of players) {
        if (typeof p?.seat === "number") pBySeat.set(p.seat, p);
      }

      for (let seat = 0; seat < 4; seat++) {
        if (seat === winSeat) continue;

        const nick = String(pBySeat.get(seat)?.nickname ?? "").trim();
        if (!nick) continue;

        const r = resolvePlayerByNickname(nick);

        candidates.push({
          groupId: meta.groupId,
          gameUuid: d.uuid,
          startTime: d.startTime ?? null,
          tableLabel: meta.tableLabel,
          title: meta.title,
          seat,
          nickname: nick,
          playerId: r.playerId ?? null,
          displayName: r.displayName ?? nick,
          image: r.image ?? null,
          points: safeNum(scores[seat]),
          delta: deltaBySeat(d.derived, seat),
        });
      }
    }

    candidates.sort(sortWildcardCandidates);
    const ranked = attachCompetitionRankByPoints(candidates);

    const cutRank = 4;
    const cutRow = ranked.find((x) => x.rank === cutRank) || null;

    res.json({
      cutRank,
      cutPoints: cutRow ? safeNum(cutRow.points) : null,
      candidates: ranked.map((x) => ({
        rank: x.rank,
        playerId: x.playerId,
        displayName: x.displayName,
        image: x.image,
        points: safeNum(x.points),
        groupId: x.groupId,
        gameUuid: x.gameUuid,
        startTime: x.startTime,
        tableLabel: x.tableLabel ?? null,
        title: x.title ?? null,
        seat: x.seat,
        nickname: x.nickname,
        delta: safeNum(x.delta),
      })),
    });
  });
}

module.exports = { mountTournamentRoutes };

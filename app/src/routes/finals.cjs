// app/src/routes/finals.cjs
const {
  getOverlay,
  resolvePlayerByNickname,
  resolveTableByUuid,
  applyGameOverride,
  applyPlayerOverride
} = require("../mappings/overlay.cjs");
const { getPlayerProfile } = require("../mappings/store.cjs");

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

// 同点は seat が小さい方が上（予選と同じ扱い）
// ※決勝で別ルールにしたくなったら finals.yaml に tieRule を足して分岐できます
function placementByScores(scores) {
  const s = normalizeScores(scores);
  const rows = [];
  for (let seat = 0; seat < 4; seat++) rows.push({ seat, score: s[seat] });
  rows.sort((a, b) => (b.score - a.score) || (a.seat - b.seat));

  const placeBySeat = Array(4).fill(null);
  let place = 1;
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && rows[i].score !== rows[i - 1].score) place = i + 1;
    placeBySeat[rows[i].seat] = place;
  }
  return placeBySeat;
}

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

function deltaBySeat(derived, seat) {
  const arr = derived?.playerStats;
  if (!Array.isArray(arr)) return 0;
  const st = arr.find((x) => typeof x?.seat === "number" && x.seat === seat);
  return safeNum(st?.deltaTotal);
}

function resolveGameMeta(uuid) {
  const table = resolveTableByUuid(uuid);
  const base = { uuid, table };
  const merged = applyGameOverride(uuid, base);

  const tableLabel = merged?.tableLabel ?? merged?.table?.label ?? null;
  const title =
    merged?.title ??
    merged?.table?.title ??
    merged?.table?.label ??
    (tableLabel || uuid);

  return {
    tableLabel,
    title,
    table: merged?.table ?? table,
    phase: merged?.phase ?? merged?.table?.phase ?? merged?.tournament?.phase ?? null,
  };
}

function seatNicknameFromDoc(doc, seat) {
  const players = Array.isArray(doc?.players) ? doc.players : [];
  const p = players.find((x) => typeof x?.seat === "number" && x.seat === seat);
  const nick = String(p?.nickname ?? "").trim();
  return nick || null;
}

function normalizeSeatDisplay(seatSpec, doc) {
  const seat = Number(seatSpec?.seat);
  const source = seatSpec?.source ? String(seatSpec.source) : null;

  // playerId 直指定
  if (seatSpec?.playerId) {
    const pid = String(seatSpec.playerId);
    const profile = getPlayerProfile(pid);
    const base = profile
      ? { playerId: profile.playerId, displayName: profile.displayName, image: profile.image, tags: profile.tags }
      : { playerId: pid, displayName: null, image: null, tags: null };
    const merged = applyPlayerOverride(pid, base);
    return { seat, ...merged, source };
  }

  // nickname 指定、もしくは doc から拾う
  const nick = seatSpec?.nickname
    ? String(seatSpec.nickname)
    : seatNicknameFromDoc(doc, seat);

  if (nick) {
    const r = resolvePlayerByNickname(nick);
    return {
      seat,
      nickname: nick,
      playerId: r.playerId ?? null,
      displayName: r.displayName ?? nick,
      image: r.image ?? null,
      source,
    };
  }

  // 未確定枠
  return { seat, playerId: null, nickname: null, displayName: null, image: null, source };
}

async function findDerivedByUuid(mongo, uuid) {
  if (!uuid) return null;
  return mongo.colDerived.findOne(
    { uuid },
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
  );
}

function statusOf(doc) {
  if (!doc) return "unplayed";
  if (doc.endTime) return "finished";
  return "live";
}

function buildResult(doc) {
  if (!doc) return null;
  const finalScores = normalizeScores(doc.finalScores);
  const placeBySeat = placementByScores(finalScores);
  const winnerSeat = winnerSeatByScores(finalScores);
  return {
    finalScores,
    placeBySeat,
    winnerSeat,
    deltaBySeat: [0, 1, 2, 3].map((s) => deltaBySeat(doc.derived, s)),
  };
}

/**
 * gameUuids（複数）/ gameUuid（単発）を「埋まっているUUID配列」に正規化
 * - null/"" は除外
 */
function normalizeUuids(m) {
  const arr = Array.isArray(m.gameUuids)
    ? m.gameUuids
    : (m.gameUuid ? [m.gameUuid] : []);
  return arr.map((x) => (x ? String(x).trim() : "")).filter(Boolean);
}

function sumScores(listOfScores) {
  const out = [0, 0, 0, 0];
  for (const s of listOfScores) {
    const ns = normalizeScores(s);
    for (let i = 0; i < 4; i++) out[i] += ns[i];
  }
  return out;
}

function tieTopSeats(totalScores) {
  const s = normalizeScores(totalScores);
  const max = Math.max(...s);
  const seats = [];
  for (let i = 0; i < 4; i++) if (s[i] === max) seats.push(i);
  return seats;
}

function buildAggregateResult(gameResults, requiredGames) {
  // finished のみ合算（requiredGames未達なら暫定）
  const finished = gameResults.filter((g) => g.status === "finished" && g.result?.finalScores);
  const finishedGames = finished.length;
  if (finishedGames === 0) return null;

  const totalScores = sumScores(finished.map((g) => g.result.finalScores));
  const placeBySeat = placementByScores(totalScores);

  const tied = tieTopSeats(totalScores);
  const isTieTop = tied.length >= 2;

  const winnerSeat = isTieTop ? null : winnerSeatByScores(totalScores);

  return {
    totalScores,
    placeBySeat,
    winnerSeat,
    finishedGames,
    requiredGames,
    isTieTop,
    tieTopSeats: isTieTop ? tied : [],
  };
}

/**
 * matchSpec（yamlの1match定義）からAPI出力用のmatchを組み立てる（共通）
 * - 単発: gameUuid
 * - 複数: gameUuids / games[] / aggregateResult
 */
async function buildMatchOut(mongo, matchSpec) {
  const seatSpecs = Array.isArray(matchSpec.seats) ? matchSpec.seats : [];
  const uuidList = normalizeUuids(matchSpec);

  // requiredGames: 未指定なら 1（単発戦前提）、ただし複数指定があるなら 2 をデフォルトに寄せる
  const requiredGames =
    Number.isFinite(Number(matchSpec.requiredGames))
      ? Number(matchSpec.requiredGames)
      : (Array.isArray(matchSpec.gameUuids) ? 2 : 1);

  // games[]（埋まってるUUID分だけ作る）
  const games = [];
  for (let i = 0; i < uuidList.length; i++) {
    const uuid = uuidList[i];
    const doc = await findDerivedByUuid(mongo, uuid);
    const meta = resolveGameMeta(uuid);
    games.push({
      gameUuid: uuid,
      status: statusOf(doc),
      startTime: doc?.startTime ?? null,
      endTime: doc?.endTime ?? null,
      title: meta.title ?? null,
      tableLabel: meta.tableLabel ?? null,
      result: buildResult(doc),
    });
  }

  // seats は「最新のdoc」から拾えると嬉しいので、最後に終わったgameを優先してdocを選ぶ
  let seatDoc = null;
  if (games.length > 0) {
    // finished を優先して、その中で startTime が大きいもの（=新しい）を選ぶ
    const cand = games
      .map((g) => ({ g, t: g.startTime ?? 0, fin: g.status === "finished" ? 1 : 0 }))
      .sort((a, b) => (b.fin - a.fin) || (b.t - a.t));
    const bestUuid = cand[0]?.g?.gameUuid ?? null;
    seatDoc = bestUuid ? await findDerivedByUuid(mongo, bestUuid) : null;
  } else {
    // 後方互換（単発）: uuidが空でも seatDoc は null のまま
    seatDoc = null;
  }

  const seats = seatSpecs
    .slice()
    .sort((a, b) => Number(a.seat) - Number(b.seat))
    .map((s) => normalizeSeatDisplay(s, seatDoc));

  // aggregateResult（複数戦 or requiredGames>1 のときだけ作る）
  // const aggregateResult =
  //   (requiredGames >= 2 || Array.isArray(matchSpec.gameUuids))
  //     ? buildAggregateResult(games, requiredGames)
  //     : null;
  const isMulti = requiredGames >= 2 || Array.isArray(matchSpec.gameUuids);
  let aggregateResult = null;
  if (isMulti) {
    const allHavePlayerId = seatSpecs.every((s) => !!s?.playerId);
    if (allHavePlayerId) {
      aggregateResult = await buildAggregateResultByPlayer(mongo, games, matchSpec, requiredGames);
    } else {
      aggregateResult = buildAggregateResult(games, requiredGames); // 従来（seat合算）
    }
  }

  // status: live があれば live
  let status = "unplayed";
  if (games.some((g) => g.status === "live")) {
    status = "live";
  } else if (aggregateResult) {
    if (aggregateResult.finishedGames >= requiredGames && aggregateResult.isTieTop) {
      status = "tiebreak";
    } else if (aggregateResult.winnerSlot !== null && aggregateResult.finishedGames >= requiredGames) {
      status = "finished";
    } else if (aggregateResult.finishedGames > 0) {
      status = "scheduled";
    } else {
      status = "unplayed";
    }
  } else if (games.length === 1) {
    // 単発戦
    status = games[0].status;
  } else {
    // UUID未設定
    status = "unplayed";
  }

  // start/end は複数戦なら範囲で返す（最小/最大）
  const startTime = games.length ? Math.min(...games.map((g) => g.startTime ?? Infinity).filter(Number.isFinite)) : null;
  const endTime = games.length ? Math.max(...games.map((g) => g.endTime ?? -Infinity).filter(Number.isFinite)) : null;

  // title/tableLabel は、単発はゲーム由来、複数はmatchSpec優先
  const baseMeta =
    (matchSpec.gameUuid ? resolveGameMeta(matchSpec.gameUuid) : null) ||
    (uuidList[0] ? resolveGameMeta(uuidList[0]) : null) ||
    { tableLabel: null, title: null };

  const tableLabel = matchSpec.tableLabel ?? baseMeta.tableLabel ?? null;
  const title = (matchSpec.label ?? baseMeta.title ?? matchSpec.matchId);

  return {
    matchId: matchSpec.matchId,
    label: matchSpec.label ?? null,
    tableLabel,
    title,
    // 後方互換
    gameUuid: matchSpec.gameUuid ?? (uuidList.length === 1 ? uuidList[0] : null),
    // 新: 複数戦
    gameUuids: Array.isArray(matchSpec.gameUuids) ? matchSpec.gameUuids : (uuidList.length ? uuidList : null),
    requiredGames,
    games,
    aggregateResult,
    status,
    startTime: Number.isFinite(startTime) ? startTime : null,
    endTime: Number.isFinite(endTime) ? endTime : null,
    seats,
    // 単発戦の result は従来互換のため残す（複数戦では null）
    result: (uuidList.length === 1 ? games[0]?.result ?? null : null),
    advance: Array.isArray(matchSpec.advance) ? matchSpec.advance : [],
  };
}

function seatToPlayerIdMapFromDoc(doc) {
  // seat(0..3) -> playerId
  const map = new Map();
  const players = Array.isArray(doc?.players) ? doc.players : [];
  for (const p of players) {
    const seat = Number(p?.seat);
    if (!Number.isFinite(seat)) continue;
    const nick = String(p?.nickname ?? "").trim();
    if (!nick) continue;
    const r = resolvePlayerByNickname(nick); // nickname -> playerId
    if (r?.playerId) map.set(seat, r.playerId);
  }
  return map;
}

async function buildAggregateResultByPlayer(mongo, games, matchSpec, requiredGames) {
  const seatSpecs = Array.isArray(matchSpec.seats) ? matchSpec.seats : [];

  // slot(=0..3) -> playerId（決勝は playerId 直指定前提）
  const playerIdBySlot = seatSpecs
    .slice()
    .sort((a, b) => Number(a.seat) - Number(b.seat))
    .map((s) => (s.playerId ? String(s.playerId) : null));

  // playerId -> slot
  const slotByPlayerId = new Map();
  for (let slot = 0; slot < playerIdBySlot.length; slot++) {
    const pid = playerIdBySlot[slot];
    if (pid) slotByPlayerId.set(pid, slot);
  }

  const finished = games.filter((g) => g.status === "finished" && g.result?.finalScores && g.gameUuid);
  const finishedGames = finished.length;
  if (finishedGames === 0) return null;

  const totalScoresBySlot = [0, 0, 0, 0];

  for (const g of finished) {
    const doc = await findDerivedByUuid(mongo, g.gameUuid);
    const seatToPid = seatToPlayerIdMapFromDoc(doc);

    const scores = normalizeScores(g.result.finalScores);

    for (let seat = 0; seat < 4; seat++) {
      const pid = seatToPid.get(seat);
      const slot = pid ? slotByPlayerId.get(pid) : undefined;
      if (typeof slot === "number") {
        totalScoresBySlot[slot] += scores[seat];
      }
    }
  }

  const tied = tieTopSeats(totalScoresBySlot);
  const isTieTop = tied.length >= 2;
  const winnerSlot = isTieTop ? null : winnerSeatByScores(totalScoresBySlot); // 0..3

  return {
    totalScoresBySlot,
    winnerSlot,
    finishedGames,
    requiredGames,
    isTieTop,
    tieTopSlots: isTieTop ? tied : [],
  };
}

function mountFinalsRoutes(app, { mongo }) {
  // GET /api/tournament/finals/bracket
  app.get("/api/tournament/finals/bracket", async (_req, res) => {
    const finals = getOverlay()?.finals;
    if (!finals) return res.status(404).json({ error: "finals.yaml not loaded" });

    const rounds = Array.isArray(finals.rounds) ? finals.rounds : [];
    const outRounds = [];

    for (const r of rounds) {
      const matches = Array.isArray(r.matches) ? r.matches : [];
      const outMatches = [];

      for (const m of matches) {
        const out = await buildMatchOut(mongo, m);
        outMatches.push(out);
      }

      outRounds.push({
        roundId: r.roundId ?? null,
        label: r.label ?? null,
        matches: outMatches,
      });
    }

    res.json({
      phase: "finals",
      updatedAt: finals.updatedAt ?? null,
      rounds: outRounds,
    });
  });

  // GET /api/tournament/finals/matches
  app.get("/api/tournament/finals/matches", async (_req, res) => {
    const finals = getOverlay()?.finals;
    if (!finals) return res.status(404).json({ error: "finals.yaml not loaded" });

    const rounds = Array.isArray(finals.rounds) ? finals.rounds : [];
    const items = [];

    for (const r of rounds) {
      for (const m of Array.isArray(r.matches) ? r.matches : []) {
        const out = await buildMatchOut(mongo, m);
        items.push({
          roundId: r.roundId ?? null,
          roundLabel: r.label ?? null,
          matchId: out.matchId,
          label: out.label ?? null,
          tableLabel: out.tableLabel ?? null,
          // 一覧は代表UUIDを持たせる（単発互換）
          gameUuid: out.gameUuid ?? null,
          status: out.status,
          startTime: out.startTime ?? null,
          endTime: out.endTime ?? null,
          // 将来のUI用（必要なら）
          requiredGames: out.requiredGames ?? null,
          finishedGames: out.aggregateResult?.finishedGames ?? (out.status === "finished" ? 1 : 0),
          isTieTop: out.aggregateResult?.isTieTop ?? false,
        });
      }
    }

    // 並び順: live → tiebreak → scheduled(途中) → unplayed → finished
    const order = { live: 0, tiebreak: 1, scheduled: 2, unplayed: 3, finished: 4 };
    items.sort((a, b) => {
      const da = order[a.status] ?? 9;
      const db = order[b.status] ?? 9;
      if (da !== db) return da - db;
      const ta = a.startTime ?? 0;
      const tb = b.startTime ?? 0;
      if (ta !== tb) return ta - tb;
      return String(a.matchId).localeCompare(String(b.matchId), "ja");
    });

    res.json({ phase: "finals", matches: items });
  });

  // GET /api/tournament/finals/matches/:matchId
  app.get("/api/tournament/finals/matches/:matchId", async (req, res) => {
    const finals = getOverlay()?.finals;
    if (!finals) return res.status(404).json({ error: "finals.yaml not loaded" });

    const matchId = String(req.params.matchId ?? "").trim();
    if (!matchId) return res.status(400).json({ error: "matchId required" });

    const rounds = Array.isArray(finals.rounds) ? finals.rounds : [];
    let round = null;
    let matchSpec = null;

    for (const r of rounds) {
      const ms = Array.isArray(r.matches) ? r.matches : [];
      const hit = ms.find((x) => String(x.matchId) === matchId);
      if (hit) {
        round = r;
        matchSpec = hit;
        break;
      }
    }
    if (!matchSpec) return res.status(404).json({ error: "match not found" });

    const out = await buildMatchOut(mongo, matchSpec);

    res.json({
      phase: "finals",
      updatedAt: finals.updatedAt ?? null,
      round: { roundId: round?.roundId ?? null, label: round?.label ?? null },
      match: out,
    });
  });
}

module.exports = { mountFinalsRoutes };

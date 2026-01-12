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
    // return { seat, playerId: pid, nickname: null, displayName: null, image: null, source };
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
        const uuid = m.gameUuid || null;
        const doc = await findDerivedByUuid(mongo, uuid);
        const meta = uuid
          ? resolveGameMeta(uuid)
          : { tableLabel: m.tableLabel ?? null, title: m.label ?? null };

        const seatSpecs = Array.isArray(m.seats) ? m.seats : [];
        const seats = seatSpecs
          .slice()
          .sort((a, b) => Number(a.seat) - Number(b.seat))
          .map((s) => normalizeSeatDisplay(s, doc));

        outMatches.push({
          matchId: m.matchId,
          label: m.label ?? null,
          tableLabel: m.tableLabel ?? meta.tableLabel ?? null,
          title: meta.title ?? m.label ?? m.matchId,
          gameUuid: uuid,
          status: statusOf(doc),
          startTime: doc?.startTime ?? null,
          endTime: doc?.endTime ?? null,
          seats,
          result: buildResult(doc),
          advance: Array.isArray(m.advance) ? m.advance : [],
        });
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
        const uuid = m.gameUuid || null;
        const doc = await findDerivedByUuid(mongo, uuid);
        items.push({
          roundId: r.roundId ?? null,
          roundLabel: r.label ?? null,
          matchId: m.matchId,
          label: m.label ?? null,
          tableLabel: m.tableLabel ?? null,
          gameUuid: uuid,
          status: statusOf(doc),
          startTime: doc?.startTime ?? null,
          endTime: doc?.endTime ?? null,
        });
      }
    }

    const order = { live: 0, unplayed: 1, finished: 2 };
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
    let match = null;

    for (const r of rounds) {
      const ms = Array.isArray(r.matches) ? r.matches : [];
      const hit = ms.find((x) => String(x.matchId) === matchId);
      if (hit) {
        round = r;
        match = hit;
        break;
      }
    }
    if (!match) return res.status(404).json({ error: "match not found" });

    const uuid = match.gameUuid || null;
    const doc = await findDerivedByUuid(mongo, uuid);
    const meta = uuid
      ? resolveGameMeta(uuid)
      : { tableLabel: match.tableLabel ?? null, title: match.label ?? null };

    const seats = (Array.isArray(match.seats) ? match.seats : [])
      .slice()
      .sort((a, b) => Number(a.seat) - Number(b.seat))
      .map((s) => normalizeSeatDisplay(s, doc));

    res.json({
      phase: "finals",
      updatedAt: finals.updatedAt ?? null,
      round: { roundId: round?.roundId ?? null, label: round?.label ?? null },
      match: {
        matchId: match.matchId,
        label: match.label ?? null,
        tableLabel: match.tableLabel ?? meta.tableLabel ?? null,
        title: meta.title ?? match.label ?? match.matchId,
        gameUuid: uuid,
        status: statusOf(doc),
        startTime: doc?.startTime ?? null,
        endTime: doc?.endTime ?? null,
        seats,
        result: buildResult(doc),
        advance: Array.isArray(match.advance) ? match.advance : [],
      },
    });
  });
}

module.exports = { mountFinalsRoutes };

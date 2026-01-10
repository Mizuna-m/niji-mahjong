// app/src/routes/tournament.cjs
// Tournament rule-aware APIs (qualifier KPI / standings / wildcards / finals bracket)
//
// Rules (as per request):
// - Qualifier: 4 players per group, Tonpuu 1 game per group
// - Qualifier winner: place=1 per group (tie-break by seat order)
// - Wildcards: exclude group winners, then rank by raw final score (finalScores) desc
// - Tie-break: seat asc (smaller seat wins ties)
// - Start score: 30000 (informational; ranking uses raw final score as-is)

const {
  applyGameOverride,
  resolvePlayerByNickname,
  resolveTableByUuid,
} = require("../mappings/overlay.cjs");

const QUALIFIER_GROUPS = Number(process.env.QUALIFIER_GROUPS || "24");
const QUALIFIER_WILDCARDS = Number(process.env.QUALIFIER_WILDCARDS || "4");

function clampInt(n, lo, hi) {
  const x = Number(n);
  if (!Number.isFinite(x)) return lo;
  return Math.max(lo, Math.min(hi, Math.trunc(x)));
}

function normalizeScores(scores) {
  if (!Array.isArray(scores)) return [0, 0, 0, 0];
  const a = scores.slice(0, 4).map((v) => Number(v) || 0);
  while (a.length < 4) a.push(0);
  return a;
}

/**
 * Place calculation with tie-break by seat order.
 * - sort by score desc, seat asc
 * - assign unique places 1..4 (no shared rank even if tied)
 */
function placeBySeatWithSeatTiebreak(finalScores) {
  const scores = normalizeScores(finalScores);
  const arr = scores.map((score, seat) => ({ seat, score }));

  arr.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score; // score desc
    return a.seat - b.seat; // seat asc (tie-break)
  });

  const placeBySeat = Array(4).fill(null);
  for (let i = 0; i < arr.length; i++) {
    placeBySeat[arr[i].seat] = i + 1;
  }
  return placeBySeat;
}

function winnerSeat(finalScores) {
  const placeBySeat = placeBySeatWithSeatTiebreak(finalScores);
  for (let s = 0; s < 4; s++) if (placeBySeat[s] === 1) return s;
  return null;
}

/**
 * Tournament points for qualifier/wildcards:
 * - raw final score (素点) as-is
 */
function calcTournamentPointsRaw(finalScore) {
  return Number(finalScore) || 0;
}

function safeStr(x) {
  return typeof x === "string" ? x : x == null ? "" : String(x);
}

function makeGroupLabel(groupId) {
  // You can tweak here if you prefer "予選A卓" etc.
  const g = safeStr(groupId);
  return g ? `予選${g}グループ` : "予選グループ";
}

/**
 * Enrich a games_derived doc using overlay (players/tables/game overrides)
 * - returns a plain object (not mutating original doc)
 */
function enrichGameFromDoc(doc) {
  const uuid = doc?.uuid || doc?._id;
  const startTime = doc?.startTime ?? null;
  const endTime = doc?.endTime ?? null;

  const playersBase = Array.isArray(doc?.players) ? doc.players : [];
  const players = playersBase.map((p) => {
    const seat = typeof p?.seat === "number" ? p.seat : null;
    const nickname = safeStr(p?.nickname);
    const ov = resolvePlayerByNickname(nickname);
    return {
      seat,
      nickname,
      playerId: ov?.playerId ?? null,
      displayName: ov?.displayName ?? nickname,
      image: ov?.image ?? null,
      tags: ov?.tags ?? null,
    };
  });

  // tables.yaml is by uuid (game uuid)
  const table = resolveTableByUuid(uuid); // {uuid,label,note} or null

  // base game object
  const base = {
    uuid,
    startTime,
    endTime,
    players,
    finalScores: normalizeScores(doc?.finalScores),
    table: table
      ? {
          uuid: table.uuid ?? uuid,
          label: table.label ?? null,
          note: table.note ?? null,
          title: null, // may be filled by overrides
        }
      : null,
    tableLabel: table?.label ?? null,
    title: table?.label ?? uuid,
    phase: null,
    groupId: null,
    matchId: null,
  };

  // apply overrides.yaml games[uuid]
  const withOv = applyGameOverride(uuid, base);

  // normalize common presentation helpers
  const tableLabel = withOv?.tableLabel ?? withOv?.table?.label ?? base.tableLabel ?? null;
  const title = withOv?.title ?? withOv?.table?.title ?? withOv?.table?.label ?? base.title ?? uuid;

  // also keep table.title if present
  const table2 = withOv.table
    ? { ...withOv.table, title: withOv.table.title ?? (withOv.title ?? null) }
    : withOv.table;

  return {
    ...withOv,
    table: table2,
    tableLabel,
    title,
  };
}

/**
 * Load all games (small scale assumed).
 * Note: phase/groupId/matchId come from overlay overrides, so we must scan.
 */
async function loadAllGamesEnriched(mongo) {
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
        },
      }
    )
    .sort({ startTime: 1 })
    .toArray();

  return docs.map(enrichGameFromDoc);
}

function pickQualifierGameByGroup(games) {
  // For each groupId, choose the latest by startTime (safety)
  const byGroup = new Map();
  for (const g of games) {
    if (g?.phase !== "qualifier") continue;
    const groupId = safeStr(g?.groupId).trim();
    if (!groupId) continue;

    const prev = byGroup.get(groupId);
    if (!prev) {
      byGroup.set(groupId, g);
      continue;
    }
    const tPrev = Number(prev.startTime) || 0;
    const tThis = Number(g.startTime) || 0;
    if (tThis >= tPrev) byGroup.set(groupId, g);
  }
  return byGroup;
}

function buildQualifierStandingsForGame(game) {
  const scores = normalizeScores(game?.finalScores);
  const placeBySeat = placeBySeatWithSeatTiebreak(scores);
  const wSeat = winnerSeat(scores);

  const standings = (game.players || [])
    .slice()
    .sort((a, b) => (a.seat ?? 99) - (b.seat ?? 99))
    .map((p) => {
      const seat = p.seat;
      const raw = typeof seat === "number" ? scores[seat] : 0;
      const points = calcTournamentPointsRaw(raw);
      const place = typeof seat === "number" ? placeBySeat[seat] : null;

      const isWinner = typeof seat === "number" ? seat === wSeat : false;

      return {
        playerId: p.playerId ?? null,
        displayName: p.displayName ?? p.nickname ?? "",
        image: p.image ?? null,
        games: 1,
        tournamentPoints: points, // raw final score as-is
        place,
        isWinner,
        qualified: isWinner ? true : null,
      };
    });

  // sort by place asc just in case
  standings.sort((a, b) => (a.place ?? 99) - (b.place ?? 99));
  return standings;
}

function buildWildcardCandidatesFromQualifierGames(byGroupGame) {
  const out = [];

  for (const [groupId, game] of byGroupGame.entries()) {
    const scores = normalizeScores(game?.finalScores);
    const wSeat = winnerSeat(scores);

    for (const p of game.players || []) {
      const seat = p.seat;
      if (typeof seat !== "number") continue;
      if (seat === wSeat) continue; // exclude group winner

      const points = calcTournamentPointsRaw(scores[seat]);

      out.push({
        // rank filled later
        playerId: p.playerId ?? null,
        displayName: p.displayName ?? p.nickname ?? "",
        image: p.image ?? null,
        points,
        groupId,
        gameUuid: game.uuid,
        seat,
        startTime: game.startTime ?? null,
      });
    }
  }

  // sort by points desc, tie by seat asc (rule), then startTime asc for stability
  out.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (a.seat !== b.seat) return a.seat - b.seat;
    return (Number(a.startTime) || 0) - (Number(b.startTime) || 0);
  });

  // assign rank 1..N (no ties)
  for (let i = 0; i < out.length; i++) out[i].rank = i + 1;

  // remove internal fields not in API
  return out.map(({ seat, startTime, ...rest }) => rest);
}

function roundNameFromPhase(phase) {
  // tweak as you like; also you can override on the game itself via overrides.yaml if desired
  switch (phase) {
    case "finals_r1":
      return "決勝T1回戦";
    case "finals_sf":
      return "準決勝";
    case "finals_f":
      return "決勝";
    default:
      return "決勝トーナメント";
  }
}

function buildFinalsBracket(games) {
  const finals = games.filter((g) => typeof g?.phase === "string" && g.phase.startsWith("finals"));
  // group by phase -> rounds
  const byPhase = new Map();
  for (const g of finals) {
    const ph = g.phase;
    if (!byPhase.has(ph)) byPhase.set(ph, []);
    byPhase.get(ph).push(g);
  }

  // stable round ordering
  const phaseOrder = ["finals_r1", "finals_sf", "finals_f"];
  const phases = [...byPhase.keys()].sort((a, b) => {
    const ia = phaseOrder.indexOf(a);
    const ib = phaseOrder.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });

  const rounds = phases.map((ph) => {
    const gs = byPhase.get(ph) || [];
    // sort by matchId then startTime
    gs.sort((a, b) => {
      const ma = safeStr(a.matchId);
      const mb = safeStr(b.matchId);
      if (ma && mb && ma !== mb) return ma.localeCompare(mb);
      return (Number(a.startTime) || 0) - (Number(b.startTime) || 0);
    });

    const matches = gs.map((g) => ({
      matchId: g.matchId ?? null,
      tableLabel: g.tableLabel ?? null,
      title: g.title ?? null,
      gameUuid: g.uuid,
      startTime: g.startTime ?? null,
      players: g.players || [],
      result: g.finalScores
        ? { finalScores: normalizeScores(g.finalScores) }
        : null,
    }));

    return {
      name: roundNameFromPhase(ph),
      matches,
    };
  });

  return { rounds };
}

function mountTournamentRoutes(app, { mongo }) {
  // A) meta
  app.get("/api/tournament/meta", async (_req, res) => {
    res.json({
      season: process.env.TOURNAMENT_SEASON || "2025",
      qualifier: {
        groups: QUALIFIER_GROUPS,
        wildcards: QUALIFIER_WILDCARDS,
        mode: "tonpuu",
        umaoka: false,
        startScore: 30000,
        gamesPerPlayer: 1,
        wildcardRanking: {
          basis: "raw_final_score",
          tieBreak: "seat_order",
        },
      },
      finals: [
        { name: "決勝T1回戦", players: 32, mode: "tonpuu", advance: 16 },
        { name: "準決勝", players: 16, mode: "hanchan", advance: 4 },
        { name: "決勝", players: 4, mode: "hanchan", games: 2 },
      ],
    });
  });

  // B) KPI
  app.get("/api/tournament/kpi", async (req, res) => {
    const phase = safeStr(req.query.phase || "qualifier");

    const games = await loadAllGamesEnriched(mongo);

    if (phase === "finals") {
      const finalsPlayed = games.filter((g) => typeof g?.phase === "string" && g.phase.startsWith("finals")).length;
      return res.json({
        phase: "finals",
        gamesPlayed: finalsPlayed,
      });
    }

    // qualifier KPI
    const byGroupGame = pickQualifierGameByGroup(games);
    const gamesPlayed = byGroupGame.size;

    const candidates = buildWildcardCandidatesFromQualifierGames(byGroupGame);
    const cut = candidates.length >= QUALIFIER_WILDCARDS ? candidates[QUALIFIER_WILDCARDS - 1] : null;

    res.json({
      phase: "qualifier",
      gamesTotal: QUALIFIER_GROUPS,
      gamesPlayed,
      groupWinnersConfirmed: gamesPlayed,
      wildcardSlots: QUALIFIER_WILDCARDS,
      wildcardCut: cut
        ? {
            rank: QUALIFIER_WILDCARDS,
            points: cut.points,
            playerId: cut.playerId ?? null,
            displayName: cut.displayName,
          }
        : null,
    });
  });

  // C) list groups
  app.get("/api/tournament/qualifier/groups", async (_req, res) => {
    const games = await loadAllGamesEnriched(mongo);
    const byGroupGame = pickQualifierGameByGroup(games);

    const groups = [...byGroupGame.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((groupId) => ({ groupId, label: makeGroupLabel(groupId) }));

    res.json({ groups });
  });

  // C2) group standings
  app.get("/api/tournament/qualifier/groups/:groupId/standings", async (req, res) => {
    const groupId = safeStr(req.params.groupId).trim();
    if (!groupId) return res.status(404).json({ error: "not found" });

    const games = await loadAllGamesEnriched(mongo);
    const byGroupGame = pickQualifierGameByGroup(games);
    const game = byGroupGame.get(groupId);

    if (!game) return res.status(404).json({ error: "not found" });

    const standings = buildQualifierStandingsForGame(game);

    res.json({
      groupId,
      tables: [
        {
          tableLabel: game.tableLabel ?? null,
          title: game.title ?? null,
          gameUuid: game.uuid,
          startTime: game.startTime ?? null,
        },
      ],
      standings,
    });
  });

  // D) wildcards
  app.get("/api/tournament/qualifier/wildcards", async (_req, res) => {
    const games = await loadAllGamesEnriched(mongo);
    const byGroupGame = pickQualifierGameByGroup(games);

    const candidates = buildWildcardCandidatesFromQualifierGames(byGroupGame);
    const cut = candidates.length >= QUALIFIER_WILDCARDS ? candidates[QUALIFIER_WILDCARDS - 1] : null;

    res.json({
      cutRank: QUALIFIER_WILDCARDS,
      cutPoints: cut ? cut.points : null,
      candidates,
    });
  });

  // E) finals bracket
  app.get("/api/tournament/finals/bracket", async (_req, res) => {
    const games = await loadAllGamesEnriched(mongo);
    const bracket = buildFinalsBracket(games);
    res.json(bracket);
  });
}

module.exports = { mountTournamentRoutes };

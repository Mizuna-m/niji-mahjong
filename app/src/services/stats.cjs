// app/src/services/stats.cjs
const { getOverlay, applyPlayerOverride, resolvePlayerByNickname } = require("../mappings/overlay.cjs");

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

function metricLabel(metric) {
  switch (metric) {
    case "deltaTotal":
      return "収支合計";
    case "hule":
      return "和了回数";
    case "dealIn":
      return "放銃回数";
    case "riichi":
      return "立直回数";
    case "calls":
      return "鳴き回数";
    case "rounds":
      return "局数";
    case "top1":
      return "トップ回数";
    default:
      return metric;
  }
}

async function buildLeaderboard({ mongo, metric = "deltaTotal", limit = 50 }) {
  const docs = await mongo.colDerived
    .find({}, { projection: { _id: 0, players: 1, finalScores: 1, derived: 1, startTime: 1 } })
    .sort({ startTime: 1 })
    .toArray();

  const acc = new Map(); // playerId -> stats

  function ensure(pid) {
    if (!acc.has(pid)) {
      const ov = getOverlay();
      const p = ov.playersById.get(pid);
      const base = p
        ? applyPlayerOverride(pid, { playerId: pid, displayName: p.displayName, image: p.image, tags: p.tags })
        : { playerId: pid, displayName: pid, image: undefined, tags: undefined };

      acc.set(pid, {
        ...base,
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
      });
    }
    return acc.get(pid);
  }

  for (const d of docs) {
    const derived = d.derived || {};
    const seatToRank = computePlacementFromFinalScores(d.players, d.finalScores);

    for (const st of derived.playerStats || []) {
      const r = resolvePlayerByNickname(st?.nickname ?? "");
      if (!r.playerId) continue;

      const a = ensure(r.playerId);
      a.games += 1;
      a.rounds += safeNum(st.rounds);
      a.deltaTotal += safeNum(st.deltaTotal);
      a.hule += safeNum(st.hule);
      a.tsumo += safeNum(st.tsumo);
      a.ron += safeNum(st.ron);
      a.dealIn += safeNum(st.dealIn);
      a.riichi += safeNum(st.riichi);
      a.calls += safeNum(st.calls);

      if (seatToRank) {
        const pl = (d.players || []).find((x) => x?.nickname === st.nickname);
        const rank = pl && typeof pl.seat === "number" ? seatToRank.get(pl.seat) : null;
        if (rank === 1) a.top1 += 1;
      }
    }
  }

  const rows = [...acc.values()];
  rows.sort((a, b) => safeNum(b[metric]) - safeNum(a[metric]));

  return {
    metric,
    metricLabel: metricLabel(metric),
    leaderboard: rows.slice(0, limit).map((r, idx) => ({
      rank: idx + 1,
      playerId: r.playerId,
      displayName: r.displayName,
      image: r.image,
      value: safeNum(r[metric]),
      games: r.games,
      rounds: r.rounds,
      deltaTotal: r.deltaTotal,
      hule: r.hule,
      dealIn: r.dealIn,
      riichi: r.riichi,
      calls: r.calls,
      top1: r.top1,
    })),
  };
}

async function buildCumulative({ mongo, limitGames = 2000 }) {
  const docs = await mongo.colDerived
    .find({}, { projection: { _id: 0, uuid: 1, startTime: 1, derived: 1 } })
    .sort({ startTime: 1 })
    .limit(limitGames)
    .toArray();

  const ov = getOverlay();
  const players = [];
  for (const [id, p] of ov.playersById.entries()) {
    players.push(applyPlayerOverride(id, { playerId: id, displayName: p.displayName, image: p.image, tags: p.tags }));
  }
  players.sort((a, b) => String(a.displayName).localeCompare(String(b.displayName), "ja"));

  const seriesByPlayer = new Map();
  const cum = new Map();
  for (const p of players) {
    seriesByPlayer.set(p.playerId, []);
    cum.set(p.playerId, 0);
  }

  let gameIndex = 0;
  for (const d of docs) {
    const derived = d.derived || {};
    const perGameDelta = new Map();

    for (const st of derived.playerStats || []) {
      const r = resolvePlayerByNickname(st?.nickname ?? "");
      if (!r.playerId) continue;
      perGameDelta.set(r.playerId, safeNum(st.deltaTotal));
    }

    for (const pid of seriesByPlayer.keys()) {
      const next = (cum.get(pid) || 0) + (perGameDelta.get(pid) || 0);
      cum.set(pid, next);
      seriesByPlayer.get(pid).push({ x: gameIndex, uuid: d.uuid, t: d.startTime ?? null, y: next });
    }

    gameIndex++;
  }

  return {
    games: docs.map((d, idx) => ({ index: idx, uuid: d.uuid, startTime: d.startTime ?? null })),
    players,
    series: players.map((p) => ({
      playerId: p.playerId,
      displayName: p.displayName,
      image: p.image,
      points: seriesByPlayer.get(p.playerId) || [],
    })),
  };
}

module.exports = { buildLeaderboard, buildCumulative };

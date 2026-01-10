// app/src/routes/tournamentKpi.cjs

const { resolvePlayerByNickname } = require("../mappings/overlay.cjs");

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 順位決定（同点は seat が小さい方が上）
 * return: [{ seat, score, rank }]
 */
function rankByScoreAndSeat(players, finalScores) {
  const rows = [];

  for (const p of players || []) {
    if (typeof p?.seat !== "number") continue;
    rows.push({
      seat: p.seat,
      nickname: p.nickname,
      score: safeNum(finalScores?.[p.seat]),
    });
  }

  if (rows.length !== 4) return [];

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.seat - b.seat; // 同点は席順
  });

  let rank = 1;
  let lastScore = null;
  return rows.map((r, idx) => {
    if (idx === 0) {
      lastScore = r.score;
      rank = 1;
    } else if (r.score !== lastScore) {
      rank = idx + 1;
      lastScore = r.score;
    }
    return { ...r, rank };
  });
}

function mountTournamentKpiRoutes(app, { mongo }) {
  app.get("/api/tournament/kpi", async (req, res) => {
    const phase = String(req.query.phase || "qualifier");

    if (phase !== "qualifier") {
      return res.json({
        phase,
        gamesPlayed: 0,
      });
    }

    const docs = await mongo.colDerived
      .find({}, { projection: { _id: 0, players: 1, finalScores: 1 } })
      .toArray();

    const gamesPlayed = docs.length;

    const groupWinners = []; // 確定通過
    const wildcardPool = []; // 1位以外

    for (const d of docs) {
      const ranked = rankByScoreAndSeat(d.players, d.finalScores);
      if (ranked.length !== 4) continue;

      for (const r of ranked) {
        const resolved = resolvePlayerByNickname(r.nickname);
        const entry = {
          seat: r.seat,
          score: r.score,
          rank: r.rank,
          playerId: resolved.playerId ?? null,
          displayName: resolved.displayName ?? r.nickname,
        };

        if (r.rank === 1) {
          groupWinners.push(entry);
        } else {
          wildcardPool.push(entry);
        }
      }
    }

    // ワイルドカード順位決定
    wildcardPool.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.seat - b.seat;
    });

    const wildcardSlots = 4;
    const cut = wildcardPool[wildcardSlots] ?? null;

    res.json({
      phase: "qualifier",
      gamesTotal: null, // 未確定なので null
      gamesPlayed,
      groupWinnersConfirmed: groupWinners.length,
      wildcardSlots,
      wildcardCut: cut
        ? {
            rank: wildcardSlots,
            points: cut.score,
            playerId: cut.playerId,
            displayName: cut.displayName,
          }
        : null,
    });
  });
}

module.exports = { mountTournamentKpiRoutes };

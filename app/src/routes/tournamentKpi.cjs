// app/src/routes/tournamentKpi.cjs

const {
  resolvePlayerByNickname,
  resolveTableByUuid,
  applyGameOverride,
} = require("../mappings/overlay.cjs");

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

/**
 * overlay（tables.yaml / overrides.yaml）から卓情報を組み立て
 * tournament.cjs と同等のロジックを KPI 側にも持たせる（phase フィルタのため）
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

    // 現状は予選KPIのみ対応（finals は必要になったら同様に拡張）
    if (phase !== "qualifier") {
      return res.json({
        phase,
        gamesPlayed: 0,
      });
    }

    const GROUPS_TOTAL = 24;
    const WILDCARDS_SLOTS = 4;

    // ★ uuid を必ず取る（overlayで phase/groupId を解決するため）
    const docs = await mongo.colDerived
      .find(
        {},
        { projection: { _id: 0, uuid: 1, players: 1, finalScores: 1 } }
      )
      .toArray();

    // ★ 予選対象だけに絞る：
    // - overlay で phase=qualifier と判定できるもの
    // - かつ groupId があるもの（=予選グループ卓）
    const qualifierDocs = [];
    for (const d of docs) {
      const uuid = String(d?.uuid ?? "").trim();
      if (!uuid) continue;

      const meta = resolveGameMeta(uuid);

      // phase が明示されていない卓は「予選扱い」にしない（混入防止のため）
      if (meta?.phase !== "qualifier") continue;

      // groupId が無いものは予選グループ卓ではない扱い（混入防止）
      if (!meta?.groupId) continue;

      qualifierDocs.push(d);
    }

    const gamesPlayed = qualifierDocs.length;

    const groupWinners = []; // 確定通過（各卓1位）
    const wildcardPool = []; // 1位以外（ワイルドカード候補）

    for (const d of qualifierDocs) {
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

    // ワイルドカード順位決定（points desc、同点は席順）
    wildcardPool.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.seat - b.seat;
    });

    const cut = wildcardPool[WILDCARDS_SLOTS - 1] ?? null;

    res.json({
      phase: "qualifier",
      gamesTotal: GROUPS_TOTAL,
      gamesPlayed,
      groupWinnersConfirmed: gamesPlayed,
      wildcardSlots: WILDCARDS_SLOTS,
      wildcardCut: cut
        ? {
            rank: WILDCARDS_SLOTS,
            points: cut.score,
            playerId: cut.playerId,
            displayName: cut.displayName,
          }
        : null,
    });
  });
}

module.exports = { mountTournamentKpiRoutes };

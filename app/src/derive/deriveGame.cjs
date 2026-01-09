// app/src/derive/deriveGame.cjs
// 牌譜JSON (majsoul paifu) -> DerivedGame（表示/集計用）へ変換する

function normalizeScores(s) {
  if (!Array.isArray(s)) return [0, 0, 0, 0];
  return s.slice(0, 4).map((v) => Number(v));
}

function sumFans(fans) {
  if (!Array.isArray(fans)) return 0;
  return fans.reduce((acc, f) => acc + (Number(f?.val) || 0), 0);
}

/**
 * head.result / records / actions など複数箇所から最終点を抽出
 */
function extractFinalScores(paifu) {
  // 1) head.result.players[].part_point_1 (今回の例で入っていた)
  const ps = paifu?.head?.result?.players;
  if (Array.isArray(ps) && ps.length === 4) {
    const bySeat = [...ps].sort((a, b) => a.seat - b.seat);
    const scores = bySeat.map((p) => p.part_point_1 ?? p.total_point ?? p.point ?? null);
    if (scores.every((x) => typeof x === "number")) return scores;
  }

  // 2) records に RecordGameEnd がある形式（環境によっては別ファイルにある）
  const records = paifu?.records ?? [];
  for (const r of records) {
    const ge = r?.[".lq.RecordGameEnd"];
    if (!ge) continue;
    const s =
      ge.end_scores ??
      ge.endScores ??
      ge.scores ??
      ge.final_scores ??
      ge.finalScores ??
      null;
    if (Array.isArray(s) && s.length === 4) return normalizeScores(s);
  }

  // 3) actions の末尾から Hule の old_scores+delta で推定
  const actions =
    paifu?.data?.data?.actions ??
    paifu?.data?.actions ??
    paifu?.actions ??
    [];
  for (let i = actions.length - 1; i >= 0; i--) {
    const a = actions[i];
    const name = a?.result?.name;
    if (name !== ".lq.RecordHule") continue;
    const r = a.result;

    // top-level old_scores+delta_scores
    if (Array.isArray(r?.old_scores) && Array.isArray(r?.delta_scores) && r.delta_scores.length === 4) {
      const old = normalizeScores(r.old_scores);
      const ds = normalizeScores(r.delta_scores);
      return old.map((v, idx) => v + ds[idx]);
    }

    // hules[].old_scores+delta_scores
    const hules = Array.isArray(r?.hules) ? r.hules : [];
    for (const h of hules) {
      if (Array.isArray(h?.old_scores) && Array.isArray(h?.delta_scores) && h.delta_scores.length === 4) {
        const old = normalizeScores(h.old_scores);
        const ds = normalizeScores(h.delta_scores);
        return old.map((v, idx) => v + ds[idx]);
      }
    }
  }

  return undefined;
}

function extractDeltaScoresFromHule(huleResult) {
  const hules = Array.isArray(huleResult?.hules) ? huleResult.hules : [];

  // 1) hules[].delta_scores
  for (const h of hules) {
    const ds = h?.delta_scores ?? h?.deltaScores;
    if (Array.isArray(ds) && ds.length === 4) return normalizeScores(ds);
  }

  // 2) top-level delta_scores
  const ds2 = huleResult?.delta_scores ?? huleResult?.deltaScores;
  if (Array.isArray(ds2) && ds2.length === 4) return normalizeScores(ds2);

  // 3) top-level old_scores + delta_scores (deltaだけ欲しい)
  if (
    Array.isArray(huleResult?.old_scores) &&
    Array.isArray(huleResult?.delta_scores) &&
    huleResult.delta_scores.length === 4
  ) {
    return normalizeScores(huleResult.delta_scores);
  }

  return null;
}

function guessDealInFromDelta(deltaScores, winners) {
  // 最も減っているseatを放銃者候補とする（単純版）
  let minV = Infinity;
  let minI = null;
  for (let i = 0; i < 4; i++) {
    const v = deltaScores[i];
    if (v < minV) {
      minV = v;
      minI = i;
    }
  }
  if (minI === null) return undefined;
  if (Array.isArray(winners) && winners.includes(minI)) return undefined;
  return minI;
}

function buildHuleEvent(huleResult, deltaScores) {
  const hules = Array.isArray(huleResult?.hules) ? huleResult.hules : [];

  const winners = [];
  for (const h of hules) {
    const w = h?.seat ?? h?.who ?? h?.winner_seat;
    if (typeof w === "number") winners.push(w);
  }

  // kind
  let kind = "ron";
  if (hules.length === 1) {
    const h = hules[0];
    if (h?.zimo === true || h?.tsumo === true) kind = "tsumo";
  } else if (hules.length > 1) {
    kind = "ron"; // ダブロンはron扱い
  }

  const loser = (kind === "ron" && deltaScores) ? guessDealInFromDelta(deltaScores, winners) : undefined;

  const han =
    (hules?.[0]?.fans ? sumFans(hules[0].fans) : undefined) ??
    (typeof hules?.[0]?.han === "number" ? hules[0].han : undefined);
  const fu = (typeof hules?.[0]?.fu === "number") ? hules[0].fu : undefined;

  // 表示用：最大増加分（供託等が混ざる可能性あり）
  const point = deltaScores ? Math.max(...deltaScores) : undefined;

  return {
    kind,
    winners,
    loser,
    han,
    fu,
    point,
    deltaScores: deltaScores ?? undefined,
  };
}

function isSeat(x) {
  return x === 0 || x === 1 || x === 2 || x === 3;
}

function summarizePlayers(players, rounds) {
  const bySeat = new Map();

  // players が欠けている/seatが変でも落ちないように、0-3を必ず作る
  for (let seat = 0; seat < 4; seat++) {
    const p = players.find(pp => pp.seat === seat);
    bySeat.set(seat, {
      seat,
      nickname: p?.nickname ?? `seat${seat}`,
      rounds: 0,
      hule: 0,
      tsumo: 0,
      ron: 0,
      dealIn: 0,
      riichi: 0,
      calls: 0,
      deltaTotal: 0,
    });
  }

  for (const rd of rounds) {
    // rounds count（局数）
    for (let seat = 0; seat < 4; seat++) bySeat.get(seat).rounds++;

    // riichi/calls（seatチェック）
    for (const s of (rd.riichiBy ?? [])) {
      if (!isSeat(s)) continue;
      bySeat.get(s).riichi++;
    }
    for (const s of (rd.callsBy ?? [])) {
      if (!isSeat(s)) continue;
      bySeat.get(s).calls++;
    }

    // delta（len=4だけ処理）
    const ds = rd?.hule?.deltaScores;
    if (Array.isArray(ds) && ds.length === 4) {
      for (let i = 0; i < 4; i++) bySeat.get(i).deltaTotal += Number(ds[i]) || 0;
    }

    // hule/deal-in
    if (rd.hule && Array.isArray(rd.hule.winners) && rd.hule.winners.length) {
      for (const w of rd.hule.winners) {
        if (!isSeat(w)) continue;
        const st = bySeat.get(w);
        st.hule++;
        if (rd.hule.kind === "tsumo") st.tsumo++;
        if (rd.hule.kind === "ron") st.ron++;
      }
      if (rd.hule.kind === "ron" && isSeat(rd.hule.loser)) {
        bySeat.get(rd.hule.loser).dealIn++;
      }
    }
  }

  // 表示順：playersがあればその順、無ければ0-3
  const order = players?.length ? players.map(p => p.seat).filter(isSeat) : [0, 1, 2, 3];
  const uniq = [...new Set(order)];
  if (uniq.length === 4) return uniq.map(seat => bySeat.get(seat));
  return [0, 1, 2, 3].map(seat => bySeat.get(seat));
}

/**
 * paifu(JSON) -> DerivedGame
 */
function deriveGame(paifu) {
  const notes = [];

  const uuid = paifu?.head?.uuid ?? "unknown";
  const startTime = paifu?.head?.start_time;
  const endTime = paifu?.head?.end_time;

  const players = (paifu?.head?.accounts ?? [])
    .slice()
    .sort((a, b) => a.seat - b.seat)
    .map((a) => ({
      seat: a.seat,
      nickname: a.nickname,
      accountId: a.account_id,
    }));

  const finalScores = extractFinalScores(paifu);

  const rounds = [];
  let current = null;
  let roundIndex = 0;

  const actions =
    paifu?.data?.data?.actions ??
    paifu?.data?.actions ??
    paifu?.actions ??
    [];

  for (const a of actions) {
    const name = a?.result?.name;
    if (!name) continue;

    if (name === ".lq.RecordNewRound") {
      if (current) {
        notes.push(`Round ${current.id.roundIndex} closed without Hule (maybe draw or missing record).`);
        rounds.push(current);
      }

      const r = a.result;
      const startScores = normalizeScores(r.scores);

      // 親 seat は多くの形式で ju（違う牌譜が出たらここだけ調整）
      const dealer = typeof r.ju === "number" ? r.ju : 0;

      current = {
        id: {
          roundIndex,
          honba: r.ben ?? 0,
          riichiSticks: r.liqibang ?? 0,
        },
        startScores,
        dealer,
        dora: r.dora ?? undefined,
        riichiBy: [],
        callsBy: [],
      };

      roundIndex++;
      continue;
    }

    if (!current) continue;

    if (name === ".lq.RecordDiscardTile") {
      const r = a.result;
      const seat = r.seat;
      if (r.is_liqi && (seat === 0 || seat === 1 || seat === 2 || seat === 3)) current.riichiBy.push(seat);
      continue;
    }

    if (name === ".lq.RecordChiPengGang" || name === ".lq.RecordAnGangAddGang") {
      const r = a.result;
      const seat = r.seat;
      if (seat === 0 || seat === 1 || seat === 2 || seat === 3) current.callsBy.push(seat);
      continue;
    }

    if (name === ".lq.RecordHule") {
      const r = a.result;
      const deltaScores = extractDeltaScoresFromHule(r);
      const endScores = deltaScores ? current.startScores.map((v, i) => v + deltaScores[i]) : undefined;
      const hule = buildHuleEvent(r, deltaScores);

      current.hule = hule;
      current.endScores = endScores;

      rounds.push(current);
      current = null;
      continue;
    }

    // TODO: 流局などを拾いたい場合はここに追加
  }

  if (current) {
    notes.push(`Last round ${current.id.roundIndex} closed without Hule.`);
    rounds.push(current);
  }

  const playerStats = summarizePlayers(players, rounds);

  return {
    uuid,
    startTime,
    endTime,
    rule: { raw: paifu?.head?.config?.detail_rule },
    players,
    finalScores,
    rounds,
    playerStats,
    parseNotes: notes.length ? notes : undefined,
  };
}

module.exports = {
  deriveGame,
  _internal: {
    extractFinalScores,
    extractDeltaScoresFromHule,
    buildHuleEvent,
    summarizePlayers,
    normalizeScores,
  },
};

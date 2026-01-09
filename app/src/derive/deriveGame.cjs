// app/src/derive/deriveGame.cjs
// 牌譜JSON (majsoul paifu) -> DerivedGame（表示/集計用）へ変換する
//
// 目的:
// - 牌譜フォーマット揺れ（result.data / snake_case / camelCase）に耐える
// - 大会の少局数データでも「最低限の統計（和了/放銃/立直/鳴き/収支）」が出る
// - まずは "RecordNewRound / RecordDiscardTile / RecordChiPengGang / RecordHule" を中心に拾う

function isSeat(x) {
  return x === 0 || x === 1 || x === 2 || x === 3;
}

function normalizeScores(s) {
  if (!Array.isArray(s)) return [0, 0, 0, 0];
  const a = s.slice(0, 4).map((v) => Number(v) || 0);
  while (a.length < 4) a.push(0);
  return a;
}

function normalizeDeltaScores(arr) {
  if (!Array.isArray(arr) || arr.length !== 4) return null;
  return arr.map((v) => Number(v) || 0);
}

function safeArray(x) {
  return Array.isArray(x) ? x : [];
}

/**
 * head.result / records / actions など複数箇所から最終点を抽出
 */
function extractFinalScores(paifu) {
  // 1) head.result.players[].part_point_1 (今回の例で入っていた)
  const ps = paifu?.head?.result?.players;
  if (Array.isArray(ps) && ps.length === 4) {
    const bySeat = [...ps].sort((a, b) => (a?.seat ?? 0) - (b?.seat ?? 0));
    const scores = bySeat.map((p) => p?.part_point_1 ?? p?.total_point ?? p?.point ?? null);
    if (scores.every((x) => typeof x === "number")) return scores.map((n) => Number(n) || 0);
  }

  // 2) records に RecordGameEnd がある形式
  const records = safeArray(paifu?.records);
  for (const r of records) {
    const ge = r?.[".lq.RecordGameEnd"] ?? r?.RecordGameEnd ?? null;
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

    const r = a?.result?.data ?? a?.result;

    // top-level old_scores + delta_scores
    if (Array.isArray(r?.old_scores) && Array.isArray(r?.delta_scores) && r.delta_scores.length === 4) {
      const old = normalizeScores(r.old_scores);
      const ds = normalizeScores(r.delta_scores);
      return old.map((v, idx) => v + ds[idx]);
    }

    // hules[].old_scores + delta_scores
    const hules = safeArray(r?.hules);
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

/**
 * RecordHule から delta_scores を取る
 * - よくある: r.delta_scores (snake_case)
 * - 予備: r.deltaScores (camelCase)
 */
function extractDeltaScoresFromHule(r) {
  const ds = normalizeDeltaScores(r?.delta_scores);
  if (ds) return ds;

  const ds2 = normalizeDeltaScores(r?.deltaScores);
  if (ds2) return ds2;

  // まれに hules[0].delta_scores にあるケースも一応拾う
  const h0 = safeArray(r?.hules)[0];
  const ds3 = normalizeDeltaScores(h0?.delta_scores ?? h0?.deltaScores);
  if (ds3) return ds3;

  return null;
}

/**
 * RecordHule から winners を抽出
 *  - 多くの牌譜: r.hules[].seat
 *  - 予備: r.hules[].who / chair / actor など
 */
function extractWinnersFromHule(r) {
  const hules = safeArray(r?.hules);

  const winners = [];
  for (const h of hules) {
    const seat =
      (typeof h?.seat === "number" ? h.seat : null) ??
      (typeof h?.who === "number" ? h.who : null) ??
      (typeof h?.chair === "number" ? h.chair : null) ??
      (typeof h?.actor === "number" ? h.actor : null);

    if (isSeat(seat)) winners.push(seat);
  }

  // 念のため unique
  return [...new Set(winners)];
}

/**
 * 放銃推定（単純版）
 * - ron のとき delta が最もマイナスの席を loser とみなす
 * - winners に含まれる席は除外
 */
function guessLoserFromDelta(deltaScores, winners) {
  if (!Array.isArray(deltaScores) || deltaScores.length !== 4) return undefined;

  let minVal = Infinity;
  let minIdx = -1;
  for (let i = 0; i < 4; i++) {
    const v = Number(deltaScores[i]) || 0;
    if (v < minVal) {
      minVal = v;
      minIdx = i;
    }
  }
  if (minIdx < 0) return undefined;
  if (Array.isArray(winners) && winners.includes(minIdx)) return undefined;
  if (minVal >= 0) return undefined;
  return minIdx;
}

/**
 * Hule種別（ツモ/ロン）の推定
 * - よくある: hules[].zimo (trueならツモ)
 * - 予備: top-level zimo
 */
function inferHuleKind(r) {
  const hules = safeArray(r?.hules);
  const anyZimo = hules.some((h) => !!h?.zimo) || !!r?.zimo;
  return anyZimo ? "tsumo" : "ron";
}

/**
 * RecordHule から表示用情報（翻/符/点）を拾う
 * - count = 翻, fu = 符, point_sum = 点（和了点）
 * - 形式揺れ: han / fans / point なども一応見る
 */
function extractHuleDisplayInfo(r) {
  const h0 = safeArray(r?.hules)[0] ?? {};
  const han =
    (typeof h0?.count === "number" ? h0.count : undefined) ??
    (typeof h0?.han === "number" ? h0.han : undefined) ??
    (typeof r?.han === "number" ? r.han : undefined);

  const fu =
    (typeof h0?.fu === "number" ? h0.fu : undefined) ??
    (typeof r?.fu === "number" ? r.fu : undefined);

  const point =
    (typeof h0?.point_sum === "number" ? h0.point_sum : undefined) ??
    (typeof h0?.point === "number" ? h0.point : undefined) ??
    (typeof r?.point_sum === "number" ? r.point_sum : undefined) ??
    (typeof r?.point === "number" ? r.point : undefined);

  return { han, fu, point };
}

/**
 * RecordHule から hule event を作る
 */
function buildHuleEvent(r, deltaScores) {
  const winners = extractWinnersFromHule(r);
  const kind = inferHuleKind(r);

  let loser = undefined;
  if (kind === "ron") loser = guessLoserFromDelta(deltaScores, winners);

  const { han, fu, point } = extractHuleDisplayInfo(r);

  return {
    kind,
    winners,
    loser,
    han,
    fu,
    point,
    deltaScores: Array.isArray(deltaScores) ? deltaScores : undefined,
  };
}

/**
 * 1局ごとの集計 → プレイヤー統計へ畳み込む
 */
function summarizePlayers(players, rounds) {
  const bySeat = new Map();

  // 0-3 を必ず作る（playersが欠けても落ちない）
  for (let seat = 0; seat < 4; seat++) {
    const p = (players || []).find((pp) => pp?.seat === seat);
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
    // 局数
    for (let seat = 0; seat < 4; seat++) bySeat.get(seat).rounds++;

    // 立直
    for (const s of (rd.riichiBy ?? [])) {
      if (!isSeat(s)) continue;
      bySeat.get(s).riichi++;
    }

    // 鳴き
    for (const s of (rd.callsBy ?? [])) {
      if (!isSeat(s)) continue;
      bySeat.get(s).calls++;
    }

    // 収支（delta）
    const ds = rd?.hule?.deltaScores;
    if (Array.isArray(ds) && ds.length === 4) {
      for (let i = 0; i < 4; i++) bySeat.get(i).deltaTotal += Number(ds[i]) || 0;
    }

    // 和了/放銃
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
  const order = (players?.length ? players.map((p) => p.seat).filter(isSeat) : [0, 1, 2, 3]);
  const uniq = [...new Set(order)];
  if (uniq.length === 4) return uniq.map((seat) => bySeat.get(seat));
  return [0, 1, 2, 3].map((seat) => bySeat.get(seat));
}

/**
 * paifu(JSON) -> DerivedGame
 */
function deriveGame(paifu) {
  const notes = [];

  const uuid = paifu?.head?.uuid ?? "unknown";
  const startTime = paifu?.head?.start_time;
  const endTime = paifu?.head?.end_time;

  // players
  const players = (paifu?.head?.accounts ?? [])
    .slice()
    .sort((a, b) => (a?.seat ?? 0) - (b?.seat ?? 0))
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

    // ★重要：本体は result.data に入ってることがある
    const payload = a?.result?.data ?? a?.result;

    // ---- new round ----
    if (name === ".lq.RecordNewRound") {
      if (current) {
        notes.push(`Round ${current.id.roundIndex} closed without Hule (maybe draw or missing record).`);
        rounds.push(current);
      }

      const r = payload;
      const startScores = normalizeScores(r?.scores);
      const dealer = typeof r?.ju === "number" ? r.ju : 0;

      current = {
        id: {
          roundIndex,
          honba: r?.ben ?? 0,
          riichiSticks: r?.liqibang ?? 0,
        },
        startScores,
        dealer,
        dora: r?.dora ?? undefined,
        riichiBy: [],
        callsBy: [],
      };

      roundIndex++;
      continue;
    }

    if (!current) continue;

    // ---- riichi ----
    if (name === ".lq.RecordDiscardTile") {
      const r = payload;
      const seat = r?.seat;
      if (r?.is_liqi && isSeat(seat)) current.riichiBy.push(seat);
      continue;
    }

    // ---- calls ----
    if (name === ".lq.RecordChiPengGang" || name === ".lq.RecordAnGangAddGang") {
      const r = payload;
      const seat = r?.seat;
      if (isSeat(seat)) current.callsBy.push(seat);
      continue;
    }

    // ---- win ----
    if (name === ".lq.RecordHule") {
      const r = payload;
      const deltaScores = extractDeltaScoresFromHule(r);
      const endScores = deltaScores ? current.startScores.map((v, i) => v + deltaScores[i]) : undefined;
      const hule = buildHuleEvent(r, deltaScores);

      // winners が取れないなら、notes に残す（ゼロ問題のデバッグ用）
      if (!hule.winners?.length) {
        notes.push(`Hule without winners at round ${current.id.roundIndex} (check RecordHule format).`);
      }
      if (!hule.deltaScores) {
        notes.push(`Hule without deltaScores at round ${current.id.roundIndex} (check delta_scores).`);
      }

      current.hule = hule;
      current.endScores = endScores;

      rounds.push(current);
      current = null;
      continue;
    }

    // TODO: 流局などを拾いたい場合はここに追加（RecordNoTile / RecordLiuJu 等）
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
    extractWinnersFromHule,
    inferHuleKind,
    guessLoserFromDelta,
  },
};

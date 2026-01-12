// src/components/finals/FinalsBracketView.tsx
import Link from "next/link";
import type { FinalsBracketResponse, FinalsMatch, FinalsSeat } from "@/lib/typesTournament";
import { cardCls, pillCls } from "@/lib/ui";
import PlayerAvatar from "@/components/PlayerAvatar";
import { playerHref } from "@/lib/playerLink";

// 表示は必ず 東南西北（数字は出さない）
const SEAT_LABEL = ["東", "南", "西", "北"] as const;
const RANK_LABEL = ["1位", "2位", "3位", "4位"] as const;

function seatLabel(matchId: string, seat: number) {
  // 決勝だけ順位表示（matchId === "F" 前提）
  const arr = matchId === "F" ? RANK_LABEL : SEAT_LABEL;
  return (arr as any)[seat] ?? "?";
}

// ざっくり固定レイアウト（DOM計測なしで線を引くため）
const CARD_W = 320;
const CARD_H = 240;
const GAP_Y = 28;
const GAP_X = 170;
const HEADER_H = 64;
const ROW_H = 40;
const ROW_GAP = 10;

function seatName(s: FinalsSeat) {
  return s.displayName || s.nickname || s.source || "TBD";
}

function safeNumber(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function getAggregateRawPoints(m: any): number[] | null {
  // 案A: 決勝のみ複数半荘を束ねた合計 “素点”
  // 期待形: m.aggregateResult.totalRawPointsBySeat: number[4]
  const arr =
    m?.aggregateResult?.totalScoresBySlot ??
    m?.aggregateResult?.totalRawPointsBySeat ??
    m?.aggregateResult?.totalRawPoints ??
    null;

  if (!Array.isArray(arr) || arr.length !== 4) return null;
  const nums = arr.map((v: any) => safeNumber(v));
  if (nums.some((v) => v === null)) return null;
  return nums as number[];
}

function SeatRow({
  matchId,
  s,
  isAdv,
  rawPoint,
}: {
  matchId: string;
  s: FinalsSeat;
  isAdv: boolean;
  rawPoint?: number | null;
}) {
  const name = seatName(s);
  const href = playerHref(s.playerId ?? null, null, name);

  return (
    <div
      className={[
        "flex items-center gap-2 rounded-2xl border px-2 py-2",
        "bg-white/60 dark:bg-zinc-950/20",
        "border-black/5 dark:border-white/10",
        "h-10",
        isAdv
          ? "ring-2 ring-emerald-500/35 border-emerald-500/30 bg-emerald-50/35 dark:bg-emerald-950/10"
          : "",
      ].join(" ")}
    >
      <div className="w-10 shrink-0 text-center text-sm font-semibold text-zinc-600 dark:text-zinc-300">
        {seatLabel(matchId, s.seat)}
      </div>

      <PlayerAvatar name={name} src={s.image ?? null} size={28} />

      <div className="min-w-0 flex-1">
        {s.playerId ? (
          <Link href={href} className="truncate text-sm font-semibold hover:underline">
            {name}
          </Link>
        ) : (
          <div className="truncate text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            {name}
          </div>
        )}
        {s.source ? (
          <div className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-500">
            {s.source}
          </div>
        ) : null}
      </div>

      {/* 決勝(2戦以上)のときだけ素点合計を見せる（数値は右端に小さく） */}
      {rawPoint != null ? (
        <div className="shrink-0 tabular-nums text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          {rawPoint}
        </div>
      ) : null}

      {isAdv ? <span className={`${pillCls} text-xs`}>進出</span> : null}
    </div>
  );
}

function MatchCard({
  m,
  top,
  left,
}: {
  m: FinalsMatch;
  top: number;
  left: number;
}) {
  const status =
    m.status === "finished"
      ? "終了"
      : m.status === "live"
        ? "LIVE"
        : m.status === "scheduled"
          ? "予定"
          : m.status === "tiebreak"
            ? "同点"
            : "未実施";

  const advSet = new Set((m.advance ?? []).map((a) => a.fromSeat));
  const hasAdv = advSet.size > 0;

  const agg = getAggregateRawPoints(m);
  const showAgg = agg && (m.status === "finished" || m.status === "live" || m.status === "tiebreak");

  return (
    <div
      className={[
        "absolute",
        "rounded-3xl",
        hasAdv ? "ring-1 ring-emerald-500/25" : "",
      ].join(" ")}
      style={{ top, left, width: CARD_W, height: CARD_H }}
    >
      <div className={cardCls + " h-full"}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/finals/matches/${encodeURIComponent(m.matchId)}`}
              className="block truncate text-sm font-semibold hover:underline"
              title={m.title ?? m.label ?? m.matchId}
            >
              {m.tableLabel ? `${m.tableLabel} ` : ""}
              {m.label ?? m.matchId}
            </Link>
            {m.title ? (
              <div className="mt-1 truncate text-xs text-zinc-600 dark:text-zinc-400">
                {m.title}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className={pillCls}>{status}</span>
            {hasAdv ? <span className={`${pillCls} text-xs`}>進出あり</span> : null}

            {/* 同点なら第3戦の可能性メモ */}
            {m.status === "tiebreak" ? (
              <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                同点発生
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {(m.seats ?? []).map((s: any) => (
            <SeatRow
              key={`${m.matchId}-${s.seat}`}
              matchId={m.matchId}
              s={s}
              isAdv={advSet.has(s.seat)}
              rawPoint={showAgg ? agg?.[s.seat] ?? null : null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// 以下（レイアウト計算・round描画など）は既存のまま
type Pos = { roundIdx: number; matchIdx: number; top: number; left: number };

function naturalKey(id: string) {
  // "QF-10" みたいなものも一応自然ソート寄りに
  const m = /(\D+)-?(\d+)?/.exec(id);
  const p = m?.[1] ?? id;
  const n = m?.[2] ? Number(m[2]) : -1;
  return { p, n, id };
}

function orderedMatches(roundId: string, matches: FinalsMatch[]) {
  // APIの順が良ければそのままでも良いが、ズレた時の保険で roundId + matchId で軽く整列
  return [...matches].sort((a, b) => {
    const ka = naturalKey(a.matchId);
    const kb = naturalKey(b.matchId);
    if (ka.p !== kb.p) return ka.p.localeCompare(kb.p);
    if (ka.n !== kb.n) return ka.n - kb.n;
    return ka.id.localeCompare(kb.id);
  });
}

function topFor(roundIdx: number, matchIdx: number) {
  const step = CARD_H + GAP_Y;

  if (roundIdx === 0) return matchIdx * step;

  const pow = 2 ** roundIdx;
  const center = (matchIdx * pow + (pow - 1) / 2) * step;
  return Math.round(center - CARD_H / 2);
}

function seatYWithinCard(seat: number) {
  return HEADER_H + seat * (ROW_H + ROW_GAP) + ROW_H / 2;
}

export default function FinalsBracketView({ bracket }: { bracket: FinalsBracketResponse }) {
  // 表示順（必要ならここだけ差し替え）
  const roundOrder = ["QF", "SF", "F"] as const;

  const rounds = roundOrder
    .map((id) => bracket.rounds.find((r) => r.roundId === id))
    .filter(Boolean);

  // マップ作成（matchId → 位置）
  const posByMatchId = new Map<string, Pos>();
  const roundMatches: FinalsMatch[][] = [];

  rounds.forEach((r, roundIdx) => {
    const ms = orderedMatches(r!.roundId, r!.matches);
    roundMatches.push(ms);

    ms.forEach((m, matchIdx) => {
      const top = topFor(roundIdx, matchIdx);
      const left = roundIdx * (CARD_W + GAP_X);
      posByMatchId.set(m.matchId, { roundIdx, matchIdx, top, left });
    });
  });

  // コンテナ高さ（QFの数を基準に確定）
  const qfCount = roundMatches[0]?.length ?? 0;
  const step = CARD_H + GAP_Y;
  const height = qfCount > 0 ? (qfCount - 1) * step + CARD_H : 520;
  const width = rounds.length * (CARD_W + GAP_X) - GAP_X + CARD_W;

  // コネクタ生成（advance の fromSeat → toMatchId/toSeat）
  const connectors: Array<{
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }> = [];

  roundMatches.flat().forEach((m) => {
    const srcPos = posByMatchId.get(m.matchId);
    if (!srcPos) return;

    (m.advance ?? []).forEach((a) => {
      const dstPos = posByMatchId.get(a.toMatchId);
      if (!dstPos) return;

      const x1 = srcPos.left + CARD_W;
      const y1 = srcPos.top + seatYWithinCard(a.fromSeat);

      const x2 = dstPos.left;
      const y2 = dstPos.top + seatYWithinCard(a.toSeat);

      connectors.push({
        key: `${m.matchId}:${a.fromSeat}->${a.toMatchId}:${a.toSeat}`,
        x1,
        y1,
        x2,
        y2,
      });
    });
  });

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[980px]">
        <div className="mb-12 flex items-center justify-between">
          <div className="text-sm font-semibold">決勝トーナメント</div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white/50 p-3 shadow-sm dark:border-white/10 dark:bg-zinc-900/30">
          {/* ここが「CSSの図」本体：カードは絶対配置、線は div で描画 */}
          <div className="relative" style={{ width, height }}>
            {/* 線（水平→垂直→水平） */}
            {connectors.map((c) => {
              const midX = Math.round((c.x1 + c.x2) / 2);
              const left = Math.min(c.x1, c.x2);
              const right = Math.max(c.x1, c.x2);

              const topY = Math.min(c.y1, c.y2);
              const botY = Math.max(c.y1, c.y2);

              return (
                <div key={c.key} className="absolute inset-0 pointer-events-none">
                  {/* 左水平 */}
                  <div
                    className="absolute bg-black/15 dark:bg-white/15"
                    style={{
                      left: c.x1,
                      top: c.y1,
                      width: midX - c.x1,
                      height: 2,
                    }}
                  />
                  {/* 垂直 */}
                  <div
                    className="absolute bg-black/15 dark:bg-white/15"
                    style={{
                      left: midX,
                      top: topY,
                      width: 2,
                      height: botY - topY,
                    }}
                  />
                  {/* 右水平 */}
                  <div
                    className="absolute bg-black/15 dark:bg-white/15"
                    style={{
                      left: midX,
                      top: c.y2,
                      width: c.x2 - midX,
                      height: 2,
                    }}
                  />

                  {/* 端点（小丸） */}
                  <div
                    className="absolute rounded-full bg-black/25 dark:bg-white/25"
                    style={{
                      left: c.x1 - 3,
                      top: c.y1 - 3,
                      width: 6,
                      height: 6,
                    }}
                  />
                  <div
                    className="absolute rounded-full bg-black/25 dark:bg-white/25"
                    style={{
                      left: c.x2 - 3,
                      top: c.y2 - 3,
                      width: 6,
                      height: 6,
                    }}
                  />
                </div>
              );
            })}

            {/* カード */}
            {roundMatches.flat().map((m) => {
              const p = posByMatchId.get(m.matchId);
              if (!p) return null;
              return <MatchCard key={m.matchId} m={m} top={p.top} left={p.left} />;
            })}

            {/* 列ラベル（上部） */}
            <div className="absolute left-0 top-0 -translate-y-[40px] text-xs text-zinc-600 dark:text-zinc-400">
              1回戦
            </div>
            {rounds.length > 1 ? (
              <div
                className="absolute top-0 -translate-y-[40px] text-xs text-zinc-600 dark:text-zinc-400"
                style={{ left: 1 * (CARD_W + GAP_X) }}
              >
                準決勝
              </div>
            ) : null}
            {rounds.length > 2 ? (
              <div
                className="absolute top-0 -translate-y-[40px] text-xs text-zinc-600 dark:text-zinc-400"
                style={{ left: 2 * (CARD_W + GAP_X) }}
              >
                決勝
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

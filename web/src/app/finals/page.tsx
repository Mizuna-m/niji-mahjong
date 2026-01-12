// src/app/finals/page.tsx
import Link from "next/link";
import { fetchFinalsBracket } from "@/lib/api";
import FinalsBracketView from "@/components/finals/FinalsBracketView";
import { cardCls, pillCls } from "@/lib/ui";

const SEAT_LABEL = ["東", "南", "西", "北"] as const;

function getTotalRawPointsBySeat(finalMatch: any): number[] | null {
  const arr =
    finalMatch?.aggregateResult?.totalRawPointsBySeat ??
    finalMatch?.aggregateResult?.totalRawPoints ??
    null;
  if (!Array.isArray(arr) || arr.length !== 4) return null;
  if (arr.some((v) => typeof v !== "number" || !Number.isFinite(v))) return null;
  return arr as number[];
}

function winnerSeatByTotals(totals: number[]): number | null {
  // 同点トップなら null（＝延長の可能性）
  const max = Math.max(...totals);
  const topSeats = totals
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v === max)
    .map((x) => x.i);
  if (topSeats.length !== 1) return null;
  return topSeats[0];
}

export default async function FinalsPage() {
  const bracket = await fetchFinalsBracket();

  const finalRound = bracket.rounds.find((r) => r.roundId === "F");
  const finalMatch = finalRound?.matches?.[0];

  // const totals = getTotalRawPointsBySeat(finalMatch);
  // const winnerSeat = totals ? winnerSeatByTotals(totals) : null;

  const agg = finalMatch?.aggregateResult ?? null;
  const winnerSeat = typeof agg?.winnerSlot === "number" ? agg.winnerSlot : null;
  const totals =
    Array.isArray(agg?.totalScoresBySlot) && agg.totalScoresBySlot.length === 4
      ? agg.totalScoresBySlot
      : null;

  // 決勝終了かつ同点じゃない場合のみ優勝確定
  const champion =
    finalMatch?.status === "finished" && winnerSeat != null
      ? finalMatch.seats?.find((s: any) => s.seat === winnerSeat)
      : null;

  const finalKnown = finalMatch?.seats?.filter((s: any) => !!s.playerId) ?? [];

  // const isTieTop =
  //   finalMatch?.status === "tiebreak" ||
  //   (finalMatch?.status === "finished" && totals != null && winnerSeat == null);
  const isTieTop = finalMatch?.status === "tiebreak" || agg?.isTieTop === true;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">決勝トーナメント</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/ranking" className="text-sm underline">
            ランキングへ
          </Link>
        </div>
      </div>

      <div className={cardCls + " mb-4"}>
        {champion ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                現在の結果
              </div>
              <div className="mt-1 text-base font-semibold">
                優勝：{champion.displayName || champion.nickname || "（不明）"}
              </div>
              {totals ? (
                <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
                  素点合計：{totals.map((v, i) => `${SEAT_LABEL[i]} ${v}`).join(" / ")}
                </div>
              ) : null}
            </div>
            <span className={`${pillCls} text-xs`}>決勝終了</span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                決勝の状況
              </div>

              <div className="mt-1 text-sm font-semibold">
                {!finalMatch
                  ? "決勝カードが未設定です"
                  : isTieTop
                    ? "同点のため、追加対局（第3戦）が行われる可能性があります"
                    : "決勝は未終了です"}
              </div>

              {totals ? (
                <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
                  素点合計（暫定）：{totals.map((v, i) => `${SEAT_LABEL[i]} ${v}`).join(" / ")}
                </div>
              ) : null}

              {finalKnown.length > 0 ? (
                <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  確定している席：{" "}
                  {finalKnown
                    .map(
                      (s: any) =>
                        `${SEAT_LABEL[s.seat] ?? "?"}：${
                          s.displayName || s.nickname || "TBD"
                        }`
                    )
                    .join(" / ")}
                </div>
              ) : null}
            </div>

            <span className={`${pillCls} text-xs`}>
              {champion ? "決勝終了" : isTieTop ? "延長待ち" : "進行中"}
            </span>
          </div>
        )}
      </div>

      <FinalsBracketView bracket={bracket} />

      <div className="mt-4 text-xs text-zinc-600 dark:text-zinc-400">
        ※ 試合カードをタップすると詳細へ移動します。
      </div>
    </div>
  );
}

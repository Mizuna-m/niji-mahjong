// src/app/finals/page.tsx
import Link from "next/link";
import { fetchFinalsBracket } from "@/lib/api";
import FinalsBracketView from "@/components/finals/FinalsBracketView";
import { cardCls, pillCls } from "@/lib/ui";

const SEAT_LABEL = ["東", "南", "西", "北"] as const;

export default async function FinalsPage() {
  const bracket = await fetchFinalsBracket();

  // 決勝（F）が終わっていれば「優勝」、終わってなければ「決勝進出（確定分）」を出す
  const finalRound = bracket.rounds.find((r) => r.roundId === "F");
  const finalMatch = finalRound?.matches?.[0];

  const champion =
    finalMatch?.status === "finished" && finalMatch.result
      ? finalMatch.seats?.find((s) => s.seat === finalMatch.result?.winnerSeat)
      : null;

  const finalKnown =
    finalMatch?.seats?.filter((s) => !!s.playerId) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">決勝トーナメント</h1>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            進出者を強調し、線でつながりを見える化します
          </div>
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
                {finalMatch ? "決勝は未終了です" : "決勝カードが未設定です"}
              </div>
              {finalKnown.length > 0 ? (
                <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  確定している席：{" "}
                  {finalKnown
                    .map(
                      (s) =>
                        `${SEAT_LABEL[s.seat] ?? "?"}：${
                          s.displayName || s.nickname || "TBD"
                        }`,
                    )
                    .join(" / ")}
                </div>
              ) : null}
            </div>
            <span className={`${pillCls} text-xs`}>進行中</span>
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

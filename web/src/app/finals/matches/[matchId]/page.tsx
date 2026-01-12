// src/app/finals/matches/[matchId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import PlayerAvatar from "@/components/PlayerAvatar";
import { cardCls, pillCls } from "@/lib/ui";
import { playerHref } from "@/lib/playerLink";
import { fetchFinalsMatch } from "@/lib/api";

// 東南西北
const SEAT_LABEL = ["東", "南", "西", "北"] as const;
const RANK_LABEL = ["1位", "2位", "3位", "4位"] as const;

function seatLabel(matchId: string, seat: number) {
  const arr = matchId === "F" ? RANK_LABEL : SEAT_LABEL;
  return (arr as any)[seat] ?? "?";
}

function seatName(s: any) {
  return s.displayName || s.nickname || s.source || "TBD";
}

function getAggregateRawPoints(m: any): number[] | null {
  const arr =
    m?.aggregateResult?.totalScoresBySlot ??
    m?.aggregateResult?.totalRawPointsBySeat ??
    m?.aggregateResult?.totalRawPoints ??
    null;
  if (!Array.isArray(arr) || arr.length !== 4) return null;
  if (arr.some((v) => typeof v !== "number")) return null;
  return arr as number[];
}

export default async function FinalsMatchPage({
  params,
}: {
  params: { matchId: string };
}) {
  const { matchId } = await params;
  const decoded = decodeURIComponent(matchId);

  const res = await fetchFinalsMatch(decoded).catch(() => null);
  if (!res?.match) return notFound();

  const m = res.match; // ★ここが重要（res ではなく res.match を使う）

  const advSet = new Set((m.advance ?? []).map((a: any) => a.fromSeat));
  const agg = getAggregateRawPoints(m);

  // 新: games[]（決勝2戦以上）優先 / 旧: gameUuid にフォールバック
  const games: Array<{ gameUuid: string; label?: string }> =
    Array.isArray(m.games) && m.games.length > 0
      ? m.games.map((g: any, i: number) => ({
          gameUuid: g.gameUuid ?? g.uuid ?? g,
          label: g.label ?? `第${i + 1}戦`,
        }))
      : m.gameUuid
        ? [{ gameUuid: m.gameUuid, label: "対局" }]
        : [];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className={cardCls}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              {m.tableLabel ? `${m.tableLabel} ` : ""}
              {m.label ?? m.matchId}
            </div>

            {/* 複数対局リンク */}
            {games.length > 0 ? (
              <div className="mt-2 space-y-1">
                {games.map((g) => (
                  <div key={g.gameUuid} className="text-sm">
                    <Link
                      href={`/games/${encodeURIComponent(g.gameUuid)}`}
                      className="underline text-zinc-700 dark:text-zinc-300"
                    >
                      {g.label ?? "対局"}：対局詳細へ
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                対局UUID未設定
              </div>
            )}
          </div>

          {/* 結果サマリ：決勝は“素点合計”を優先表示 */}
          {m.status === "finished" && (agg || m.result) ? (
            <div className="text-right">
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                {agg ? "勝敗（素点合計）" : "勝敗（スコア）"}
              </div>
              <div className="mt-1 text-sm font-semibold tabular-nums">
                {agg
                  ? agg.map((v, i) => `${seatLabel(m.matchId, i)} ${v}`).join(" / ")
                  : m.result?.finalScores
                      ?.map((v: any, i: number) => `${seatLabel(m.matchId, i)} ${v}`)
                      .join(" / ")}
              </div>
            </div>
          ) : null}
        </div>

        {/* 同点なら注意 */}
        {m.status === "tiebreak" ? (
          <div className="mt-3 text-sm text-amber-700 dark:text-amber-300">
            同点のため、追加対局（第3戦）が行われる可能性があります。
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          {(m.seats ?? []).map((s: any) => {
            const name = seatName(s);
            const href = playerHref(s.playerId ?? null, null, name);
            const isAdv = advSet.has(s.seat);

            return (
              <div
                key={`${m.matchId}-${s.seat}`}
                className={[
                  "flex items-center gap-2 rounded-2xl border px-2 py-2",
                  "bg-white/60 dark:bg-zinc-950/20",
                  "border-black/5 dark:border-white/10",
                  isAdv
                    ? "ring-2 ring-emerald-500/40 border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/10"
                    : "",
                ].join(" ")}
              >
                <div className="w-10 shrink-0 text-center font-semibold text-zinc-600 dark:text-zinc-300">
                  {seatLabel(m.matchId, s.seat)}
                </div>

                <PlayerAvatar name={name} src={s.image ?? null} size={32} />

                <div className="min-w-0 flex-1">
                  {s.playerId ? (
                    <Link href={href} className="truncate font-semibold hover:underline">
                      {name}
                    </Link>
                  ) : (
                    <div className="truncate font-semibold text-zinc-600 dark:text-zinc-300">
                      {name}
                    </div>
                  )}
                  {s.source ? (
                    <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                      {s.source}
                    </div>
                  ) : null}
                </div>

                {/* 合計素点（あれば右端に表示） */}
                {agg ? (
                  <div className="shrink-0 tabular-nums text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    {agg[s.seat] ?? ""}
                  </div>
                ) : null}

                {isAdv ? <span className={`${pillCls} text-xs`}>進出</span> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

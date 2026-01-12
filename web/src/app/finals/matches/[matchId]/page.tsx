// src/app/finals/matches/[matchId]/page.tsx
import Link from "next/link";
import { fetchFinalsMatch } from "@/lib/api";
import { cardCls, pillCls } from "@/lib/ui";
import PlayerAvatar from "@/components/PlayerAvatar";
import { playerHref } from "@/lib/playerLink";

const SEAT_LABEL = ["東", "南", "西", "北"] as const;

export default async function FinalsMatchPage({
  params,
}: {
  // Next.js 16+ (sync dynamic APIs) 対策: params が Promise の場合がある
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;

  const doc = await fetchFinalsMatch(matchId);
  const m = doc.match;

  const status =
    m.status === "finished"
      ? "終了"
      : m.status === "live"
        ? "LIVE"
        : m.status === "scheduled"
          ? "予定"
          : "未実施";

  const advSet = new Set((m.advance ?? []).map((a) => a.fromSeat));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            決勝トーナメント
          </div>
          <h1 className="truncate text-lg font-semibold">
            {m.title ?? m.label ?? m.matchId}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className={pillCls}>{status}</span>
          <Link href="/finals" className="text-sm underline">
            トーナメントへ
          </Link>
        </div>
      </div>

      <div className={cardCls}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              {m.tableLabel ? `${m.tableLabel} ` : ""}
              {m.label ?? m.matchId}
            </div>
            {m.gameUuid ? (
              <Link
                href={`/games/${encodeURIComponent(m.gameUuid)}`}
                className="mt-1 inline-block text-sm underline text-zinc-700 dark:text-zinc-300"
              >
                対局詳細へ
              </Link>
            ) : (
              <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                対局UUID未設定
              </div>
            )}
          </div>

          {m.status === "finished" && m.result ? (
            <div className="text-right">
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                勝敗（スコア）
              </div>
              <div className="mt-1 text-sm font-semibold">
                {m.result.finalScores
                  ?.map((v, i) => `${SEAT_LABEL[i]} ${v}`)
                  .join(" / ")}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          {(m.seats ?? []).map((s) => {
            const name = s.displayName || s.nickname || s.source || "TBD";
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
                  {SEAT_LABEL[s.seat] ?? "?"}
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

                {isAdv ? (
                  <span className={`${pillCls} text-xs`}>進出</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

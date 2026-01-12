// src/app/finals/matches/[matchId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchFinalsMatch } from "@/lib/api";
import { cardCls, pillCls } from "@/lib/ui";
import PlayerAvatar from "@/components/PlayerAvatar";
import { playerHref } from "@/lib/playerLink";

export default async function FinalsMatchPage({
  params,
}: {
  // ✅ params が Promise の可能性に対応
  params: Promise<{ matchId: string }>;
}) {
  // ✅ unwrap
  const { matchId } = await params;

  if (!matchId) notFound();

  const doc = await fetchFinalsMatch(matchId);
  const m = doc.match;
  const r = doc.round;

  const status =
    m.status === "finished" ? "終了" :
    m.status === "live" ? "LIVE" :
    m.status === "scheduled" ? "予定" : "未実施";

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xl font-semibold tracking-tight">
            {m.label ?? m.matchId}
          </div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {r.label} / {m.tableLabel ?? "—"} / <span className={pillCls}>{status}</span>
          </div>
        </div>

        <Link href="/finals" className="text-sm underline text-zinc-600 dark:text-zinc-400">
          ← 決勝へ
        </Link>
      </div>

      <div className={`${cardCls} p-4`}>
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-sm font-semibold">対戦者</div>
          <span className={`${pillCls} text-xs`}>{m.matchId}</span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(m.seats ?? []).map((s) => {
            const name = s.displayName || s.nickname || s.source || "TBD";
            const href = playerHref(s.playerId ?? null, null, name);

            return (
              <div
                key={`${m.matchId}-${s.seat}`}
                className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/60 px-3 py-3 dark:border-white/10 dark:bg-zinc-950/20"
              >
                <div className="w-10 shrink-0 text-center font-mono text-sm text-zinc-600 dark:text-zinc-300">
                  {s.seat + 1}
                </div>

                <PlayerAvatar name={name} src={s.image ?? null} size={44} />

                <div className="min-w-0 flex-1">
                  {s.playerId ? (
                    <Link href={href} className="truncate font-semibold hover:underline">
                      {name}
                    </Link>
                  ) : (
                    <div className="truncate font-semibold text-zinc-700 dark:text-zinc-200">
                      {name}
                    </div>
                  )}
                  {s.source ? (
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                      出典: {s.source}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {m.gameUuid ? (
            <Link href={`/games/${encodeURIComponent(m.gameUuid)}`} className="underline">
              対局（{m.gameUuid}）を見る →
            </Link>
          ) : (
            <span className="text-sm text-zinc-500 dark:text-zinc-500">
              まだ対局UUIDが設定されていません
            </span>
          )}
        </div>
      </div>

      {m.status === "finished" && m.result ? (
        <div className={`${cardCls} p-4`}>
          <div className="text-sm font-semibold">結果</div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-black/5 dark:border-white/10">
                  <th className="py-2 pr-3">席</th>
                  <th className="py-2 pr-3">順位</th>
                  <th className="py-2 pr-3">素点</th>
                  <th className="py-2 pr-3">Δ</th>
                </tr>
              </thead>
              <tbody>
                {m.seats.map((s) => {
                  const seat = s.seat;
                  return (
                    <tr key={`res-${seat}`} className="border-b border-black/5 dark:border-white/10">
                      <td className="py-2 pr-3 font-mono">{seat + 1}</td>
                      <td className="py-2 pr-3">{m.result!.placeBySeat?.[seat] ?? "—"}</td>
                      <td className="py-2 pr-3 font-mono">{m.result!.finalScores?.[seat] ?? "—"}</td>
                      <td className="py-2 pr-3 font-mono">{m.result!.deltaBySeat?.[seat] ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

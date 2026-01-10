import Link from "next/link";
import { fetchPlayerSummary } from "@/lib/api";
import { cardCls, softBtnCls, pillCls } from "@/lib/ui";
import PlayerAvatar from "@/components/PlayerAvatar";

export default async function PlayerPage(props: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await props.params;

  let err = "";
  let data: Awaited<ReturnType<typeof fetchPlayerSummary>> | null = null;

  try {
    data = await fetchPlayerSummary(playerId);
  } catch (e: any) {
    err = e?.message ?? String(e);
  }

  if (err || !data) {
    return (
      <section>
        <Link className={softBtnCls} href="/players">← Back</Link>
        <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-100">
          {err || "Not found"}
        </div>
      </section>
    );
  }

  const p = data.profile;

  return (
    <section>
      <Link className={softBtnCls} href="/players">← Back</Link>

      <div className={`${cardCls} mt-6 p-4`}>
        <div className="flex items-center gap-3">
          <PlayerAvatar name={p.displayName} src={p.image ?? null} size={52} />
          <div className="min-w-0">
            <div className="truncate text-xl font-semibold">{p.displayName}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">{p.playerId}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(p.tags ?? []).map((t) => <span key={t} className={pillCls}>{t}</span>)}
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          nicknames: {data.nicknames.join(" / ")}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className={`${cardCls} p-4`}>
          <div className="text-lg font-semibold">Aggregate</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-black/5 bg-white/60 p-2 dark:border-white/10 dark:bg-zinc-950/20">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">games / rounds</div>
              <div className="font-mono">{data.aggregate.games} / {data.aggregate.rounds}</div>
            </div>
            <div className="rounded-xl border border-black/5 bg-white/60 p-2 dark:border-white/10 dark:bg-zinc-950/20">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Δ total</div>
              <div className="font-mono">{data.aggregate.deltaTotal >= 0 ? "+" : ""}{data.aggregate.deltaTotal}</div>
            </div>

            <div className="rounded-xl border border-black/5 bg-white/60 p-2 dark:border-white/10 dark:bg-zinc-950/20">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">hule / deal-in</div>
              <div className="font-mono">{data.aggregate.hule} / {data.aggregate.dealIn}</div>
            </div>
            <div className="rounded-xl border border-black/5 bg-white/60 p-2 dark:border-white/10 dark:bg-zinc-950/20">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">riichi / calls</div>
              <div className="font-mono">{data.aggregate.riichi} / {data.aggregate.calls}</div>
            </div>
          </div>
        </div>

        <div className={`${cardCls} p-4`}>
          <div className="text-lg font-semibold">Rates</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-black/5 bg-white/60 p-2 dark:border-white/10 dark:bg-zinc-950/20">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">huleRate</div>
              <div className="font-mono">{Math.round(data.rates.huleRate * 100)}%</div>
            </div>
            <div className="rounded-xl border border-black/5 bg-white/60 p-2 dark:border-white/10 dark:bg-zinc-950/20">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">dealInRate</div>
              <div className="font-mono">{Math.round(data.rates.dealInRate * 100)}%</div>
            </div>
            <div className="rounded-xl border border-black/5 bg-white/60 p-2 dark:border-white/10 dark:bg-zinc-950/20">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">riichiRate</div>
              <div className="font-mono">{Math.round(data.rates.riichiRate * 100)}%</div>
            </div>
            <div className="rounded-xl border border-black/5 bg-white/60 p-2 dark:border-white/10 dark:bg-zinc-950/20">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">top1Rate</div>
              <div className="font-mono">{Math.round(data.rates.top1Rate * 100)}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className={`${cardCls} mt-6 p-4`}>
        <div className="text-lg font-semibold">Recent games</div>
        <div className="mt-3 space-y-2">
          {data.recentGames.map((g) => (
            <Link
              key={g.uuid}
              href={`/games/${g.uuid}`}
              className="block rounded-xl border border-black/5 bg-white/60 p-3 text-sm hover:bg-white/80 dark:border-white/10 dark:bg-zinc-950/20 dark:hover:bg-zinc-900/60"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 truncate font-mono">{g.uuid}</div>
                <div className="shrink-0 font-mono">
                  {g.delta >= 0 ? "+" : ""}{g.delta}
                </div>
              </div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {new Date(g.startTime * 1000).toLocaleString()}
                {typeof g.place === "number" ? ` / place ${g.place}` : ""}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

import type { PlayerStat } from "@/lib/types";
import { cardCls } from "@/lib/ui";
import PlayerAvatar from "@/components/PlayerAvatar";
import Link from "next/link";

function pct(n: number, d: number) {
  if (!d) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

export default function PlayerStatsCard({ stats }: { stats: PlayerStat }) {
  const rounds = stats.rounds || 0;

  return (
    <div className={`${cardCls} p-4`}>
      <div className="flex items-center gap-3">
        <PlayerAvatar name={stats.displayName} src={stats.image ?? null} size={40} />
        <div className="min-w-0">
          <Link className="truncate font-semibold hover:underline" href={`/players/${stats.playerId}`}>
            {stats.displayName}
          </Link>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            {stats.nickname} / seat {stats.seat}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Δ total</div>
          <div className="font-mono text-base">{stats.deltaTotal >= 0 ? "+" : ""}{stats.deltaTotal}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl border border-black/5 bg-white/60 p-2 dark:border-white/10 dark:bg-zinc-950/20">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">和了</div>
          <div className="font-mono">{stats.hule} ({pct(stats.hule, rounds)})</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">ツモ {stats.tsumo} / ロン {stats.ron}</div>
        </div>

        <div className="rounded-xl border border-black/5 bg-white/60 p-2 dark:border-white/10 dark:bg-zinc-950/20">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">放銃</div>
          <div className="font-mono">{stats.dealIn} ({pct(stats.dealIn, rounds)})</div>
        </div>

        <div className="rounded-xl border border-black/5 bg-white/60 p-2 dark:border-white/10 dark:bg-zinc-950/20">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">立直</div>
          <div className="font-mono">{stats.riichi} ({pct(stats.riichi, rounds)})</div>
        </div>

        <div className="rounded-xl border border-black/5 bg-white/60 p-2 dark:border-white/10 dark:bg-zinc-950/20">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">鳴き</div>
          <div className="font-mono">{stats.calls}</div>
        </div>
      </div>
    </div>
  );
}

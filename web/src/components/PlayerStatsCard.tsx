// web/src/components/PlayerStatsCard.tsx
import { PlayerStats } from "@/lib/types";
import PlayerAvatar from "@/components/PlayerAvatar";
import { getAvatarUrl } from "@/assets/players";

function pct(n: number, d: number) {
  if (!d) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

export default function PlayerStatsCard({ stats }: { stats: PlayerStats }) {
  const rounds = stats.rounds || 0;

  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-900/60">
      <div className="flex items-center gap-3">
        <PlayerAvatar name={stats.nickname} src={getAvatarUrl(stats.nickname)} size={36} />
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">{stats.nickname}</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            rounds: {rounds}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {/* 以下は元のままでOK */}
        <div className="rounded-xl border border-black/5 bg-white/60 p-2 dark:border-white/10 dark:bg-zinc-950/20">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">和了</div>
          <div className="font-mono">
            {stats.hule} ({pct(stats.hule, rounds)})
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            ツモ {stats.tsumo} / ロン {stats.ron}
          </div>
        </div>

        <div className="rounded-xl border border-black/5 bg-white/60 p-2 dark:border-white/10 dark:bg-zinc-950/20">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">放銃</div>
          <div className="font-mono">
            {stats.dealIn} ({pct(stats.dealIn, rounds)})
          </div>
        </div>

        <div className="rounded-xl border border-black/5 bg-white/60 p-2 dark:border-white/10 dark:bg-zinc-950/20">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">立直</div>
          <div className="font-mono">
            {stats.riichi} ({pct(stats.riichi, rounds)})
          </div>
        </div>

        <div className="rounded-xl border border-black/5 bg-white/60 p-2 dark:border-white/10 dark:bg-zinc-950/20">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">鳴き</div>
          <div className="font-mono">{stats.calls}</div>
        </div>

        <div className="col-span-2 rounded-xl border border-black/5 bg-white/60 p-2 dark:border-white/10 dark:bg-zinc-950/20">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">収支（局増減の合計）</div>
          <div className="font-mono text-base">
            {stats.deltaTotal >= 0 ? "+" : ""}
            {stats.deltaTotal}
          </div>
        </div>
      </div>
    </div>
  );
}

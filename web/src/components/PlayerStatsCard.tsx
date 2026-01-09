// web/src/components/PlayerStatsCard.tsx
import { PlayerStats } from "@/lib/types";

function pct(n: number, d: number) {
  if (!d) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

export default function PlayerStatsCard({ stats }: { stats: PlayerStats }) {
  const rounds = stats.rounds || 0;
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="text-lg font-semibold">{stats.nickname}</div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl border p-2">
          <div className="opacity-70">和了</div>
          <div className="font-mono">
            {stats.hule} ({pct(stats.hule, rounds)})
          </div>
          <div className="opacity-70">
            ツモ {stats.tsumo} / ロン {stats.ron}
          </div>
        </div>

        <div className="rounded-xl border p-2">
          <div className="opacity-70">放銃</div>
          <div className="font-mono">
            {stats.dealIn} ({pct(stats.dealIn, rounds)})
          </div>
        </div>

        <div className="rounded-xl border p-2">
          <div className="opacity-70">立直</div>
          <div className="font-mono">
            {stats.riichi} ({pct(stats.riichi, rounds)})
          </div>
        </div>

        <div className="rounded-xl border p-2">
          <div className="opacity-70">鳴き</div>
          <div className="font-mono">{stats.calls}</div>
        </div>

        <div className="col-span-2 rounded-xl border p-2">
          <div className="opacity-70">収支（局増減の合計）</div>
          <div className="font-mono text-base">
            {stats.deltaTotal >= 0 ? "+" : ""}
            {stats.deltaTotal}
          </div>
        </div>
      </div>
    </div>
  );
}

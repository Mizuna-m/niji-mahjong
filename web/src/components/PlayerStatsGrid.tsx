import type { PlayerStat } from "@/lib/types";
import PlayerStatsCard from "@/components/PlayerStatsCard";

export default function PlayerStatsGrid({ stats }: { stats: PlayerStat[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {stats.map((s) => (
        <PlayerStatsCard key={s.playerId + ":" + s.seat} stats={s} />
      ))}
    </div>
  );
}

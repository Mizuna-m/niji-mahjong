import Link from "next/link";
import type { PlayerEnriched } from "@/lib/types";
import { pillCls } from "@/lib/ui";
import PlayerAvatar from "@/components/PlayerAvatar";

export default function PlayerPills({ players }: { players: PlayerEnriched[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {players.slice(0, 4).map((p) => (
        <Link
          key={`${p.playerId}-${p.nickname}`}
          href={`/players/${p.playerId}`}
          className={`${pillCls} gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800`}
          title={`${p.displayName} (${p.nickname})`}
        >
          <PlayerAvatar name={p.displayName} src={p.image ?? null} size={18} />
          <span className="max-w-[16rem] truncate">{p.displayName}</span>
          <span className="opacity-60">({p.nickname})</span>
        </Link>
      ))}
    </div>
  );
}

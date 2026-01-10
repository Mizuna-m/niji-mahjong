import Link from "next/link";
import type { PlayerPill } from "@/lib/types";
import { pillCls } from "@/lib/ui";
import PlayerAvatar from "@/components/PlayerAvatar";

export default function PlayerPills({ players }: { players: PlayerPill[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {players.slice(0, 4).map((p) => {
        const content = (
          <>
            <PlayerAvatar name={p.label} src={p.image ?? null} size={18} />
            <span className="max-w-[16rem] truncate">{p.label}</span>
          </>
        );

        const cls = `${pillCls} inline-flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800`;

        return p.playerId ? (
          <Link
            key={p.seat}
            href={`/players/${p.playerId}`}
            className={cls}
            title={p.label}
          >
            {content}
          </Link>
        ) : (
          <span key={p.seat} className={cls} title={p.label}>
            {content}
          </span>
        );
      })}
    </div>
  );
}

import Link from "next/link";
import type { PlayerPill } from "@/lib/types";
import PlayerAvatar from "@/components/PlayerAvatar";

export default function PlayersRow({ players }: { players: PlayerPill[] }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {players.slice(0, 4).map((p) => {
        const item = (
          <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-zinc-950/20">
            <PlayerAvatar name={p.label} src={p.image ?? null} size={36} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{p.label}</div>
              {/* サブ情報を出したい場合だけ。いまは出さない方針 */}
            </div>
          </div>
        );

        return p.playerId ? (
          <Link key={p.seat} href={`/players/${p.playerId}`} className="hover:opacity-90">
            {item}
          </Link>
        ) : (
          <div key={p.seat}>{item}</div>
        );
      })}
    </div>
  );
}

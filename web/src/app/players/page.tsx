import { fetchPlayers } from "@/lib/api";
import { cardCls, pillCls } from "@/lib/ui";
import Link from "next/link";
import PlayerAvatar from "@/components/PlayerAvatar";

export default async function PlayersPage() {
  const r = await fetchPlayers();
  const players = [...(r.players ?? [])].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "ja")
  );

  return (
    <section>
      <div className="text-lg font-semibold">Players</div>
      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        YAML overlay の displayName / image / tags を使用
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {players.map((p) => (
          <Link key={p.playerId} href={`/players/${p.playerId}`} className={`${cardCls} p-4 hover:bg-white/80 dark:hover:bg-zinc-900/80`}>
            <div className="flex items-center gap-3">
              <PlayerAvatar name={p.displayName} src={p.image ?? null} size={44} />
              <div className="min-w-0">
                <div className="truncate font-semibold">{p.displayName}</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">{p.playerId}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(p.tags ?? []).slice(0, 6).map((t) => (
                    <span key={t} className={pillCls}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

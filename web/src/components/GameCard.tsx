// web/src/components/GameCard.tsx
import Link from "next/link";
import { GamesListItem } from "@/lib/api";
import PlayerAvatar from "@/components/PlayerAvatar";
import { getAvatarUrl } from "@/assets/players";

function fmtTime(epochSec?: number) {
  if (!epochSec) return "";
  return new Date(epochSec * 1000).toLocaleString();
}

export default function GameCard({ game }: { game: GamesListItem }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-900/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            className="block truncate text-base font-semibold tracking-tight hover:underline"
            href={`/games/${game.uuid}`}
            title={game.uuid}
          >
            {game.uuid}
          </Link>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {fmtTime(game.startTime)}
          </div>
        </div>
 
        {Array.isArray(game.finalScores) && game.finalScores.length === 4 ? (
          <div className="shrink-0 rounded-xl border border-black/5 bg-white/60 px-3 py-2 text-right text-xs shadow-sm dark:border-white/10 dark:bg-zinc-950/30">
            <div className="text-zinc-500 dark:text-zinc-400">final</div>
            <div className="mt-1 font-mono text-sm text-zinc-900 dark:text-zinc-100">
              {game.finalScores.join(" / ")}
            </div>
          </div>
        ) : null}
      </div>

      {!!game.players?.length && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {game.players.slice(0, 4).map((p) => (
            <div
              key={p.nickname}
              className="flex items-center gap-2 rounded-xl border border-black/5 bg-white/60 px-2 py-2 text-sm dark:border-white/10 dark:bg-zinc-950/20"
            >
              <PlayerAvatar name={p.nickname} src={getAvatarUrl(p.nickname)} size={28} />
              <div className="min-w-0 truncate">{p.nickname}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

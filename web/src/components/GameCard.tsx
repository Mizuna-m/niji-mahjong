import Link from "next/link";
import type { GameListItem } from "@/lib/types";
import { cardCls, pillCls } from "@/lib/ui";
import PlayerPills from "@/components/PlayerPills";

function fmtTime(epochSec?: number) {
  if (!epochSec) return "";
  return new Date(epochSec * 1000).toLocaleString();
}

export default function GameCard({ game }: { game: GameListItem }) {
  const dur =
    game.startTime && game.endTime ? Math.max(0, game.endTime - game.startTime) : 0;

  return (
    <div className={`${cardCls} p-4`}>
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

          <div className="mt-2 flex flex-wrap gap-2">
            {game.table?.name ? <span className={pillCls}>{game.table.name}</span> : null}
            {dur ? <span className={pillCls}>duration {Math.round(dur / 60)}m</span> : null}
          </div>
        </div>

        {Array.isArray(game.finalScores) && game.finalScores.length === 4 ? (
          <div className="shrink-0 rounded-xl border border-black/5 bg-white/60 px-3 py-2 text-right text-xs shadow-sm dark:border-white/10 dark:bg-zinc-950/20">
            <div className="text-zinc-500 dark:text-zinc-400">final</div>
            <div className="mt-1 font-mono text-sm">{game.finalScores.join(" / ")}</div>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <PlayerPills players={game.players ?? []} />
      </div>
    </div>
  );
}

// web/src/components/GameCard.tsx
import Link from "next/link";
import { GamesListItem } from "@/lib/api";

function fmtTime(epochSec?: number) {
  if (!epochSec) return "";
  const d = new Date(epochSec * 1000);
  return d.toLocaleString();
}

function fmtPlayers(players?: { nickname: string }[]) {
  if (!players?.length) return "";
  return players.map((p) => p.nickname).join(" / ");
}

export default function GameCard({ game }: { game: GamesListItem }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            className="text-lg font-semibold underline"
            href={`/games/${game.uuid}`}
          >
            {game.uuid}
          </Link>
          <div className="mt-1 text-sm opacity-70">
            {fmtTime(game.startTime)}
          </div>
        </div>

        {Array.isArray(game.finalScores) && game.finalScores.length === 4 ? (
          <div className="text-right text-sm">
            <div className="opacity-70">final</div>
            <div className="font-mono">
              {game.finalScores.join(" / ")}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 text-sm">{fmtPlayers(game.players)}</div>
    </div>
  );
}

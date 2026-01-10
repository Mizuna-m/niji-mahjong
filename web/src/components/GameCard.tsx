import Link from "next/link";
import type { GameListItem, PlayerPill } from "@/lib/types";
import { cardCls, pillCls } from "@/lib/ui";
import { fmtJst, fmtDurationSec } from "@/lib/format";
import PlayersRow from "@/components/PlayersRow";

function getTableLabel(game: GameListItem) {
  const t: any = game.table;
  return t?.label ?? t?.name ?? "";
}

export default function GameCard({ game }: { game: GameListItem }) {
  const tableLabel = getTableLabel(game);
  const title = game.title ?? "";
  const note = (game.table as any)?.note as string | undefined;

  const durSec =
    game.startTime && game.endTime ? Math.max(0, game.endTime - game.startTime) : 0;

  const heading = title || tableLabel || "対局";

  const pillPlayers: PlayerPill[] = game.players.map((p) => ({
    seat: p.seat,
    label: p.displayName ?? p.nickname,
    playerId: p.playerId ?? undefined,
    image: p.image ?? null,
  }));

  return (
    <Link
      href={`/games/${game.uuid}`}
      className={`${cardCls} block p-5 hover:bg-white/80 dark:hover:bg-zinc-900/70`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold tracking-tight">
            {heading}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            {tableLabel && title ? <span className={pillCls}>{tableLabel}</span> : null}
            <span>{fmtJst(game.startTime)}</span>
            {durSec ? <span className={pillCls}>所要 {fmtDurationSec(durSec)}</span> : null}
            {note ? <span className={pillCls}>メモあり</span> : null}
          </div>
        </div>

        {Array.isArray(game.finalScores) && game.finalScores.length === 4 ? (
          <div className="shrink-0 rounded-2xl border border-black/5 bg-white/60 px-3 py-2 text-right text-xs shadow-sm dark:border-white/10 dark:bg-zinc-950/20">
            <div className="text-zinc-500 dark:text-zinc-400">最終スコア</div>
            <div className="mt-1 font-mono text-sm">{game.finalScores.join(" / ")}</div>
          </div>
        ) : null}
      </div>

      <PlayersRow players={pillPlayers} />

      {/* UUIDは見せない（必要なら詳細ページ下に） */}
    </Link>
  );
}

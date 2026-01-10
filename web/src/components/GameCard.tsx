import Link from "next/link";
import type { GameListItem, PlayerPill } from "@/lib/types";
import { cardCls, pillCls } from "@/lib/ui";
import { fmtJst, fmtDurationSec } from "@/lib/format";
import PlayersRow from "@/components/PlayersRow";

export default function GameCard({ game }: { game: GameListItem }) {
  const tableLabel = (game.table as any)?.label ?? (game.table as any)?.name ?? "";
  const note = (game.table as any)?.note as string | undefined;

  const durSec =
    game.startTime && game.endTime ? Math.max(0, game.endTime - game.startTime) : 0;

  const heading = tableLabel || "対局";
  const sticky = game.title; // ← 付箋用

  const pillPlayers: PlayerPill[] = game.players.map((p) => ({
    seat: p.seat,
    label: p.displayName ?? p.nickname,
    playerId: p.playerId ?? undefined,
    image: p.image ?? null,
  }));

  return (
    <div className={`${cardCls} relative p-5`}>
      {sticky ? (
        <div
          className="
            absolute -left-1 -top-2 z-10
            -rotate-3
            rounded border border-amber-200
            bg-amber-100 px-2.5 py-1
            text-xs font-semibold text-amber-900
            shadow-md
            dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-100
          "
          title={sticky}
        >
          {sticky}
        </div>
      ) : null}

      {/* ★ ここが重要：モバイルは縦積み */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href={`/games/${game.uuid}`}
            className="block truncate text-lg font-semibold tracking-tight hover:underline"
            title={heading}
          >
            {heading}
          </Link>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="whitespace-nowrap">{fmtJst(game.startTime)}</span>
            {durSec ? (
              <span className={pillCls}>所要 {fmtDurationSec(durSec)}</span>
            ) : null}
            {note ? <span className={pillCls}>メモあり</span> : null}
          </div>
        </div>

        {Array.isArray(game.finalScores) && game.finalScores.length === 4 ? (
          <Link
            href={`/games/${game.uuid}`}
            className="
              w-full rounded-2xl
              border border-black/5 bg-white/60
              px-3 py-2 text-left text-xs shadow-sm
              hover:opacity-90
              dark:border-white/10 dark:bg-zinc-950/20
              sm:w-auto sm:text-right
            "
            aria-label="対局詳細へ"
          >
            <div className="text-zinc-500 dark:text-zinc-400">最終スコア</div>

            {/* ★ モバイルで崩れやすいので “横スクロール許可” が安全 */}
            <div className="mt-1 overflow-x-auto font-mono text-sm whitespace-nowrap">
              {game.finalScores.join(" / ")}
            </div>
          </Link>
        ) : null}
      </div>

      <PlayersRow players={pillPlayers} />
    </div>
  );
}

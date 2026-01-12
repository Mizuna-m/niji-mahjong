// src/components/finals/FinalsBracketView.tsx
import Link from "next/link";
import type { FinalsBracketResponse, FinalsMatch, FinalsSeat } from "@/lib/typesTournament";
import { pillCls } from "@/lib/ui";
import PlayerAvatar from "@/components/PlayerAvatar";
import { playerHref } from "@/lib/playerLink";

function SeatRow({ s }: { s: FinalsSeat }) {
  const name = s.displayName || s.nickname || s.source || "TBD";
  const href = playerHref(s.playerId ?? null, null, name);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-black/5 bg-white/60 px-2 py-1.5 text-xs dark:border-white/10 dark:bg-zinc-950/20">
      <div className="w-6 shrink-0 text-center font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
        {s.seat + 1}
      </div>

      <PlayerAvatar name={name} src={s.image ?? null} size={28} />

      <div className="min-w-0 flex-1">
        {s.playerId ? (
          <Link href={href} className="truncate font-semibold hover:underline">
            {name}
          </Link>
        ) : (
          <div className="truncate font-semibold text-zinc-600 dark:text-zinc-300">
            {name}
          </div>
        )}
        {s.source ? (
          <div className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-500">
            {s.source}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResultBadge({ m }: { m: FinalsMatch }) {
  if (m.status !== "finished" || !m.result) return null;

  const ws = m.result.winnerSeat;
  const win = m.seats?.find((x) => x.seat === ws);
  const winName = win?.displayName || win?.nickname || `Seat${ws + 1}`;

  return (
    <span className={`${pillCls} text-xs`}>
      勝者: {winName}
    </span>
  );
}

function MatchCard({ m }: { m: FinalsMatch }) {
  const status =
    m.status === "finished" ? "終了" :
    m.status === "live" ? "LIVE" :
    m.status === "scheduled" ? "予定" : "未実施";

  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 p-3 shadow-sm dark:border-white/10 dark:bg-zinc-900/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/finals/matches/${encodeURIComponent(m.matchId)}`}
            className="block truncate text-sm font-semibold hover:underline"
            title={m.title ?? m.label ?? m.matchId}
          >
            {m.tableLabel ? `${m.tableLabel} ` : ""}{m.label ?? m.matchId}
          </Link>
          {m.title ? (
            <div className="mt-1 truncate text-xs text-zinc-600 dark:text-zinc-400">
              {m.title}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className={pillCls}>{status}</span>
          <ResultBadge m={m} />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {(m.seats ?? []).map((s) => (
          <SeatRow key={`${m.matchId}-${s.seat}`} s={s} />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        {m.gameUuid ? (
          <Link href={`/games/${encodeURIComponent(m.gameUuid)}`} className="underline text-zinc-600 dark:text-zinc-400">
            対局詳細へ
          </Link>
        ) : (
          <span className="text-zinc-500 dark:text-zinc-500">対局UUID未設定</span>
        )}

        <Link href={`/finals/matches/${encodeURIComponent(m.matchId)}`} className="underline">
          試合詳細 →
        </Link>
      </div>
    </div>
  );
}

export default function FinalsBracketView({ bracket }: { bracket: FinalsBracketResponse }) {
  // 横に長くなるので、モバイルは横スクロールを許可
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[880px]">
        <div className="grid gap-4 md:grid-cols-3">
          {bracket.rounds.map((r) => (
            <div key={r.roundId} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{r.label}</div>
                <span className={`${pillCls} text-xs`}>{r.roundId}</span>
              </div>

              <div className="space-y-3">
                {r.matches.map((m) => (
                  <MatchCard key={m.matchId} m={m} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

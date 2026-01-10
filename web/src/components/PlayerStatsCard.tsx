import type { PlayerStat } from "@/lib/types";
import { cardCls } from "@/lib/ui";
import PlayerAvatar from "@/components/PlayerAvatar";
import Link from "next/link";

function pct(n: number, d: number) {
  if (!d) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

function signed(n: number) {
  return `${n >= 0 ? "+" : ""}${n}`;
}

function deltaTone(n: number) {
  // 派手すぎない色味（明暗対応）
  if (n > 0) return "text-emerald-700 dark:text-emerald-300";
  if (n < 0) return "text-rose-700 dark:text-rose-300";
  return "text-zinc-700 dark:text-zinc-300";
}

function seatLabel(seat: number) {
  switch (seat) {
    case 0: return "東";
    case 1: return "南";
    case 2: return "西";
    case 3: return "北";
    default: return `席${seat}`;
  }
}

function statBox(title: string, value: React.ReactNode, sub?: React.ReactNode) {
  return (
    <div className="rounded-xl border border-black/5 bg-white/60 p-3 dark:border-white/10 dark:bg-zinc-950/20">
      <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{title}</div>
      <div className="mt-1 font-mono text-sm">{value}</div>
      {sub ? <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{sub}</div> : null}
    </div>
  );
}

export default function PlayerStatsCard({ stats }: { stats: PlayerStat }) {
  const rounds = stats.rounds || 0;

  return (
    <div className={`${cardCls} p-4`}>
      {/* ヘッダ：アイコンと名前が主役（アイコンごとリンク） */}
      <div className="flex items-center gap-3">
        <Link
          href={`/players/${stats.playerId}`}
          className="shrink-0 hover:opacity-90"
          aria-label={`${stats.displayName} の参加者ページへ`}
        >
          <PlayerAvatar name={stats.displayName} src={stats.image ?? null} size={60} />
        </Link>

        <div className="min-w-0">
          <Link
            className="block truncate text-base font-semibold hover:underline"
            href={`/players/${stats.playerId}`}
            title={stats.displayName}
          >
            {stats.displayName}
          </Link>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <span>{stats.nickname}</span>
            <span className="rounded-full border border-black/5 bg-white/60 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:border-white/10 dark:bg-zinc-950/20 dark:text-zinc-300">
              {seatLabel(stats.seat)}
            </span>
          </div>
        </div>

        {/* 収支：直感が効く表示 */}
        <div className="ml-auto text-right">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">この対局の収支</div>
          <div className={`font-mono text-lg font-semibold ${deltaTone(stats.deltaTotal)}`}>
            {signed(stats.deltaTotal)}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-500">
            {rounds ? `${rounds}局` : "—"}
          </div>
        </div>
      </div>

      {/* 指標：一般向けに「率」中心の言葉へ */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {statBox(
          "和了",
          <>
            {stats.hule} <span className="text-zinc-500 dark:text-zinc-500">（{pct(stats.hule, rounds)}）</span>
          </>,
          <>
            ツモ {stats.tsumo} / ロン {stats.ron}
          </>
        )}

        {statBox(
          "放銃",
          <>
            {stats.dealIn} <span className="text-zinc-500 dark:text-zinc-500">（{pct(stats.dealIn, rounds)}）</span>
          </>
        )}

        {statBox(
          "立直",
          <>
            {stats.riichi} <span className="text-zinc-500 dark:text-zinc-500">（{pct(stats.riichi, rounds)}）</span>
          </>
        )}

        {statBox("鳴き", <>{stats.calls}</>)}
      </div>
    </div>
  );
}

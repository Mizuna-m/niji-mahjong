// src/components/tournament/WildcardTable.tsx
import Link from "next/link";
import type { WildcardResponse } from "@/lib/typesTournament";
import { cardCls, pillCls } from "@/lib/ui";
import PlayerAvatar from "@/components/PlayerAvatar";
import { playerHref } from "@/lib/playerLink";

export default function WildcardTable({ data }: { data: WildcardResponse }) {
  const top = data.candidates.slice(0, Math.max(12, data.cutRank + 4));

  return (
    <div className={`${cardCls} p-4`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          ボーダー：{data.cutRank}位
          {data.cutPoints != null ? `（${data.cutPoints}点）` : ""}
        </div>
        <span className={pillCls}>素点順（1位除外）</span>
      </div>

      <div className="mt-3 space-y-2">
        {top.map((r) => {
          const href = playerHref(r.playerId ?? null, null, r.displayName);
          const inSlot = r.rank <= data.cutRank;

          return (
            <Link
              key={`${r.rank}-${href}`}
              href={href}
              className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/60 px-3 py-2 text-sm hover:bg-white/80 dark:border-white/10 dark:bg-zinc-950/20 dark:hover:bg-zinc-900/60"
            >
              <div className="w-10 shrink-0 text-center font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {r.rank}位
              </div>

              <PlayerAvatar name={r.displayName} src={r.image ?? null} size={42} />

              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{r.displayName}</div>
                <div className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                  {r.groupId ? `グループ ${r.groupId}` : "—"}
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-sm">{r.points}点</div>
                <div className="mt-0.5 text-xs">
                  {inSlot ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                      圏内
                    </span>
                  ) : (
                    <span className="text-zinc-500 dark:text-zinc-500">圏外</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

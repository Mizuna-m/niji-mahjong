// src/components/tournament/KpiCards.tsx
import type { TournamentKpiResponse } from "@/lib/typesTournament";
import { cardCls, pillCls } from "@/lib/ui";

export default function KpiCards({ kpi }: { kpi: TournamentKpiResponse }) {
  const cut = kpi.wildcardCut;

  return (
    <div className={`${cardCls} p-5`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">大会状況</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            消化試合：{kpi.gamesPlayed}{kpi.gamesTotal ? ` / ${kpi.gamesTotal}` : ""} 試合
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {typeof kpi.groupWinnersConfirmed === "number" ? (
              <span className={pillCls}>グループ1位確定：{kpi.groupWinnersConfirmed}人</span>
            ) : null}
            {typeof kpi.wildcardSlots === "number" ? (
              <span className={pillCls}>ワイルドカード枠：{kpi.wildcardSlots}人</span>
            ) : null}
          </div>
        </div>

        {cut ? (
          <div className="text-right">
            <div className="text-xs text-zinc-600 dark:text-zinc-400">ワイルドカード ボーダー</div>
            <div className="mt-1 text-lg font-semibold">
              {cut.rank}位：{cut.points}点
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {cut.displayName}
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-500 dark:text-zinc-500">
            ボーダー計算中
          </div>
        )}
      </div>
    </div>
  );
}

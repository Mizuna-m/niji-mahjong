// src/app/finals/page.tsx
import Link from "next/link";
import { fetchTournamentMeta, fetchTournamentKpi, fetchFinalsBracket, fetchFinalsMatches } from "@/lib/api";
import { cardCls, pillCls } from "@/lib/ui";
import FinalsBracketView from "@/components/finals/FinalsBracketView";
import FinalsMatchesTable from "@/components/finals/FinalsMatchesTable";

function fmtUpdatedAtJst(s?: string | null) {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

export default async function FinalsPage() {
  const [meta, kpi, bracket, matches] = await Promise.all([
    fetchTournamentMeta(),
    fetchTournamentKpi({ phase: "finals" }),
    fetchFinalsBracket(),
    fetchFinalsMatches(),
  ]);

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xl font-semibold tracking-tight">決勝トーナメント</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {meta.season} / 決勝（東風）
          </div>

          {bracket.updatedAt ? (
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
              更新: {fmtUpdatedAtJst(bracket.updatedAt)}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <span className={pillCls}>消化試合: {kpi.gamesPlayed}{kpi.gamesTotal ? ` / ${kpi.gamesTotal}` : ""}</span>
          <Link href="/" className="text-sm underline text-zinc-600 dark:text-zinc-400">
            ← 対局一覧へ
          </Link>
        </div>
      </div>

      {/* トーナメント図 */}
      <div className={`${cardCls} p-4`}>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div className="text-sm font-semibold">トーナメント表</div>
          <span className={`${pillCls} text-xs`}>/api/tournament/finals/bracket</span>
        </div>
        <FinalsBracketView bracket={bracket} />
      </div>

      {/* 試合一覧 */}
      <div className={`${cardCls} p-4`}>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div className="text-sm font-semibold">試合一覧</div>
          <span className={`${pillCls} text-xs`}>/api/tournament/finals/matches</span>
        </div>
        <FinalsMatchesTable data={matches} />
      </div>
    </section>
  );
}

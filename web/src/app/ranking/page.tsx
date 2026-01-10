// src/app/ranking/page.tsx
import Link from "next/link";
import { fetchTournamentMeta, fetchTournamentKpi, fetchQualifierGroups, fetchQualifierWildcards, fetchQualifierWinners } from "@/lib/api";
import { cardCls, pillCls } from "@/lib/ui";
import PlayerAvatar from "@/components/PlayerAvatar";
import { fmtJst } from "@/lib/format";

function tonePts(n: number) {
  if (n >= 40000) return "text-emerald-700 dark:text-emerald-300";
  if (n >= 35000) return "text-sky-700 dark:text-sky-300";
  return "text-zinc-700 dark:text-zinc-300";
}

export default async function RankingPage() {
  const [meta, kpi, groups, wild, winnersRes] = await Promise.all([
    fetchTournamentMeta(),
    fetchTournamentKpi({ phase: "qualifier" }),
    fetchQualifierGroups(),
    fetchQualifierWildcards(),
    fetchQualifierWinners(),
  ]);

  const winners = winnersRes?.winners ?? [];

  return (
    <section>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xl font-semibold tracking-tight">予選状況</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {meta.season} / 予選（東風）・ワイルドカード {meta.qualifier.wildcardSlots}枠
          </div>
        </div>

        <Link href="/" className="text-sm underline text-zinc-600 dark:text-zinc-400">
          ← 対局一覧へ
        </Link>
      </div>

      {/* KPI */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className={`${cardCls} p-4`}>
          <div className="text-sm font-semibold">進捗</div>
          <div className="mt-2 text-3xl font-semibold">
            {kpi.gamesPlayed}
            <span className="ml-2 text-sm font-normal text-zinc-600 dark:text-zinc-400">
              / {kpi.gamesTotal ?? "—"} 卓
            </span>
          </div>
          <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
            取り込み済み対局数（予選）
          </div>
        </div>

        <div className={`${cardCls} p-4`}>
          <div className="text-sm font-semibold">グループ数</div>
          <div className="mt-2 text-3xl font-semibold">
            {meta.qualifier.groups}
            <span className="ml-2 text-sm font-normal text-zinc-600 dark:text-zinc-400">
              グループ
            </span>
          </div>
          <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
            各グループ1位が通過
          </div>
        </div>

        <div className={`${cardCls} p-4`}>
          <div className="text-sm font-semibold">ワイルドカード</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold">{meta.qualifier.wildcardSlots}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">枠</div>
          </div>

          {kpi.wildcardCut ? (
            <div className="mt-3 rounded-xl border border-black/5 bg-white/60 p-3 text-sm dark:border-white/10 dark:bg-zinc-950/20">
              <div className="text-xs text-zinc-600 dark:text-zinc-400">現在のボーダー（暫定）</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="truncate font-medium">{kpi.wildcardCut.displayName}</div>
                <div className={`font-mono ${tonePts(kpi.wildcardCut.points)}`}>{kpi.wildcardCut.points}</div>
              </div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                {kpi.wildcardCut.rank}位ライン
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
              まだボーダー算出前
            </div>
          )}
        </div>
      </div>
      {/* 通過者（各グループ1位） */}
      <div className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-lg font-semibold">予選通過者（各グループ1位）</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-500">
            {winners.length} / {meta.qualifier.groups} グループ
          </div>
        </div>

        <div className={`${cardCls} mt-3 p-2 sm:p-3`}>
          {winners.length ? (
            <ul className="divide-y divide-black/5 dark:divide-white/10">
              {winners.map((w) => {
                const win = w.winner;
                const pts = typeof win.points === "number" ? win.points : null;
                const heading = w.tableLabel || w.title || `グループ${w.groupId}`;
                const opp = (w.opponents ?? []).map((o) => o.displayName).filter(Boolean);

                return (
                  <li key={w.groupId} className="p-2 sm:p-3">
                    <div className="flex items-center justify-between gap-3">
                      {/* 左：グループ + 参加者 */}
                      <div className="min-w-0 flex items-center gap-3">
                        <span className={`${pillCls} shrink-0`}>G{w.groupId}</span>

                        {win.playerId ? (
                          <Link
                            href={`/players/${win.playerId}`}
                            className="min-w-0 inline-flex items-center gap-3 hover:opacity-95"
                          >
                            <PlayerAvatar name={win.displayName} src={win.image ?? null} size={44} />
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{win.displayName}</div>
                              <div className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                                {heading}
                              </div>
                            </div>
                          </Link>
                        ) : (
                          <div className="min-w-0 inline-flex items-center gap-3">
                            <PlayerAvatar name={win.displayName} src={win.image ?? null} size={44} />
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{win.displayName}</div>
                              <div className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                                {heading}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 右：素点 + 対局リンク（あれば） */}
                      <div className="shrink-0 flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-500">素点</div>
                          <div
                            className={`font-mono text-lg font-semibold ${
                              pts != null ? tonePts(pts) : "text-zinc-700 dark:text-zinc-300"
                            }`}
                          >
                            {pts ?? "—"}
                          </div>
                        </div>

                        {w.gameUuid ? (
                          <Link
                            href={`/games/${w.gameUuid}`}
                            className="shrink-0 rounded-xl border border-black/5 bg-white/60 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-white/80 dark:border-white/10 dark:bg-zinc-950/20 dark:text-zinc-200 dark:hover:bg-zinc-900/50"
                            title="対局を見る"
                          >
                            対局 →
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    {/* 詳細（うるさくなりがちな情報は折りたたみ） */}
                    {(w.startTime || opp.length || typeof win.delta === "number" || w.gameUuid) ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer select-none text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300">
                          詳細
                        </summary>

                        <div className="mt-2 grid gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                          {w.startTime ? <div>開始：{fmtJst(w.startTime)}</div> : null}
                          {typeof win.delta === "number" ? (
                            <div className="font-mono">
                              Δ {win.delta >= 0 ? "+" : ""}
                              {win.delta}
                            </div>
                          ) : null}
                          {opp.length ? <div>対戦：{opp.join(" / ")}</div> : null}
                          {/* UUIDは完全に不要ならこの行ごと削除でOK */}
                          {w.gameUuid ? (
                            <div className="font-mono opacity-70">{w.gameUuid}</div>
                          ) : null}
                        </div>
                      </details>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-3 text-sm text-zinc-600 dark:text-zinc-400">
              まだ通過者が確定していません。
            </div>
          )}
        </div>
      </div>
      {/* グループ一覧 */}
      <div className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-lg font-semibold">予選グループ</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-500">
            クリックでグループ順位へ
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {groups.map((g) => (
            <Link
              key={g.groupId}
              href={`/ranking/groups/${g.groupId}`}
              className={`${cardCls} p-4 hover:bg-white/80 dark:hover:bg-zinc-900/70`}
            >
              <div className="text-sm text-zinc-600 dark:text-zinc-400">グループ</div>
              <div className="mt-1 text-lg font-semibold">{g.label}</div>
              <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                {g.groupId}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ワイルドカード */}
      <div className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-lg font-semibold">ワイルドカード（暫定）</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-500">
            1位通過者は除外 / 素点（最終点）で比較
          </div>
        </div>

        <div className={`${cardCls} mt-3 overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/5 bg-white/40 text-xs text-zinc-600 dark:border-white/10 dark:bg-zinc-950/20 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">順位</th>
                  <th className="px-4 py-3">参加者</th>
                  <th className="px-4 py-3">グループ</th>
                  <th className="px-4 py-3 text-right">素点</th>
                  <th className="px-4 py-3">対局</th>
                </tr>
              </thead>
              <tbody>
                {wild.candidates.map((c) => {
                  const isCut = c.rank === wild.cutRank;
                  return (
                    <tr key={`${c.rank}-${c.displayName}`} className={`border-b border-black/5 last:border-b-0 dark:border-white/10 ${isCut ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}`}>
                      <td className="px-4 py-2 font-mono">{c.rank}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <PlayerAvatar name={c.displayName} src={c.image ?? null} size={48} />
                          <div className="min-w-0">
                            {c.playerId ? (
                              <Link href={`/players/${c.playerId}`} className="truncate font-semibold hover:underline">
                                {c.displayName}
                              </Link>
                            ) : (
                              <div className="truncate font-semibold">{c.displayName}</div>
                            )}
                            {isCut ? <span className={`${pillCls} mt-1 inline-flex`}>ボーダー</span> : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {c.groupId ? <span className={pillCls}>{c.groupId}</span> : <span className="text-zinc-500">—</span>}
                      </td>
                      <td className={`px-4 py-2 text-right font-mono font-semibold ${tonePts(c.points)}`}>
                        {c.points}
                      </td>
                      <td className="px-4 py-2">
                        {c.gameUuid ? (
                          <Link href={`/games/${c.gameUuid}`} className="text-xs underline text-zinc-600 dark:text-zinc-400">
                            対局を見る
                          </Link>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-black/5 p-4 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-500">
            ボーダー：{wild.cutRank}位（{wild.cutPoints ?? "—"}点）
          </div>
        </div>
      </div>
    </section>
  );
}

// src/app/ranking/groups/[groupId]/page.tsx
import Link from "next/link";
import { fetchQualifierGroupStandings } from "@/lib/api";
import { cardCls, pillCls, softBtnCls } from "@/lib/ui";
import PlayerAvatar from "@/components/PlayerAvatar";
import { fmtJst } from "@/lib/format";

function placeBadge(place?: number | null) {
  if (!place) return null;
  const tone =
    place === 1
      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100"
      : place === 2
      ? "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-100"
      : "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{place}位</span>;
}

export default async function GroupPage(props: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await props.params;

  let err = "";
  let data: Awaited<ReturnType<typeof fetchQualifierGroupStandings>> | null = null;

  try {
    data = await fetchQualifierGroupStandings(undefined, groupId);
  } catch (e: any) {
    err = e?.message ?? String(e);
  }

  if (!data || err) {
    return (
      <section>
        <Link className={softBtnCls} href="/ranking">← ランキングへ</Link>
        <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-100">
          読み込みに失敗しました。
          <div className="mt-2 text-xs opacity-80">{err || "Not found"}</div>
        </div>
      </section>
    );
  }

  const table = data.tables?.[0];

  return (
    <section>
      <Link className={softBtnCls} href="/ranking">← ランキングへ</Link>

      <div className="mt-4">
        <div className="text-xl font-semibold tracking-tight">予選グループ {data.groupId}</div>
        {table?.tableLabel || table?.title ? (
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            {table.tableLabel ? <span className={pillCls}>{table.tableLabel}</span> : null}
            {table.title ? <span className={pillCls}>{table.title}</span> : null}
            {table.startTime ? <span>{fmtJst(table.startTime)}</span> : null}
            <span className="opacity-70">（予選は東風1回）</span>
          </div>
        ) : null}
      </div>

      {/* 対局リンク */}
      {table?.gameUuid ? (
        <div className="mt-4">
          <Link href={`/games/${table.gameUuid}`} className="text-sm underline text-zinc-700 dark:text-zinc-300">
            この対局の詳細を見る →
          </Link>
        </div>
      ) : null}

      {/* standings */}
      <div className={`${cardCls} mt-6 overflow-hidden`}>
        <div className="border-b border-black/5 bg-white/40 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-zinc-950/20">
          順位（素点）
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 text-xs text-zinc-600 dark:border-white/10 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">参加者</th>
                <th className="px-4 py-3">結果</th>
                <th className="px-4 py-3 text-right">素点</th>
                <th className="px-4 py-3">通過</th>
              </tr>
            </thead>
            <tbody>
              {data.standings.map((r) => (
                <tr key={r.displayName} className="border-b border-black/5 last:border-b-0 dark:border-white/10">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <PlayerAvatar name={r.displayName} src={r.image ?? null} size={44} />
                      <div className="min-w-0">
                        {r.playerId ? (
                          <Link href={`/players/${r.playerId}`} className="truncate font-semibold hover:underline">
                            {r.displayName}
                          </Link>
                        ) : (
                          <div className="truncate font-semibold">{r.displayName}</div>
                        )}
                        <div className="mt-1">{placeBadge(r.place)}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {r.isWinner ? <span className={`${pillCls} bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100`}>グループ1位</span> : <span className="text-zinc-500">—</span>}
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-base font-semibold">
                    {r.tournamentPoints}
                  </td>

                  <td className="px-4 py-3">
                    {r.qualified ? <span className={`${pillCls} bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100`}>確定</span> : <span className="text-zinc-500">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-black/5 px-4 py-3 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-500">
          同点の場合：席順（seatが小さい方）を上位とする
        </div>
      </div>
    </section>
  );
}

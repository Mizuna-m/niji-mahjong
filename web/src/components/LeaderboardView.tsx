"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchLeaderboard } from "@/lib/api";
import type { LeaderboardMetric, LeaderboardResponse } from "@/lib/types";
import { cardCls, softBtnCls, pillCls } from "@/lib/ui";
import PlayerAvatar from "@/components/PlayerAvatar";
import Link from "next/link";

const METRICS: { key: LeaderboardMetric; label: string }[] = [
  { key: "kan", label: "カン回数" }, // ★追加
  { key: "deltaTotal", label: "通算収支" },
  { key: "top1", label: "1位回数" },
  { key: "hule", label: "和了" },
  { key: "dealIn", label: "放銃" },
  { key: "riichi", label: "立直" },
  { key: "calls", label: "鳴き" },
  { key: "rounds", label: "局数" },
];

function toneByValue(metric: LeaderboardMetric, v: number) {
  if (metric === "deltaTotal") {
    if (v > 0) return "text-emerald-700 dark:text-emerald-300";
    if (v < 0) return "text-rose-700 dark:text-rose-300";
  }
  return "text-zinc-900 dark:text-zinc-100";
}

export default function LeaderboardView() {
  const [metric, setMetric] = useState<LeaderboardMetric>("kan"); // ★初期値を"kan"に変更
  const [limit, setLimit] = useState(50);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [err, setErr] = useState("");

  const metricLabel = useMemo(() => {
    const m = METRICS.find((x) => x.key === metric);
    return m?.label ?? metric;
  }, [metric]);

  async function load() {
    try {
      setErr("");
      setData(await fetchLeaderboard(metric, limit));
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, limit]);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xl font-semibold tracking-tight">ランキング</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            カンはしろ！！！！！！
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
            value={metric}
            onChange={(e) => setMetric(e.target.value as LeaderboardMetric)}
            aria-label="指標"
          >
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            aria-label="表示件数"
          >
            {[10, 20, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n}件
              </option>
            ))}
          </select>

          <button className={softBtnCls} onClick={load}>
            更新
          </button>
        </div>
      </div>

      {err ? (
        <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-100">
          {err}
        </div>
      ) : null}

      <div className={`${cardCls} mt-6 overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 border-b border-black/5 bg-white/40 px-4 py-3 dark:border-white/10 dark:bg-zinc-950/20">
          <div className="min-w-0">
            <div className="truncate text-sm text-zinc-600 dark:text-zinc-400">指標</div>
            <div className="truncate text-lg font-semibold">{data?.metricLabel ?? metricLabel}</div>
          </div>
          <div className="shrink-0">
            <span className={pillCls}>上位 {limit} 件</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 text-xs text-zinc-600 dark:border-white/10 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">順位</th>
                <th className="px-4 py-3">参加者</th>
                <th className="px-4 py-3 text-right">{data?.metricLabel ?? metricLabel}</th>
                <th className="px-4 py-3 text-right">対局</th>
              </tr>
            </thead>

            <tbody>
              {(data?.leaderboard ?? []).map((r) => {
                const key = `${r.rank}-${r.playerId ?? "anon"}-${r.displayName}`;
                const valueCls = toneByValue(metric, r.value);

                const playerCell = (
                  <div className="inline-flex items-center gap-3">
                    <PlayerAvatar name={r.displayName} src={r.image ?? null} size={34} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{r.displayName}</div>
                      {!r.playerId && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-500">
                          （未登録）
                        </div>
                      )}
                    </div>
                  </div>
                );

                return (
                  <tr
                    key={key}
                    className="border-b border-black/5 last:border-b-0 hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.05]"
                  >
                    <td className="px-4 py-3 font-mono">{r.rank}</td>

                    <td className="px-4 py-3">
                      {r.playerId ? (
                        <Link className="hover:underline" href={`/players/${r.playerId}`}>
                          {playerCell}
                        </Link>
                      ) : (
                        playerCell
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className={`font-mono text-base font-semibold ${valueCls}`}>{r.value}</div>
                    </td>

                    <td className="px-4 py-3 text-right font-mono">
                      {r.games ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </section>
  );
}

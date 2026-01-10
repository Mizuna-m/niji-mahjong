"use client";

import { useEffect, useState } from "react";
import { fetchLeaderboard } from "@/lib/api";
import type { LeaderboardMetric, LeaderboardResponse } from "@/lib/types";
import { cardCls, softBtnCls } from "@/lib/ui";
import PlayerAvatar from "@/components/PlayerAvatar";
import Link from "next/link";

const METRICS: { key: LeaderboardMetric; label: string }[] = [
  { key: "deltaTotal", label: "Δ total" },
  { key: "hule", label: "和了" },
  { key: "dealIn", label: "放銃" },
  { key: "riichi", label: "立直" },
  { key: "calls", label: "鳴き" },
  { key: "rounds", label: "局数" },
  { key: "top1", label: "1位回数" },
];

export default function LeaderboardView() {
  const [metric, setMetric] = useState<LeaderboardMetric>("deltaTotal");
  const [limit, setLimit] = useState(50);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [err, setErr] = useState("");

  async function load() {
    try {
      setErr("");
      setData(await fetchLeaderboard(metric, limit));
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [metric, limit]);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Leaderboard</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            metric / limit をクエリで計算する新APIをそのまま利用
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
            value={metric}
            onChange={(e) => setMetric(e.target.value as LeaderboardMetric)}
          >
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>

          <select
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {[10, 20, 50, 100, 200].map((n) => (
              <option key={n} value={n}>{n} rows</option>
            ))}
          </select>

          <button className={softBtnCls} onClick={load}>Reload</button>
        </div>
      </div>

      {err ? (
        <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-100">
          {err}
        </div>
      ) : null}

      <div className={`${cardCls} mt-6 overflow-x-auto p-4`}>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {data ? `${data.metricLabel} (${data.metric})` : "Loading..."}
        </div>

        <table className="mt-3 w-full text-left text-sm">
          <thead className="border-b border-black/5 text-xs text-zinc-600 dark:border-white/10 dark:text-zinc-400">
            <tr>
              <th className="py-2 pr-3">rank</th>
              <th className="py-2 pr-3">player</th>
              <th className="py-2 pr-3">value</th>
              <th className="py-2 pr-3">games</th>
            </tr>
          </thead>
          <tbody>
            {(data?.leaderboard ?? []).map((r) => (
              <tr
                key={r.playerId}
                className="border-b border-black/5 odd:bg-black/[0.02] hover:bg-black/[0.04] dark:border-white/10 dark:odd:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              >
                <td className="py-2 pr-3 font-mono">{r.rank}</td>
                <td className="py-2 pr-3">
                  <Link className="inline-flex items-center gap-2 hover:underline" href={`/players/${r.playerId}`}>
                    <PlayerAvatar name={r.displayName} src={r.image ?? null} size={22} />
                    <span className="truncate">{r.displayName}</span>
                  </Link>
                </td>
                <td className="py-2 pr-3 font-mono">{r.value}</td>
                <td className="py-2 pr-3 font-mono">{r.games}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

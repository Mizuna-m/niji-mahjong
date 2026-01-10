"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCumulative } from "@/lib/api";
import type { CumulativeResponse } from "@/lib/types";
import { cardCls, softBtnCls } from "@/lib/ui";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function CumulativeView() {
  const [limitGames, setLimitGames] = useState(2000);
  const [data, setData] = useState<CumulativeResponse | null>(null);
  const [err, setErr] = useState("");

  async function load() {
    try {
      setErr("");
      setData(await fetchCumulative(limitGames));
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [limitGames]);

  const chartData = useMemo(() => {
    if (!data) return [];
    // 1点 = gameIndex ごとの全員値（seriesを横持ち）
    const rows: any[] = data.games.map((g, idx) => ({
      gameIndex: idx,
      label: new Date(g.startTime * 1000).toLocaleString(),
    }));

    for (const s of data.series) {
      for (const pt of s.points) {
        if (!rows[pt.gameIndex]) continue;
        rows[pt.gameIndex][s.displayName] = pt.value;
      }
    }
    return rows;
  }, [data]);

  const seriesKeys = useMemo(() => {
    if (!data) return [];
    return data.series.map((s) => s.displayName);
  }, [data]);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Cumulative</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            /api/stats/cumulative（ゲーム順）を折れ線で表示
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
            value={limitGames}
            onChange={(e) => setLimitGames(Number(e.target.value))}
          >
            {[200, 500, 1000, 2000, 5000].map((n) => (
              <option key={n} value={n}>{n} games</option>
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

      <div className={`${cardCls} mt-6 p-4`}>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {data ? `${data.games.length} games / ${data.series.length} players` : "Loading..."}
        </div>

        <div className="mt-4 h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="gameIndex" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {seriesKeys.map((k) => (
                <Line key={k} type="monotone" dataKey={k} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

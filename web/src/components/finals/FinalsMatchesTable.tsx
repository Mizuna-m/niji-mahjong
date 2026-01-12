// src/components/finals/FinalsMatchesTable.tsx
import Link from "next/link";
import type { FinalsMatchesResponse } from "@/lib/typesTournament";
import { pillCls } from "@/lib/ui";
import { fmtJst } from "@/lib/format";

function statusLabel(s: string) {
  if (s === "finished") return "終了";
  if (s === "live") return "LIVE";
  if (s === "scheduled") return "予定";
  return "未実施";
}

export default function FinalsMatchesTable({ data }: { data: FinalsMatchesResponse }) {
  const rows = [...(data.matches ?? [])];

  // 表示の安定性: round→tableLabel→matchId
  rows.sort((a, b) => {
    const ra = `${a.roundId}-${a.tableLabel ?? ""}-${a.matchId}`;
    const rb = `${b.roundId}-${b.tableLabel ?? ""}-${b.matchId}`;
    return ra.localeCompare(rb, "ja");
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-zinc-600 dark:text-zinc-400">
          <tr className="border-b border-black/5 dark:border-white/10">
            <th className="py-2 pr-3">ラウンド</th>
            <th className="py-2 pr-3">試合</th>
            <th className="py-2 pr-3">状態</th>
            <th className="py-2 pr-3">開始</th>
            <th className="py-2 pr-3">UUID</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.matchId} className="border-b border-black/5 dark:border-white/10">
              <td className="py-2 pr-3">
                <div className="font-semibold">{m.roundLabel}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-500">{m.roundId}</div>
              </td>

              <td className="py-2 pr-3">
                <Link href={`/finals/matches/${encodeURIComponent(m.matchId)}`} className="font-semibold hover:underline">
                  {m.tableLabel ? `${m.tableLabel} ` : ""}{m.label ?? m.matchId}
                </Link>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                  {m.matchId}
                </div>
              </td>

              <td className="py-2 pr-3">
                <span className={pillCls}>{statusLabel(m.status)}</span>
              </td>

              <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                {m.startTime ? fmtJst(m.startTime) : "—"}
              </td>

              <td className="py-2 pr-3">
                {m.gameUuid ? (
                  <Link href={`/games/${encodeURIComponent(m.gameUuid)}`} className="underline">
                    {m.gameUuid}
                  </Link>
                ) : (
                  <span className="text-zinc-500 dark:text-zinc-500">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!rows.length ? (
        <div className="mt-4 rounded-2xl border border-black/5 bg-white/60 p-4 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-950/20 dark:text-zinc-400">
          試合が見つかりませんでした。
        </div>
      ) : null}
    </div>
  );
}

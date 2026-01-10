"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import GameCard from "@/components/GameCard";
import { API_BASE_PUBLIC, fetchGames } from "@/lib/api";
import type { GameListItem } from "@/lib/types";
import { softBtnCls } from "@/lib/ui";

export default function GameList() {
  const [games, setGames] = useState<GameListItem[]>([]);
  const [err, setErr] = useState<string>("");

  const sorted = useMemo(() => {
    const copy = [...games];
    copy.sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0));
    return copy;
  }, [games]);

  async function reload() {
    try {
      setErr("");
      const r = await fetchGames(API_BASE_PUBLIC);
      setGames(r.games ?? []);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // SSE: backend `/api/stream`
    // 仕様のイベント名が変わっても「何か来たらreload」で堅牢に運用
    const es = new EventSource(`${API_BASE_PUBLIC}/api/stream`);
    es.onmessage = () => reload();
    es.onerror = () => {
      // SSEが落ちてもUIは維持（必要ならリトライ/トースト化）
      es.close();
    };
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">対局一覧</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            自動更新中
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {sorted.length} 件
          </div>
          <button className={softBtnCls} onClick={reload}>
            再読み込み
          </button>
        </div>
      </div>

      {err ? (
        <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-100">
          {err}
          <div className="mt-2 text-xs opacity-80">
            SSEが落ちている/ Tailwind未適用などの場合は、layout と postcss を確認してください。
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {sorted.map((g) => (
          <GameCard key={g.uuid} game={g} />
        ))}
      </div>

      {!sorted.length && !err ? (
        <div className="mt-6 rounded-2xl border border-black/5 bg-white/70 p-6 text-sm text-zinc-600 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-400">
          No games.
        </div>
      ) : null}

      <div className="mt-6 text-xs text-zinc-500 dark:text-zinc-500">
        ヒント：プレイヤー詳細は <Link className="underline" href="/players">Players</Link> から。
      </div>
    </section>
  );
}

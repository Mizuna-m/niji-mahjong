"use client";

import { useEffect, useMemo, useState } from "react";
import GameCard from "@/components/GameCard";
import { fetchGames } from "@/lib/api";
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
      // ★ Clientでは相対URLに寄せる（rewrites を効かせる）
      const r = await fetchGames("");
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
    // ★ SSEも相対URL（rewrites経由で api:3000 へ）
    const es = new EventSource("/api/stream");
    es.onmessage = () => reload();
    es.onerror = () => {
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
            内部エラーが発生しました。時間をおいて「再読み込み」してください。
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {sorted.map((g) => (
          <GameCard key={g.uuid} game={g} />
        ))}
      </div>

      {!sorted.length && !err ? (
        <div className="mt-6 rounded-2xl border border-black/5 bg-white/70 p-6 text-sm text-zinc-600 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-400">
          対局データが見つかりませんでした。
        </div>
      ) : null}
    </section>
  );
}

// web/src/app/page.tsx
import Link from "next/link";
import GameCard from "@/components/GameCard";
import { API_BASE_INTERNAL, API_BASE_PUBLIC, fetchGames } from "@/lib/api";

export default async function HomePage() {
  let games: any[] = [];
  let err = "";

  try {
    games = await fetchGames(API_BASE_INTERNAL);
  } catch (e: any) {
    err = e?.message ?? String(e);
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-950">
      <div className="mx-auto max-w-5xl p-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold tracking-tight">
              にじさんじ麻雀杯（作業用）ログ
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              解析済みの対局を一覧表示します
            </div>

            <details className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
              <summary className="cursor-pointer select-none">接続先</summary>
              <div className="mt-2 space-y-1">
                <div>API(public): {API_BASE_PUBLIC}</div>
                <div>API(internal): {API_BASE_INTERNAL}</div>
              </div>
            </details>
          </div>

          <Link
            className="inline-flex items-center rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            href="/"
          >
            Reload
          </Link>
        </header>

        {err ? (
          <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-100">
            {err}
          </div>
        ) : null}

        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between">
            <div className="text-lg font-semibold">Games</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {games.length} 件
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {games.map((g) => (
              <GameCard key={g.uuid} game={g} />
            ))}
          </div>

          {!games.length && !err ? (
            <div className="mt-4 rounded-2xl border border-black/5 bg-white/70 p-6 text-sm text-zinc-600 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-400">
              No games.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

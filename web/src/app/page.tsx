// web/src/app/page.tsx
import Link from "next/link";
import GameCard from "@/components/GameCard";
import { API_BASE_INTERNAL, API_BASE_PUBLIC, fetchGames } from "@/lib/api";

// これが Server Component なので、API は "内部URL" で叩ける
export default async function HomePage() {
  let games: any[] = [];
  let err = "";

  try {
    games = await fetchGames(API_BASE_INTERNAL);
  } catch (e: any) {
    err = e?.message ?? String(e);
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">niji-mahjong web</div>
          <div className="mt-1 text-sm opacity-70">
            API(public): {API_BASE_PUBLIC}
          </div>
          <div className="mt-1 text-sm opacity-70">
            API(internal): {API_BASE_INTERNAL}
          </div>
        </div>

        {/* 手動更新は一旦これでOK（ライブ更新は次に追加） */}
        <Link className="rounded-xl border px-3 py-2 text-sm shadow-sm" href="/">
          Reload
        </Link>
      </div>

      {err ? (
        <div className="mt-4 rounded-xl border border-red-300 p-3 text-sm">
          {err}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4">
        {games.map((g) => (
          <GameCard key={g.uuid} game={g} />
        ))}

        {!games.length && !err ? (
          <div className="rounded-2xl border p-6 text-sm opacity-70">
            No games.
          </div>
        ) : null}
      </div>
    </main>
  );
}

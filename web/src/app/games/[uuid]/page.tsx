import { API_BASE_INTERNAL } from "@/lib/api";
import type { GameDetailResponse } from "@/lib/types";
import PlayerStatsCard from "@/components/PlayerStatsCard";
import GameDetailHeader from "@/components/GameDetailHeader";
import RoundsTableFriendly from "@/components/RoundsTableFriendly";

async function fetchGameServer(uuid: string) {
  const res = await fetch(`${API_BASE_INTERNAL}/api/games/${uuid}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchGame failed: ${res.status}`);
  return (await res.json()) as GameDetailResponse;
}

export default async function GameDetailPage(
  props: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await props.params;

  let doc: GameDetailResponse | null = null;
  let err = "";

  try {
    doc = await fetchGameServer(uuid);
  } catch (e: any) {
    err = e?.message ?? String(e);
  }

  const game = doc?.derived ?? null;

  return (
    <main className="mx-auto max-w-5xl p-6">
      {err ? (
        <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-100">
          読み込みに失敗しました。時間をおいて再度お試しください。
          <div className="mt-2 text-xs opacity-80">{err}</div>
        </div>
      ) : null}

      {!doc || !game ? (
        <div className="mt-6 rounded-2xl border border-black/5 bg-white/70 p-6 text-sm text-zinc-600 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-400">
          対局データが見つかりませんでした。
        </div>
      ) : (
        <>
          <GameDetailHeader doc={doc} />

          {Array.isArray(game.playerStats) && game.playerStats.length ? (
            <div className="mt-8">
              <div className="text-lg font-semibold">成績（この対局）</div>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {game.playerStats.map((s) => (
                  <PlayerStatsCard key={s.seat} stats={s} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-8">
            <RoundsTableFriendly doc={doc} />
          </div>

          <details className="mt-8 rounded-2xl border border-black/5 bg-white/40 p-4 text-sm dark:border-white/10 dark:bg-zinc-950/20">
            <summary className="cursor-pointer select-none font-semibold text-zinc-700 dark:text-zinc-300">
              詳細情報
            </summary>

            <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
              対局ID: <span className="font-mono">{uuid}</span>
            </div>

            {Array.isArray(game.parseNotes) && game.parseNotes.length ? (
              <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
                parseNotes: {game.parseNotes.join(" | ")}
              </div>
            ) : null}
          </details>
        </>
      )}
    </main>
  );
}

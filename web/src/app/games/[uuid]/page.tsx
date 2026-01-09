// web/src/app/games/[uuid]/page.tsx
import Link from "next/link";
import { API_BASE_INTERNAL } from "@/lib/api";
import { DerivedGame } from "@/lib/types";
import PlayerStatsCard from "@/components/PlayerStatsCard";
import RoundsTable from "@/components/RoundsTable";

async function fetchGameServer(uuid: string) {
  const res = await fetch(`${API_BASE_INTERNAL}/api/games/${uuid}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchGame failed: ${res.status}`);
  return (await res.json()) as { uuid: string; derived: DerivedGame };
}

export default async function GameDetailPage(
  props: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await props.params;

  let game: DerivedGame | null = null;
  let err = "";

  try {
    const doc = await fetchGameServer(uuid);
    game = doc.derived;
  } catch (e: any) {
    err = e?.message ?? String(e);
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div>
        <Link className="text-sm underline opacity-80" href="/">← Back</Link>
        <div className="mt-2 text-2xl font-semibold">{uuid}</div>
      </div>

      {err ? (
        <div className="mt-4 rounded-xl border border-red-300 p-3 text-sm">{err}</div>
      ) : null}

      {!game ? (
        <div className="mt-6 rounded-2xl border p-6 text-sm opacity-70">
          Not found / failed to load.
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-2xl border p-4 shadow-sm">
            <div className="text-lg font-semibold">Final Scores</div>
            <div className="mt-2 font-mono">
              {Array.isArray(game.finalScores) ? game.finalScores.join(" / ") : "—"}
            </div>
            <div className="mt-2 text-sm opacity-80">
              players: {game.players.map((p) => p.nickname).join(" / ")}
            </div>
          </div>

          {Array.isArray(game.playerStats) && game.playerStats.length ? (
            <div className="mt-6">
              <div className="text-lg font-semibold">Stats</div>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {game.playerStats.map((s) => (
                  <PlayerStatsCard key={s.seat} stats={s} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <RoundsTable game={game} />
          </div>
        </>
      )}
    </main>
  );
}

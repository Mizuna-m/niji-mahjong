import Link from "next/link";
import { fetchGame } from "@/lib/api";
import { cardCls, softBtnCls } from "@/lib/ui";
import PlayerStatsGrid from "@/components/PlayerStatsGrid";
import RoundsTable from "@/components/RoundsTable";

export default async function GameDetailPage(props: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await props.params;

  let err = "";
  let data: Awaited<ReturnType<typeof fetchGame>> | null = null;

  try {
    data = await fetchGame(uuid);
  } catch (e: any) {
    err = e?.message ?? String(e);
  }

  if (err) {
    return (
      <section>
        <div className="flex items-center justify-between">
          <Link className={softBtnCls} href="/">← Back</Link>
        </div>
        <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-100">
          {err}
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section>
        <Link className={softBtnCls} href="/">← Back</Link>
        <div className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">Not found.</div>
      </section>
    );
  }

  const g = data.derived;

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Link className={softBtnCls} href="/">← Back</Link>
          <div className="mt-3 truncate text-xl font-semibold">{uuid}</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            rule: {g.rule?.name ?? g.rule?.mode ?? "—"}
          </div>
        </div>
      </div>

      <div className={`${cardCls} mt-6 p-4`}>
        <div className="text-lg font-semibold">Final</div>
        <div className="mt-2 font-mono text-sm">
          {Array.isArray(g.finalScores) ? g.finalScores.join(" / ") : "—"}
        </div>
        <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {g.players.map((p) => p.displayName).join(" / ")}
        </div>
      </div>

      <div className="mt-6">
        <div className="text-lg font-semibold">Stats</div>
        <div className="mt-3">
          <PlayerStatsGrid stats={g.playerStats ?? []} />
        </div>
      </div>

      <div className="mt-6">
        <RoundsTable game={g} />
      </div>

      {Array.isArray(g.parseNotes) && g.parseNotes.length ? (
        <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
          notes: {g.parseNotes.join(" | ")}
        </div>
      ) : null}
    </section>
  );
}

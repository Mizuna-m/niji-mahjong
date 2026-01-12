// src/app/finals/matches/[matchId]/page.tsx
import Link from "next/link";
import type { FinalsMatchResponse } from "@/lib/typesTournament";
import { fetchFinalsMatch, fetchGameDetail } from "@/lib/api";
import { cardCls, pillCls } from "@/lib/ui";
import GameCard from "@/components/GameCard";
import PlayerAvatar from "@/components/PlayerAvatar";

function extractGameUuids(match: any): (string | null)[] {
  if (Array.isArray(match?.gameUuids)) return match.gameUuids.map((x: any) => (x ? String(x) : null));
  if (Array.isArray(match?.games)) return match.games.map((g: any) => (g?.gameUuid ? String(g.gameUuid) : null));
  return [match?.gameUuid ? String(match.gameUuid) : null];
}

function isFinalMatch(doc: FinalsMatchResponse) {
  return doc?.match?.matchId === "F" || doc?.round?.roundId === "F";
}

function ScoreTone(n: number) {
  if (n >= 40000) return "text-emerald-700 dark:text-emerald-300";
  if (n >= 30000) return "text-sky-700 dark:text-sky-300";
  if (n <= 0) return "text-rose-700 dark:text-rose-300";
  return "text-zinc-700 dark:text-zinc-300";
}

function rankFromScores(scores: number[]) {
  return scores
    .map((s, idx) => ({ s, idx }))
    .sort((a, b) => b.s - a.s)
    .map((x, i) => ({ ...x, rank: i + 1 }));
}

function rankBadge(rank: number) {
  const cls =
    rank === 1
      ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100"
      : rank === 2
        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-900/40 dark:text-zinc-100"
        : rank === 3
          ? "bg-orange-50 text-orange-900 dark:bg-orange-900/20 dark:text-orange-100"
          : "bg-rose-50 text-rose-900 dark:bg-rose-900/20 dark:text-rose-100";
  return `${pillCls} ${cls}`;
}

export default async function FinalsMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  // Next.js 16: params は Promise
  const { matchId } = await params;

  const doc = await fetchFinalsMatch(matchId, { cache: "no-store" });
  const m: any = doc.match;

  const final = isFinalMatch(doc);

  const gameUuids = extractGameUuids(m);

  // UUID がある分だけ対局詳細を取る（無いものは未確定扱い）
  const games = await Promise.all(
    gameUuids.map(async (u) => {
      if (!u) return null;
      try {
        return await fetchGameDetail(u, { cache: "no-store" });
      } catch {
        // UUID は埋まったが詳細APIがまだ、とかにも耐える
        return null;
      }
    })
  );

  // 決勝（シリーズ）の合計素点（playerId で突合）
  let seriesTotals: number[] | null = null;
  let seriesRanksPerGame: (number | null)[][] | null = null;

  if (final) {
    const seats: any[] = Array.isArray(m?.seats) ? m.seats : [];
    const idxByPlayer = new Map<string, number>();
    seats.forEach((p, i) => {
      if (p?.playerId) idxByPlayer.set(p.playerId, i);
    });

    const totals = new Array(seats.length).fill(0);
    const perGameRanks: (number | null)[][] = games.map(() => new Array(seats.length).fill(null));

    games.forEach((gdoc, gi) => {
      const derived = (gdoc as any)?.derived;
      const ps = derived?.players ?? [];
      const scores = derived?.finalScores;

      if (!Array.isArray(scores) || scores.length !== 4) return;

      // seat -> playerId を使って fixed index に足す
      ps.forEach((p: any) => {
        const pid = p?.playerId;
        const seat = p?.seat;
        if (!pid || typeof seat !== "number") return;
        const idx = idxByPlayer.get(pid);
        if (idx === undefined) return;

        totals[idx] += scores[seat] ?? 0;
      });

      // 半荘順位バッジ
      const order = rankFromScores(scores);
      order.forEach((o) => {
        // o.idx は seat
        const seatPlayer = ps.find((p: any) => p?.seat === o.idx);
        const pid = seatPlayer?.playerId;
        if (!pid) return;
        const idx = idxByPlayer.get(pid);
        if (idx === undefined) return;
        perGameRanks[gi][idx] = o.rank;
      });
    });

    const hasAny = games.some((g) => !!(g as any)?.derived?.finalScores);
    seriesTotals = hasAny ? totals : null;
    seriesRanksPerGame = perGameRanks;
  }

  const title = m?.title ?? m?.label ?? "対戦";
  const sub = final ? "決勝（合計素点）" : (doc.round?.label ?? "");

  const seats = Array.isArray(m?.seats) ? m.seats : [];

  return (
    <div className="mt-4">
      <Link className="text-sm underline text-zinc-600 dark:text-zinc-400" href="/finals">
        ← 決勝トーナメントへ
      </Link>

      <div className={`${cardCls} mt-4 p-5`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="truncate text-2xl font-semibold tracking-tight">{title}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <span className={pillCls}>{sub}</span>
              {final ? (
                <span className={pillCls}>
                  半荘は最大3戦の可能性あり（同点時の扱いは未確定）
                </span>
              ) : null}
            </div>
          </div>

          {final && seriesTotals ? (
            <div className="w-full rounded-2xl border border-black/5 bg-white/60 p-3 text-xs shadow-sm dark:border-white/10 dark:bg-zinc-950/20 sm:w-auto">
              <div className="text-zinc-500 dark:text-zinc-400">合計素点（暫定）</div>
              <div className="mt-2 space-y-2">
                {seats.map((p: any, i: number) => (
                  <div key={`${p?.playerId ?? "tbd"}-${i}`} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <PlayerAvatar
                        playerId={p?.playerId ?? undefined}
                        name={p?.displayName ?? p?.nickname ?? "未確定"}
                        src={p?.image ?? null}
                        size={28}
                      />
                      <div className="truncate text-sm font-medium">
                        {p?.displayName ?? p?.nickname ?? "未確定"}
                      </div>
                    </div>
                    <div className={`shrink-0 text-sm font-semibold tabular-nums ${ScoreTone(seriesTotals[i] ?? 0)}`}>
                      {seriesTotals[i]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {final ? (
          <div className="mt-4">
            <div className="text-sm font-semibold">順位（各半荘）</div>
            <div className="mt-2 space-y-2">
              {seats.map((p: any, i: number) => (
                <div key={`r-${p?.playerId ?? "tbd"}-${i}`} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <PlayerAvatar
                      playerId={p?.playerId ?? undefined}
                      name={p?.displayName ?? p?.nickname ?? "未確定"}
                      src={p?.image ?? null}
                      size={12}
                    />
                    <div className="truncate text-sm font-medium">
                      {p?.displayName ?? p?.nickname ?? "未確定"}
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-1.5">
                    {gameUuids.map((_, gi) => {
                      const r = seriesRanksPerGame?.[gi]?.[i] ?? null;
                      return (
                        <span key={gi} className={r ? rankBadge(r) : `${pillCls} bg-zinc-50 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-200`}>
                          第{gi + 1}戦: {r ? `${r}位` : "—"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
              ※ 同点の扱いは明示されていないため、必要に応じて追加半荘（第3戦）が行われる可能性があります。
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <div className="text-lg font-semibold">
          {final ? "半荘一覧" : "対局"}
        </div>

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {gameUuids.map((u, i) => {
            const gdoc = games[i];

            if (!u || !gdoc) {
              return (
                <div key={`pending-${i}`} className={`${cardCls} p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">第{i + 1}戦</div>
                    <span className={pillCls}>未確定</span>
                  </div>
                  <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                    対局UUIDは終了後に確定します。確定次第、ここに対局カードが表示されます。
                  </div>
                </div>
              );
            }

            return (
              <div key={u}>
                {/* GameCard は /games/:uuid への導線も含む */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold">第{i + 1}戦</div>
                  <span className={pillCls}>確定</span>
                </div>
                {/* <GameCard game={(gdoc as any).game} derived={(gdoc as any).derived} compact /> */}
                <GameCard game={(gdoc as any).game} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

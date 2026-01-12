// src/components/FinalsBracketView.tsx
import Link from "next/link";
import type {
  FinalsBracketResponse,
  FinalsBracketMatch,
  FinalsBracketSeat,
  FinalsBracketResult,
} from "@/lib/typesTournament";
import { cardCls, pillCls } from "@/lib/ui";
import PlayerAvatar from "@/components/PlayerAvatar";

const WIND = ["東", "南", "西", "北"] as const;

function scoreTone(n: number) {
  if (n >= 40000) return "text-emerald-700 dark:text-emerald-300";
  if (n >= 30000) return "text-sky-700 dark:text-sky-300";
  if (n <= 0) return "text-rose-700 dark:text-rose-300";
  return "text-zinc-700 dark:text-zinc-300";
}

function rankBadgeCls(rank: number) {
  if (rank === 1) return "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100";
  if (rank === 2) return "bg-zinc-100 text-zinc-900 dark:bg-zinc-900/40 dark:text-zinc-100";
  if (rank === 3) return "bg-orange-50 text-orange-900 dark:bg-orange-900/20 dark:text-orange-100";
  return "bg-rose-50 text-rose-900 dark:bg-rose-900/20 dark:text-rose-100";
}

function placeBySeatToRank(placeBySeat: number[] | null | undefined, seat: number): number | null {
  // placeBySeat は 1..4 の配列想定（サンプルより）
  if (!Array.isArray(placeBySeat)) return null;
  const p = placeBySeat[seat];
  if (typeof p !== "number") return null;
  return p;
}

function safeScores(result?: FinalsBracketResult | null) {
  const scores = result?.finalScores;
  if (!Array.isArray(scores) || scores.length !== 4) return null;
  return scores as number[];
}

/**
 * Finals がシリーズになる想定
 * - 互換性のため、match に gameUuid しか無い場合は「1戦だけ」として扱う
 * - 将来的に match.gameUuids / match.games が生えたらそちら優先
 */
function extractGameUuids(m: any): string[] {
  if (Array.isArray(m?.gameUuids)) return m.gameUuids.filter(Boolean);
  if (Array.isArray(m?.games)) return m.games.map((g: any) => g?.gameUuid).filter(Boolean);
  return m?.gameUuid ? [m.gameUuid] : [];
}

type SeriesGame = {
  gameUuid: string | null;
  // ブラケット側で result が取れるなら順位バッジに使う
  result: FinalsBracketResult | null;
  seats: FinalsBracketSeat[]; // playerId で突合
};

function extractSeriesGames(match: any): SeriesGame[] {
  // 1) match.games があればそれを使う（将来拡張用）
  if (Array.isArray(match?.games) && match.games.length) {
    return match.games.map((g: any) => ({
      gameUuid: g?.gameUuid ?? null,
      result: g?.result ?? null,
      seats: (g?.seats ?? []) as FinalsBracketSeat[],
    }));
  }

  // 2) gameUuids だけ来る場合（result は無い）
  if (Array.isArray(match?.gameUuids) && match.gameUuids.length) {
    return match.gameUuids.map((u: any) => ({
      gameUuid: u ?? null,
      result: null,
      seats: (match?.seats ?? []) as FinalsBracketSeat[],
    }));
  }

  // 3) 従来形式（単発）
  return [
    {
      gameUuid: match?.gameUuid ?? null,
      result: match?.result ?? null,
      seats: (match?.seats ?? []) as FinalsBracketSeat[],
    },
  ];
}

function SeatRow({
  seat,
  s,
  showWind,
  badge,
  right,
}: {
  seat: number;
  s: FinalsBracketSeat;
  showWind: boolean;
  badge?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const labelLeft = showWind ? WIND[seat] : null;

  return (
    <div className="flex items-center gap-2">
      <div className="w-9 shrink-0 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        {labelLeft ?? ""}
      </div>

      <PlayerAvatar
        playerId={s.playerId ?? undefined}
        name={s.displayName ?? s.nickname ?? "TBD"}
        src={s.image ?? null}
        size={28}
      />

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {s.displayName ?? s.nickname ?? "未確定"}
        </div>
      </div>

      {badge ? <div className="shrink-0">{badge}</div> : null}
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function AdvancementBadge({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span className={`${pillCls} bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100`}>
      進出
    </span>
  );
}

function FinalsSeriesCard({ match }: { match: FinalsBracketMatch }) {
  const games = extractSeriesGames(match as any);

  // プレイヤー行の固定順序は match.seats を採用（要求通り）
  const fixed = (match.seats ?? []) as FinalsBracketSeat[];

  // playerId → index を作る（未確定 null は突合しない）
  const idxByPlayer = new Map<string, number>();
  fixed.forEach((p, i) => {
    if (p?.playerId) idxByPlayer.set(p.playerId, i);
  });

  // 合計素点 & 各半荘順位（分かる範囲で）
  const total = new Array(fixed.length).fill(0);
  const ranksPerGame: (number | null)[][] = games.map(() => new Array(fixed.length).fill(null));

  games.forEach((g, gi) => {
    const scores = safeScores(g.result);
    const placeBySeat = g.result?.placeBySeat;

    // result が無い場合（UUIDのみで未集計）はスキップ
    if (!scores || !Array.isArray(placeBySeat)) return;

    // g.seats の seat 番号に紐づく playerId で fixed に割り当て
    g.seats.forEach((seatInfo, seat) => {
      const pid = seatInfo?.playerId;
      if (!pid) return;
      const idx = idxByPlayer.get(pid);
      if (idx === undefined) return;

      total[idx] += scores[seat] ?? 0;
      ranksPerGame[gi][idx] = placeBySeatToRank(placeBySeat, seat);
    });
  });

  // 「同点の扱い未定」なので winner 断定はしない（暫定表示）
  const hasAnyResult = games.some((g) => !!safeScores(g.result));
  const maxTotal = hasAnyResult ? Math.max(...total) : null;
  const leaders =
    maxTotal === null ? [] : total.map((v, i) => ({ v, i })).filter((x) => x.v === maxTotal);

  const leaderNote =
    !hasAnyResult
      ? "結果が確定すると、ここに合計素点と暫定順位が表示されます。"
      : leaders.length >= 2
        ? "同点の可能性があります（同点時の扱いは未確定）。必要なら追加半荘が行われる可能性があります。"
        : "暫定首位を表示しています（同点時・追加半荘の可能性あり）。";

  return (
    <div className={`${cardCls} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{match.title ?? "決勝"}</div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            半荘は複数戦（最大3戦の可能性あり）・合計素点で競います
          </div>
        </div>

        <Link
          href={`/finals/matches/${encodeURIComponent(match.matchId)}`}
          className="shrink-0 text-xs underline text-zinc-700 dark:text-zinc-300"
        >
          詳細 →
        </Link>
      </div>

      <div className="mt-3 space-y-2">
        {fixed.map((p, i) => {
          const isLeader = hasAnyResult && total[i] === maxTotal;

          const rankBadges = games.map((_, gi) => {
            const r = ranksPerGame[gi]?.[i] ?? null;
            if (!r) {
              return (
                <span key={gi} className={`${pillCls} bg-zinc-50 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-200`}>
                  第{gi + 1}戦: —
                </span>
              );
            }
            return (
              <span key={gi} className={`${pillCls} ${rankBadgeCls(r)}`}>
                第{gi + 1}戦: {r}位
              </span>
            );
          });

          return (
            <div key={`${p.playerId ?? "tbd"}-${i}`} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <SeatRow
                  seat={i}
                  s={p}
                  showWind={false} // 決勝は座順が変わり得るので明示しない
                  badge={
                    isLeader ? (
                      <span className={`${pillCls} bg-sky-50 text-sky-900 dark:bg-sky-900/20 dark:text-sky-100`}>
                        暫定首位
                      </span>
                    ) : null
                  }
                  right={
                    hasAnyResult ? (
                      <span className={`text-sm font-semibold tabular-nums ${scoreTone(total[i])}`}>
                        合計 {total[i]}
                      </span>
                    ) : null
                  }
                />

                <div className="mt-1 flex flex-wrap gap-1.5">
                  {rankBadges}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
        {leaderNote}
      </div>
    </div>
  );
}

function MatchCard({ match, isFinal }: { match: FinalsBracketMatch; isFinal: boolean }) {
  if (isFinal) {
    return <FinalsSeriesCard match={match} />;
  }

  const res = match.result ?? null;
  const scores = safeScores(res);

  // advance: fromSeat → toMatchId / toSeat
  const advFrom = new Set<number>();
  (match.advance ?? []).forEach((a) => {
    if (typeof a?.fromSeat === "number") advFrom.add(a.fromSeat);
  });

  return (
    <div className={`${cardCls} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{match.title ?? match.label}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <span className={pillCls}>{match.tableLabel}</span>
            {match.status === "finished" ? (
              <span className={`${pillCls} bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100`}>
                終了
              </span>
            ) : (
              <span className={pillCls}>未確定</span>
            )}
          </div>
        </div>

        <Link
          href={`/finals/matches/${encodeURIComponent(match.matchId)}`}
          className="shrink-0 text-xs underline text-zinc-700 dark:text-zinc-300"
        >
          詳細 →
        </Link>
      </div>

      <div className="mt-3 space-y-2">
        {(match.seats ?? []).map((s, seat) => {
          const score = scores ? scores[seat] : null;
          const place = placeBySeatToRank(res?.placeBySeat, seat);

          const placeBadge =
            place ? (
              <span className={`${pillCls} ${rankBadgeCls(place)}`}>
                {place}位
              </span>
            ) : null;

          return (
            <SeatRow
              key={`${match.matchId}-${seat}-${s?.playerId ?? "tbd"}`}
              seat={seat}
              s={s}
              showWind={true}
              badge={
                <div className="flex items-center gap-1.5">
                  <AdvancementBadge active={advFrom.has(seat)} />
                  {placeBadge}
                </div>
              }
              right={
                score !== null ? (
                  <span className={`text-sm font-semibold tabular-nums ${scoreTone(score)}`}>
                    {score}
                  </span>
                ) : null
              }
            />
          );
        })}
      </div>
    </div>
  );
}

export default function FinalsBracketView({ doc }: { doc?: FinalsBracketResponse }) {
  if (!doc || !Array.isArray(doc.rounds)) {
    return (
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
        トーナメント情報を読み込み中です…
      </div>
    );
  }
  return (
    <div className="mt-6 space-y-6">
      {doc.rounds.map((r) => {
        const isFinalRound = r.roundId === "F";

        return (
          <section key={r.roundId}>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-lg font-semibold">{r.label}</div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {isFinalRound ? "合計素点で決着（同点・追加半荘の可能性あり）" : "勝ち上がり（進出者を強調）"}
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              {r.matches.map((m) => (
                <MatchCard key={m.matchId} match={m} isFinal={isFinalRound} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

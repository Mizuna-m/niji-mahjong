import Link from "next/link";
import type { GameDetailResponse, PlayerPill } from "@/lib/types";
import { cardCls, pillCls } from "@/lib/ui";
import PlayersRow from "@/components/PlayersRow";
import { fmtJst, fmtDurationSec } from "@/lib/format";

function tableLabelOf(doc: GameDetailResponse) {
  const t: any = doc.table;
  return t?.label ?? t?.name ?? "対局";
}

function makePills(doc: GameDetailResponse): PlayerPill[] {
  const ps = doc.derived?.players ?? [];
  return ps.map((p) => ({
    seat: p.seat ?? 0,
    label: p.displayName ?? p.nickname,
    playerId: p.playerId ?? undefined,
    image: p.image ?? null,
  }));
}

function rankOrder(scores: number[]) {
  // [score, seat] を降順
  return scores
    .map((s, seat) => ({ s, seat }))
    .sort((a, b) => b.s - a.s)
    .map((x, i) => ({ ...x, rank: i + 1 }));
}

export default function GameDetailHeader({ doc }: { doc: GameDetailResponse }) {
  const title = doc.title?.trim() || "";
  const tableLabel = tableLabelOf(doc);
  const note = (doc.table as any)?.note as string | undefined;

  const g = doc.derived;
  const durSec = g?.startTime && g?.endTime ? Math.max(0, g.endTime - g.startTime) : 0;

  const heading = tableLabel; // ← 主タイトルは卓名
  const sticky = title;       // ← 付箋は title

  const pillPlayers = makePills(doc);

  const scores = Array.isArray(g?.finalScores) ? g.finalScores : null;
  const order = scores ? rankOrder(scores) : null;

  return (
    <div className="mt-4">
      <Link className="text-sm underline text-zinc-600 dark:text-zinc-400" href="/">
        ← 対局一覧へ
      </Link>

      <div className={`${cardCls} relative mt-4 p-5`}>
        {sticky ? (
          <div
            className="
              absolute -left-1 -top-2 z-10
              -rotate-3
              rounded border border-amber-200
              bg-amber-100 px-2.5 py-1
              text-xs font-semibold text-amber-900
              shadow-md
              dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-100
            "
            title={sticky}
          >
            {sticky}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="truncate text-2xl font-semibold tracking-tight">
              {heading}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              {g?.startTime ? <span className="whitespace-nowrap">{fmtJst(g.startTime)}</span> : null}
              {durSec ? <span className={pillCls}>所要 {fmtDurationSec(durSec)}</span> : null}
              {note ? <span className={pillCls}>見どころメモあり</span> : null}
            </div>
          </div>

          {scores ? (
            <div className="w-full rounded-2xl border border-black/5 bg-white/60 p-3 text-xs shadow-sm dark:border-white/10 dark:bg-zinc-950/20 sm:w-auto">
              <div className="text-zinc-500 dark:text-zinc-400">最終スコア</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {order!.map((x) => (
                  <div
                    key={x.seat}
                    className="rounded-xl border border-black/5 bg-white/70 px-2 py-1 font-mono dark:border-white/10 dark:bg-zinc-900/50"
                    title={`seat ${x.seat}`}
                  >
                    <span className="mr-2 font-sans text-zinc-600 dark:text-zinc-400">
                      {x.rank}位
                    </span>
                    {x.s}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {note ? (
          <div className="mt-4 rounded-2xl border border-black/5 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/30 dark:bg-amber-900/15 dark:text-amber-100">
            <div className="text-xs font-semibold opacity-80">見どころメモ</div>
            <div className="mt-1 whitespace-pre-wrap">{note}</div>
          </div>
        ) : null}

        <div className="mt-5">
          <div className="text-sm font-semibold">参加者</div>
          <PlayersRow players={pillPlayers} variant="detail" />
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { fetchPlayerSummary } from "@/lib/api";
import { cardCls, softBtnCls, pillCls } from "@/lib/ui";
import PlayerAvatar from "@/components/PlayerAvatar";
import { fmtJst, fmtDurationSec } from "@/lib/format";

function pct01(x: number) {
  if (!Number.isFinite(x)) return "—";
  return `${Math.round(x * 100)}%`;
}

function signed(n: number) {
  return `${n >= 0 ? "+" : ""}${n}`;
}

function deltaTone(n: number) {
  if (n > 0) return "text-emerald-700 dark:text-emerald-300";
  if (n < 0) return "text-rose-700 dark:text-rose-300";
  return "text-zinc-700 dark:text-zinc-300";
}

function box(title: string, value: React.ReactNode, sub?: React.ReactNode) {
  return (
    <div className="rounded-xl border border-black/5 bg-white/60 p-3 dark:border-white/10 dark:bg-zinc-950/20">
      <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{title}</div>
      <div className="mt-1 font-mono text-base">{value}</div>
      {sub ? <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{sub}</div> : null}
    </div>
  );
}

export default async function PlayerPage(props: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await props.params;

  let err = "";
  let data: Awaited<ReturnType<typeof fetchPlayerSummary>> | null = null;

  try {
    data = await fetchPlayerSummary(playerId);
  } catch (e: any) {
    err = e?.message ?? String(e);
  }

  if (err || !data) {
    return (
      <section>
        <Link className={softBtnCls} href="/players">← 参加者一覧へ</Link>
        <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-100">
          読み込みに失敗しました。
          <div className="mt-2 text-xs opacity-80">{err || "Not found"}</div>
        </div>
      </section>
    );
  }

  const p = data.profile;

  return (
    <section>
      <Link className={softBtnCls} href="/players">← 参加者一覧へ</Link>

      {/* プロフィール */}
      <div className={`${cardCls} mt-6 p-5`}>
        <div className="flex items-center gap-4">
          <PlayerAvatar name={p.displayName} src={p.image ?? null} size={64} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-2xl font-semibold tracking-tight">
              {p.displayName}
            </div>

            {(p.tags?.length ?? 0) > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <span key={t} className={pillCls}>{t}</span>
                ))}
              </div>
            ) : null}

            {(data.nicknames?.length ?? 0) > 0 ? (
              <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                別名：{data.nicknames.join(" / ")}
              </div>
            ) : null}
          </div>

          {/* 収支を目立たせる（この人の要約） */}
          <div className="shrink-0 text-right">
            <div className="text-xs text-zinc-600 dark:text-zinc-400">通算収支</div>
            <div className={`font-mono text-2xl font-semibold ${deltaTone(data.aggregate.deltaTotal)}`}>
              {signed(data.aggregate.deltaTotal)}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500">
              {data.aggregate.games}戦 / {data.aggregate.rounds}局
            </div>
          </div>
        </div>
      </div>

      {/* 成績サマリ */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className={`${cardCls} p-4`}>
          <div className="text-lg font-semibold">成績サマリ</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {box("対局 / 局数", `${data.aggregate.games} / ${data.aggregate.rounds}`)}
            {box("通算収支", <span className={deltaTone(data.aggregate.deltaTotal)}>{signed(data.aggregate.deltaTotal)}</span>)}
            {box("和了 / 放銃", `${data.aggregate.hule} / ${data.aggregate.dealIn}`)}
            {box("立直 / 鳴き", `${data.aggregate.riichi} / ${data.aggregate.calls}`)}
          </div>
        </div>

        <div className={`${cardCls} p-4`}>
          <div className="text-lg font-semibold">率（目安）</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {box("和了率", pct01(data.rates.hulePerRound))}
            {box("放銃率", pct01(data.rates.dealInPerRound))}
            {box("立直率", pct01(data.rates.riichiPerRound))}
            {box("トップ率", pct01(data.rates.topRate))}
          </div>
          <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
            ※ 率は「局数/対局数」に依存します（参考値）
          </div>
        </div>
      </div>

      {/* 最近の対局 */}
      <div className={`${cardCls} mt-6 p-4`}>
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-lg font-semibold">最近の対局</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-500">
            直近 {data.recentGames.length} 件
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {data.recentGames.map((g) => {
            const place =
              typeof g.place === "number" ? `${g.place}位` : "—";

            const heading =
              g.tableLabel || g.title || "対局";

            return (
              <Link
                key={g.uuid}
                href={`/games/${g.uuid}`}
                className="block rounded-2xl border border-black/5 bg-white/60 p-3
                          hover:bg-white/80
                          dark:border-white/10 dark:bg-zinc-950/20 dark:hover:bg-zinc-900/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {/* 卓名 / タイトル */}
                    <div className="truncate font-semibold">
                      {heading}
                    </div>

                    {/* 対戦相手 */}
                    {g.opponents?.length ? (
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        対戦：
                        {[...(g.opponents ?? [])]
                        .sort((a, b) => a.seat - b.seat)
                        .map((o) => o.displayName)
                        .join(" / ")}
                      </div>
                    ) : null}

                    {/* 日時 */}
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                      {fmtJst(g.startTime)}
                    </div>
                  </div>

                  {/* 結果 */}
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold">{place}</div>
                    <div className={`mt-1 font-mono text-xs ${deltaTone(g.delta)}`}>
                      {signed(g.delta)}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 開発向けは折りたたみ */}
      <details className="mt-6 rounded-2xl border border-black/5 bg-white/40 p-4 text-sm dark:border-white/10 dark:bg-zinc-950/20">
        <summary className="cursor-pointer select-none font-semibold text-zinc-700 dark:text-zinc-300">
          詳細情報
        </summary>
        <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
          参加者ID: <span className="font-mono">{p.playerId}</span>
        </div>
      </details>
    </section>
  );
}

import Link from "next/link";
import type { GameDetailResponse } from "@/lib/types";
import PlayerAvatar from "@/components/PlayerAvatar";
import { cardCls, pillCls } from "@/lib/ui";
import { playerHref } from "@/lib/playerLink";

function playerBySeat(doc: GameDetailResponse, seat: number) {
  return doc.derived.players.find((p) => p.seat === seat);
}

function playerLabel(doc: GameDetailResponse, seat: number) {
  const p = playerBySeat(doc, seat);
  return p?.displayName ?? p?.nickname ?? `seat${seat}`;
}

function playerImg(doc: GameDetailResponse, seat: number) {
  return playerBySeat(doc, seat)?.image ?? null;
}

function playerId(doc: GameDetailResponse, seat: number) {
  return playerBySeat(doc, seat)?.playerId ?? null;
}

function signed(n: number) {
  return `${n >= 0 ? "+" : ""}${n}`;
}

function resultBadge(kind: "tsumo" | "ron") {
  if (kind === "tsumo") {
    return `${pillCls} border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-200`;
  }
  return `${pillCls} border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-200`;
}

function roundDisplayName(r: any) {
  const base = (r.roundNameLong ?? r.roundName ?? `${r.id.roundIndex + 1}局目`) as string;
  const sticks = r.id?.riichiSticks ?? 0;
  // 「東1局 1本場 （供託1）」のイメージに寄せる
  return sticks > 0 ? `${base}（供託${sticks}）` : base;
}

function PlayerLinkChip({
  href,
  name,
  src,
}: {
  href: string;
  name: string;
  src: string | null;
}) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 hover:opacity-90">
      <PlayerAvatar name={name} src={src} size={18} />
      <span className="max-w-[10rem] truncate">{name}</span>
    </Link>
  );
}

export default function RoundsTableFriendly({ doc }: { doc: GameDetailResponse }) {
  const game = doc.derived;

  return (
    <div className={`${cardCls} p-4`}>
      <div className="text-lg font-semibold">局結果</div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-black/5 dark:border-white/10">
            <tr className="text-zinc-600 dark:text-zinc-400">
              <th className="py-2 pr-3">局</th>
              <th className="py-2 pr-3">結果</th>
              <th className="py-2 pr-3">和了</th>
              <th className="py-2 pr-3">放銃</th>
              <th className="py-2 pr-3">点移動</th>
            </tr>
          </thead>

          <tbody>
            {game.rounds.map((r: any, idx: number) => {
              const h = r.hule;

              if (!h) {
                return (
                  <tr
                    key={idx}
                    className="border-b border-black/5 last:border-b-0 dark:border-white/10"
                  >
                    <td className="py-2 pr-3 font-mono">{roundDisplayName(r)}</td>
                    <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">流局/記録なし</td>
                    <td className="py-2 pr-3">—</td>
                    <td className="py-2 pr-3">—</td>
                    <td className="py-2 pr-3 font-mono">—</td>
                  </tr>
                );
              }

              const winners = h.winners.map((seat: number) => {
                const name = playerLabel(doc, seat);
                const href = playerHref(playerId(doc, seat), playerBySeat(doc, seat)?.nickname ?? null, name);
                return { seat, name, href, src: playerImg(doc, seat) };
              });

              const loser =
                typeof h.loser === "number"
                  ? (() => {
                      const seat = h.loser as number;
                      const name = playerLabel(doc, seat);
                      const href = playerHref(playerId(doc, seat), playerBySeat(doc, seat)?.nickname ?? null, name);
                      return { seat, name, href, src: playerImg(doc, seat) };
                    })()
                  : null;

              return (
                <tr
                  key={idx}
                  className="border-b border-black/5 last:border-b-0 dark:border-white/10"
                >
                  <td className="py-2 pr-3 font-mono">{roundDisplayName(r)}</td>

                  <td className="py-2 pr-3">
                    <span className={resultBadge(h.kind)}>
                      {h.kind === "tsumo" ? "ツモ" : "ロン"}
                    </span>
                  </td>

                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-3">
                      {winners.map((w) => (
                        <PlayerLinkChip key={w.seat} href={w.href} name={w.name} src={w.src} />
                      ))}
                    </div>
                  </td>

                  <td className="py-2 pr-3">
                    {loser ? (
                      <PlayerLinkChip href={loser.href} name={loser.name} src={loser.src} />
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="py-2 pr-3 font-mono">
                    {Array.isArray(h.deltaScores) ? h.deltaScores.map(signed).join(" / ") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
        ※ ユーザー名を押すと参加者ページへ移動します（ID不明の場合は一覧検索）。
      </div>
    </div>
  );
}

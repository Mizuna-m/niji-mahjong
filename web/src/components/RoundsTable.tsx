import type { DerivedGame, Round } from "@/lib/types";
import { cardCls } from "@/lib/ui";

function seatName(game: DerivedGame, seat: number) {
  return game.players?.find((p) => p.seat === seat)?.displayName
    ?? game.players?.find((p) => p.seat === seat)?.nickname
    ?? `seat${seat}`;
}

function roundLabel(r: Round) {
  return `#${r.id.roundIndex + 1} (honba ${r.id.honba}, riichi ${r.id.riichiSticks})`;
}

export default function RoundsTable({ game }: { game: DerivedGame }) {
  return (
    <div className={`${cardCls} p-4`}>
      <div className="text-lg font-semibold">局結果</div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/5 text-xs text-zinc-600 dark:border-white/10 dark:text-zinc-400">
            <tr>
              <th className="py-2 pr-3">局</th>
              <th className="py-2 pr-3">結果</th>
              <th className="py-2 pr-3">勝者</th>
              <th className="py-2 pr-3">放銃</th>
              <th className="py-2 pr-3">点移動</th>
            </tr>
          </thead>
          <tbody>
            {game.rounds.map((r) => {
              const h = r.hule;
              const winners = h?.winners?.map((s) => seatName(game, s)).join(" / ") ?? "";
              const loser = typeof h?.loser === "number" ? seatName(game, h.loser) : "";
              const delta = Array.isArray(h?.deltaScores) ? h.deltaScores.join(" / ") : "";

              const resultLabel = h ? (h.kind === "tsumo" ? "ツモ" : "ロン") : "—";

              return (
                <tr
                  key={r.id.roundIndex}
                  className="border-b border-black/5 odd:bg-black/[0.02] hover:bg-black/[0.04] dark:border-white/10 dark:odd:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                >
                  <td className="py-2 pr-3 font-mono">{roundLabel(r)}</td>
                  <td className="py-2 pr-3">{resultLabel}</td>
                  <td className="py-2 pr-3">{winners}</td>
                  <td className="py-2 pr-3">{loser}</td>
                  <td className="py-2 pr-3 font-mono">{delta}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

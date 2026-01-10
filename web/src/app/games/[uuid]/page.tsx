import Link from "next/link";
import { API_BASE_INTERNAL } from "@/lib/api";
import type { GameDetailResponse, PlayerPill } from "@/lib/types";
import { cardCls, pillCls } from "@/lib/ui";
import PlayerStatsCard from "@/components/PlayerStatsCard";
import RoundsTable from "@/components/RoundsTable";
import PlayersRow from "@/components/PlayersRow";
import { fmtJst, fmtDurationSec } from "@/lib/format";

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
  const tableLabel = doc?.table?.label ?? doc?.table?.name ?? "";
  const title = doc?.title ?? "";
  const note = doc?.table?.note ?? "";

  const durSec =
    game?.startTime && game?.endTime ? Math.max(0, game.endTime - game.startTime) : 0;

  const pillPlayers: PlayerPill[] =
    game?.players?.map((p) => ({
      seat: p.seat ?? 0,
      label: p.displayName ?? p.nickname,
      playerId: p.playerId ?? undefined,
      image: p.image ?? null,
    })) ?? [];

  const heading = title || tableLabel || "対局詳細";

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link className="text-sm underline text-zinc-600 dark:text-zinc-400" href="/">
            ← 一覧へ戻る
          </Link>

          <div className="mt-3 truncate text-2xl font-semibold tracking-tight">
            {heading}
          </div>

          {/* サブ情報（卓・日時・所要） */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            {tableLabel && title ? <span className={pillCls}>{tableLabel}</span> : null}
            {game?.startTime ? <span>{fmtJst(game.startTime)}</span> : null}
            {durSec ? <span className={pillCls}>所要 {fmtDurationSec(durSec)}</span> : null}
          </div>
        </div>
      </div>

      {err ? (
        <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-100">
          読み込みに失敗しました。時間をおいて「更新」してください。
          <div className="mt-2 text-xs opacity-80">{err}</div>
        </div>
      ) : null}

      {!game ? (
        <div className={`${cardCls} mt-6 p-6 text-sm text-zinc-600`}>
          対局データが見つかりませんでした。
        </div>
      ) : (
        <>
          {/* 見どころメモ（ユーザー向け） */}
          {note ? (
            <div className={`${cardCls} mt-6 p-4`}>
              <div className="text-sm font-semibold">見どころメモ</div>
              <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{note}</div>
            </div>
          ) : null}

          {/* 参加者（顔の存在感） */}
          <div className={`${cardCls} mt-6 p-4`}>
            <div className="text-sm font-semibold">参加者</div>
            <PlayersRow players={pillPlayers} />
          </div>

          {/* 最終スコア */}
          <div className={`${cardCls} mt-6 p-4`}>
            <div className="text-sm font-semibold">最終スコア</div>
            <div className="mt-2 font-mono text-base">
              {Array.isArray(game.finalScores) ? game.finalScores.join(" / ") : "—"}
            </div>
          </div>

          {/* スタッツ */}
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

          {/* 局結果 */}
          <div className="mt-8">
            <RoundsTable game={game} />
          </div>

          {/* 開発向け（折りたたみ） */}
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

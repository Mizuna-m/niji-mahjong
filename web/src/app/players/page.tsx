import { fetchPlayers } from "@/lib/api";
import { cardCls, pillCls } from "@/lib/ui";
import Link from "next/link";
import PlayerAvatar from "@/components/PlayerAvatar";

export default async function PlayersPage() {
  const r = await fetchPlayers();
  const players = [...(r.players ?? [])].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "ja")
  );

  return (
    <section>
      {/* ヘッダ */}
      <div className="text-2xl font-semibold">参加者一覧</div>
      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        にじさんじ麻雀杯に参加したライバー一覧
      </div>

      {/* 一覧 */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {players.map((p) => (
          <Link
            key={p.playerId}
            href={`/players/${p.playerId}`}
            className={`${cardCls} block p-4 hover:bg-white/80 dark:hover:bg-zinc-900/80`}
          >
            <div className="flex items-center gap-4">
              {/* アイコン主役 */}
              <PlayerAvatar
                name={p.displayName}
                src={p.image ?? null}
                size={64}
              />

              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold">
                  {p.displayName}
                </div>

                {/* タグ */}
                {(p.tags?.length ?? 0) > 0 ? (
                  <div className="mt-2">
                    <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-500">
                      特徴
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {p.tags!.slice(0, 6).map((t) => (
                        <span key={t} className={pillCls}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* フッター補足 */}
      <div className="mt-6 text-xs text-zinc-500 dark:text-zinc-500">
        ※ 参加者を選択すると、成績や対局履歴を見ることができます。
      </div>
    </section>
  );
}

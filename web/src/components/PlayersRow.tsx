import Link from "next/link";
import type { PlayerPill } from "@/lib/types";
import PlayerAvatar from "@/components/PlayerAvatar";
import { playerHref } from "@/lib/playerLink";

type Variant = "list" | "detail";

export default function PlayersRow({
  players,
  variant = "list",
  avatarSize,
}: {
  players: PlayerPill[];
  variant?: Variant;
  avatarSize?: number;
}) {
  const size =
    avatarSize ?? (variant === "detail" ? 32 : 24);

  // 一覧: 2x2
  // 詳細: 1x4（横並び） + 溢れたら横スクロール
  const wrapCls =
    variant === "detail"
      ? "mt-3 -mx-1 overflow-x-auto"
      : "mt-3";

  const rowCls =
    variant === "detail"
      ? "grid grid-cols-2 sm:grid-cols-4 gap-2 px-1"
      : "grid grid-cols-2 gap-2";

  const itemBase =
    "flex items-center gap-2 rounded-2xl border border-black/5 bg-white/60 px-3 py-2 text-sm hover:opacity-90 dark:border-white/10 dark:bg-zinc-950/20";

  const itemCls =
    variant === "detail"
      ? `${itemBase} shrink-0 min-w-[10.5rem]` // 1x4が窮屈にならない最低幅
      : itemBase;

  return (
    <div className={wrapCls}>
      <div className={rowCls}>
        {players.slice(0, 4).map((p) => {
          const href = playerHref(p.playerId, (p as any).nickname ?? null, p.label);
          return (
            <Link
              key={`${p.seat}-${href}`}
              href={href}
              className={itemCls}
              title={p.label}
            >
              <PlayerAvatar name={p.label} src={p.image ?? null} size={size} />
              <span className="min-w-0 truncate font-medium">{p.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// web/src/components/PlayerAvatar.tsx
import Image from "next/image";

function initials(name: string) {
  const s = (name ?? "").trim();
  if (!s) return "?";
  // 日本語名でも先頭1文字で成立させる
  return s.slice(0, 1).toUpperCase();
}

export default function PlayerAvatar({
  name,
  src,
  size = 32,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full border border-black/10 object-cover dark:border-white/10"
      />
    );
  }

  return (
    <div
      className="grid place-items-center rounded-full border border-black/10 bg-zinc-100 text-xs font-semibold text-zinc-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200"
      style={{ width: size, height: size }}
      aria-label={name}
      title={name}
    >
      {initials(name)}
    </div>
  );
}

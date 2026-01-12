// src/components/PlayerAvatar.tsx
import Image from "next/image";

type Props = {
  /** 表示名（未確定でもOK） */
  name?: string | null;

  /** 画像URL（どちらでも受ける） */
  src?: string | null;
  image?: string | null;

  /** 呼び出し側互換用（使わないが受け取る） */
  playerId?: string | null;

  size?: number;
  className?: string;
};

export default function PlayerAvatar({
  name,
  src,
  image,
  size = 40,
  className = "",
}: Props) {
  const url = src ?? image ?? "";
  const label = name && name.trim() ? name : "未確定";

  const baseCls =
    "relative shrink-0 overflow-hidden rounded-full " +
    "bg-zinc-200 dark:bg-zinc-800";

  if (url) {
    return (
      <div
        className={`${baseCls} ${className}`}
        style={{ width: size, height: size }}
        aria-label={label}
        title={label}
      >
        <Image
          src={url}
          alt={label}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${baseCls} flex items-center justify-center text-[10px] text-zinc-600 dark:text-zinc-300 ${className}`}
      style={{ width: size, height: size }}
      aria-label={label}
      title={label}
    >
      {label.slice(0, 2)}
    </div>
  );
}

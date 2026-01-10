export function fmtJst(epochSec?: number) {
  if (!epochSec) return "";
  return new Date(epochSec * 1000).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDurationSec(sec?: number) {
  if (!sec || sec <= 0) return "";
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}分`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}時間${rm}分` : `${h}時間`;
}

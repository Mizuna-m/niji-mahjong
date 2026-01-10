export function playerHref(playerId?: string | null, nickname?: string | null, displayName?: string | null) {
  if (playerId) return `/players/${playerId}`;

  // playerId が無い人もリンクにする：一覧へ検索クエリを渡す
  // 例: /players?q=無色で無職
  const q = (displayName || nickname || "").trim();
  return q ? `/players?q=${encodeURIComponent(q)}` : "/players";
}

// web/src/data/players.ts
export const PLAYER_INDEX: Record<string, { id: string; avatar?: string }> = {
  // "雀魂表示名": { id: "liver_id", avatar: "/avatars/liver_id.jpg" }
  "みずな": { id: "mizuna", avatar: "/avatars/mizuna.jpg" },
};

export function getAvatarUrl(nickname: string): string | null {
  return PLAYER_INDEX[nickname]?.avatar ?? null;
}

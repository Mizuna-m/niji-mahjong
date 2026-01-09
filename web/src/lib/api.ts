// web/src/lib/api.ts

// ブラウザ用（公開URL）
export const API_BASE_PUBLIC =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

// サーバ用（コンテナ内ネットワークURL）
export const API_BASE_INTERNAL =
  process.env.API_BASE_INTERNAL || API_BASE_PUBLIC;

export type GamesListItem = {
  uuid: string;
  startTime?: number;
  endTime?: number;
  players?: { seat: number; nickname: string }[];
  finalScores?: number[];
};

export async function fetchGames(base = API_BASE_PUBLIC): Promise<GamesListItem[]> {
  const res = await fetch(`${base}/api/games`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchGames failed: ${res.status}`);
  const json = await res.json();
  return json.games ?? [];
}

export async function fetchGame(uuid: string, base = API_BASE_PUBLIC) {
  const res = await fetch(`${base}/api/games/${uuid}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchGame failed: ${res.status}`);
  return await res.json();
}

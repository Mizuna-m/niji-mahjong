import type {
  CumulativeResponse,
  GameDetailResponse,
  GamesListResponse,
  LeaderboardMetric,
  LeaderboardResponse,
  PlayersListResponse,
  PlayerSummaryResponse,
} from "@/lib/types";

export const API_BASE_PUBLIC =
  process.env.NEXT_PUBLIC_API_BASE_PUBLIC ?? "http://localhost:3001";

export const API_BASE_INTERNAL =
  process.env.API_BASE_INTERNAL ?? API_BASE_PUBLIC;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.error ? `${msg}: ${j.error}` : msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export async function fetchGames(base = API_BASE_INTERNAL) {
  return fetchJson<GamesListResponse>(`${base}/api/games`);
}

export async function fetchGame(uuid: string, base = API_BASE_INTERNAL) {
  return fetchJson<GameDetailResponse>(`${base}/api/games/${encodeURIComponent(uuid)}`);
}

export async function fetchPlayers(base = API_BASE_INTERNAL) {
  return fetchJson<PlayersListResponse>(`${base}/api/players`);
}

export async function fetchPlayerSummary(playerId: string, base = API_BASE_INTERNAL) {
  return fetchJson<PlayerSummaryResponse>(`${base}/api/players/${encodeURIComponent(playerId)}`);
}

export async function fetchLeaderboard(
  metric: LeaderboardMetric = "deltaTotal",
  limit = 50,
  base = API_BASE_INTERNAL
) {
  const qs = new URLSearchParams({ metric, limit: String(limit) });
  return fetchJson<LeaderboardResponse>(`${base}/api/stats/leaderboard?${qs.toString()}`);
}

export async function fetchCumulative(limitGames = 2000, base = API_BASE_INTERNAL) {
  const qs = new URLSearchParams({ limitGames: String(limitGames) });
  return fetchJson<CumulativeResponse>(`${base}/api/stats/cumulative?${qs.toString()}`);
}

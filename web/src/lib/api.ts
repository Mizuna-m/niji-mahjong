import type {
  CumulativeResponse,
  GameDetailResponse,
  GamesListResponse,
  LeaderboardMetric,
  LeaderboardResponse,
  PlayersListResponse,
  PlayerSummaryResponse,
  QualifierWinnersResponse,
} from "@/lib/types";

export const API_BASE_PUBLIC =
  process.env.NEXT_PUBLIC_API_BASE_PUBLIC ?? "http://localhost:3000";

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
// src/lib/api.ts
import type {
  TournamentMeta,
  TournamentKpiResponse,
  QualifierGroup,
  QualifierGroupStandings,
  WildcardResponse,
} from "@/lib/types";

async function apiGet<T>(base: string, path: string): Promise<T> {
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

/** tournament */
export async function fetchTournamentMeta(base = API_BASE_INTERNAL) {
  return apiGet<TournamentMeta>(base, "/api/tournament/meta");
}

export async function fetchTournamentKpi(
  base = API_BASE_INTERNAL,
  phase: "qualifier" | "finals" = "qualifier"
) {
  const q = new URLSearchParams({ phase });
  return apiGet<TournamentKpiResponse>(base, `/api/tournament/kpi?${q.toString()}`);
}

export async function fetchQualifierGroups(base = API_BASE_INTERNAL) {
  const r = await apiGet<{ groups: QualifierGroup[] }>(base, "/api/tournament/qualifier/groups");
  return r.groups ?? [];
}

export async function fetchQualifierGroupStandings(base = API_BASE_INTERNAL, groupId: string) {
  return apiGet<QualifierGroupStandings>(base, `/api/tournament/qualifier/groups/${encodeURIComponent(groupId)}/standings`);
}

export async function fetchQualifierWildcards(base = API_BASE_INTERNAL) {
  return apiGet<WildcardResponse>(base, "/api/tournament/qualifier/wildcards");
}

export async function fetchQualifierWinners(base = API_BASE_INTERNAL) {
  return apiGet<QualifierWinnersResponse>(base, "/api/tournament/qualifier/winners");
}

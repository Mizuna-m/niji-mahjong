// src/lib/api.ts
import type {
  CumulativeResponse,
  GameDetailResponse,
  GamesListResponse,
  LeaderboardMetric,
  LeaderboardResponse,
  PlayersListResponse,
  PlayerSummaryResponse,
  QualifierWinnersResponse,
  TournamentMeta,
  TournamentKpiResponse,
  QualifierGroup,
  QualifierGroupStandings,
  WildcardResponse,
} from "@/lib/types";

/**
 * 実行環境ごとのベースURL戦略
 *
 * - Browser(Client Components):
 *     base=""（相対URL） → Next.js rewrites (/api/* → api:3000)
 * - Server(RSC/SSR):
 *     API_BASE_INTERNAL=http://api:3000 を使える
 */
const API_BASE_INTERNAL =
  process.env.API_BASE_INTERNAL && process.env.API_BASE_INTERNAL.trim()
    ? process.env.API_BASE_INTERNAL
    : "";

/**
 * Client/Server 共通の URL 組み立て
 * base が空なら相対URLになる
 */
function join(base: string, path: string) {
  if (!base) return path;
  return `${base}${path}`;
}

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
      if (j?.error) msg += `: ${j.error}`;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return (await res.json()) as T;
}

/* =========================
 * Games
 * ========================= */

export async function fetchGames(base = API_BASE_INTERNAL) {
  return fetchJson<GamesListResponse>(join(base, "/api/games"));
}

export async function fetchGame(uuid: string, base = API_BASE_INTERNAL) {
  return fetchJson<GameDetailResponse>(
    join(base, `/api/games/${encodeURIComponent(uuid)}`)
  );
}

/* =========================
 * Players
 * ========================= */

export async function fetchPlayers(base = API_BASE_INTERNAL) {
  return fetchJson<PlayersListResponse>(join(base, "/api/players"));
}

export async function fetchPlayerSummary(
  playerId: string,
  base = API_BASE_INTERNAL
) {
  return fetchJson<PlayerSummaryResponse>(
    join(base, `/api/players/${encodeURIComponent(playerId)}`)
  );
}

/* =========================
 * Stats
 * ========================= */

export async function fetchLeaderboard(
  metric: LeaderboardMetric = "deltaTotal",
  limit = 50,
  base = API_BASE_INTERNAL
) {
  const qs = new URLSearchParams({
    metric,
    limit: String(limit),
  });
  return fetchJson<LeaderboardResponse>(
    join(base, `/api/stats/leaderboard?${qs.toString()}`)
  );
}

export async function fetchCumulative(
  limitGames = 2000,
  base = API_BASE_INTERNAL
) {
  const qs = new URLSearchParams({ limitGames: String(limitGames) });
  return fetchJson<CumulativeResponse>(
    join(base, `/api/stats/cumulative?${qs.toString()}`)
  );
}

/* =========================
 * Tournament
 * ========================= */

export async function fetchTournamentMeta(base = API_BASE_INTERNAL) {
  return fetchJson<TournamentMeta>(join(base, "/api/tournament/meta"));
}

export async function fetchTournamentKpi(
  phase: "qualifier" | "finals" = "qualifier",
  base = API_BASE_INTERNAL
) {
  const qs = new URLSearchParams({ phase });
  return fetchJson<TournamentKpiResponse>(
    join(base, `/api/tournament/kpi?${qs.toString()}`)
  );
}

/* =========================
 * Qualifier
 * ========================= */

export async function fetchQualifierGroups(base = API_BASE_INTERNAL) {
  const res = await fetchJson<{ groups: QualifierGroup[] }>(
    join(base, "/api/tournament/qualifier/groups")
  );
  return res.groups ?? [];
}

export async function fetchQualifierGroupStandings(
  groupId: string,
  base = API_BASE_INTERNAL
) {
  return fetchJson<QualifierGroupStandings>(
    join(
      base,
      `/api/tournament/qualifier/groups/${encodeURIComponent(groupId)}/standings`
    )
  );
}

export async function fetchQualifierWildcards(base = API_BASE_INTERNAL) {
  return fetchJson<WildcardResponse>(
    join(base, "/api/tournament/qualifier/wildcards")
  );
}

export async function fetchQualifierWinners(base = API_BASE_INTERNAL) {
  return fetchJson<QualifierWinnersResponse>(
    join(base, "/api/tournament/qualifier/winners")
  );
}

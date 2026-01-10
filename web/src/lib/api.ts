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
 *     相対URL "/api/..." を使って rewrites を必ず通す（CORS回避、ホスト差分も吸収）
 * - Server(RSC/SSR):
 *     API_BASE_INTERNAL=http://api:3000 があればそれを使う（高速・確実）
 *     無ければ相対URL（ただし環境によっては相対fetchが失敗するので、その場合は page側で絶対URLを組む）
 */
const API_BASE_INTERNAL =
  process.env.API_BASE_INTERNAL && process.env.API_BASE_INTERNAL.trim()
    ? process.env.API_BASE_INTERNAL.trim()
    : "";

// Clientでは絶対に相対に寄せる（ブラウザから http://api:3000 は見えない）
const API_BASE_CLIENT = "";

// 実行環境判定（Next で browser は window がある）
function defaultBase() {
  return typeof window === "undefined" ? API_BASE_INTERNAL : API_BASE_CLIENT;
}

/** base が空なら相対URLになる */
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

export async function fetchGames(base = defaultBase()) {
  return fetchJson<GamesListResponse>(join(base, "/api/games"));
}

export async function fetchGame(uuid: string, base = defaultBase()) {
  return fetchJson<GameDetailResponse>(
    join(base, `/api/games/${encodeURIComponent(uuid)}`)
  );
}

/* =========================
 * Players
 * ========================= */

export async function fetchPlayers(base = defaultBase()) {
  return fetchJson<PlayersListResponse>(join(base, "/api/players"));
}

export async function fetchPlayerSummary(playerId: string, base = defaultBase()) {
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
  base = defaultBase()
) {
  const qs = new URLSearchParams({
    metric,
    limit: String(limit),
  });
  return fetchJson<LeaderboardResponse>(
    join(base, `/api/stats/leaderboard?${qs.toString()}`)
  );
}

export async function fetchCumulative(limitGames = 2000, base = defaultBase()) {
  const qs = new URLSearchParams({ limitGames: String(limitGames) });
  return fetchJson<CumulativeResponse>(
    join(base, `/api/stats/cumulative?${qs.toString()}`)
  );
}

/* =========================
 * Tournament
 * ========================= */

export async function fetchTournamentMeta(base = defaultBase()) {
  return fetchJson<TournamentMeta>(join(base, "/api/tournament/meta"));
}

/**
 * 事故防止のため「オブジェクト引数」に変更
 * - 旧: fetchTournamentKpi(phase, base)
 * - 新: fetchTournamentKpi({ phase, base })
 */
export async function fetchTournamentKpi(opts?: {
  phase?: "qualifier" | "finals";
  base?: string;
}) {
  const phase = opts?.phase ?? "qualifier";
  const base = opts?.base ?? defaultBase();
  const qs = new URLSearchParams({ phase });
  return fetchJson<TournamentKpiResponse>(
    join(base, `/api/tournament/kpi?${qs.toString()}`)
  );
}

/* =========================
 * Qualifier
 * ========================= */

export async function fetchQualifierGroups(base = defaultBase()) {
  const res = await fetchJson<{ groups: QualifierGroup[] }>(
    join(base, "/api/tournament/qualifier/groups")
  );
  return res.groups ?? [];
}

export async function fetchQualifierGroupStandings(groupId: string, base = defaultBase()) {
  return fetchJson<QualifierGroupStandings>(
    join(
      base,
      `/api/tournament/qualifier/groups/${encodeURIComponent(groupId)}/standings`
    )
  );
}

export async function fetchQualifierWildcards(base = defaultBase()) {
  return fetchJson<WildcardResponse>(
    join(base, "/api/tournament/qualifier/wildcards")
  );
}

export async function fetchQualifierWinners(base = defaultBase()) {
  return fetchJson<QualifierWinnersResponse>(
    join(base, "/api/tournament/qualifier/winners")
  );
}

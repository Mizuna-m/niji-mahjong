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

import type {
  FinalsBracketResponse,
  FinalsMatchesResponse,
  FinalsMatchResponse,
} from "@/lib/typesTournament";

/**
 * 実行環境ごとのベースURL戦略
 *
 * - Browser(Client Components):
 *     相対URL "/api/..." を使って rewrites を必ず通す（CORS回避、ホスト差分も吸収）
 * - Server(RSC/SSR):
 *     API_BASE_INTERNAL=http://api:3000 があればそれを使う（高速・確実）
 *     無ければ相対URL
 */
const API_BASE_INTERNAL =
  process.env.API_BASE_INTERNAL && process.env.API_BASE_INTERNAL.trim()
    ? process.env.API_BASE_INTERNAL.trim()
    : "";

// Clientでは絶対に相対に寄せる（ブラウザから http://api:3000 は見えない）
const API_BASE_CLIENT = "";

/** 実行環境判定（Next で browser は window がある） */
function defaultBase() {
  return typeof window === "undefined" ? API_BASE_INTERNAL : API_BASE_CLIENT;
}

/**
 * base + path を安全に結合する
 * - base が空なら /api/... の相対URL
 * - base が壊れてたら（例: "H"）相対URLへフォールバック
 */
function buildUrl(base: string, path: string) {
  if (!path.startsWith("/")) path = `/${path}`;

  // 相対URL（推奨）
  if (!base) return path;

  // base が "http://..." "https://..." 以外なら壊れてる可能性が高いので相対へ
  if (!/^https?:\/\//i.test(base)) return path;

  try {
    return new URL(path, base).toString();
  } catch {
    return path;
  }
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

/** options を共通化 */
type ApiOpts = { base?: string };

/* =========================
 * Games
 * ========================= */

export async function fetchGames(opts?: ApiOpts) {
  const base = opts?.base ?? defaultBase();
  return fetchJson<GamesListResponse>(buildUrl(base, "/api/games"));
}

export async function fetchGame(uuid: string, opts?: ApiOpts) {
  const base = opts?.base ?? defaultBase();
  return fetchJson<GameDetailResponse>(
    buildUrl(base, `/api/games/${encodeURIComponent(uuid)}`)
  );
}

/* =========================
 * Players
 * ========================= */

export async function fetchPlayers(opts?: ApiOpts) {
  const base = opts?.base ?? defaultBase();
  return fetchJson<PlayersListResponse>(buildUrl(base, "/api/players"));
}

export async function fetchPlayerSummary(playerId: string, opts?: ApiOpts) {
  const base = opts?.base ?? defaultBase();
  return fetchJson<PlayerSummaryResponse>(
    buildUrl(base, `/api/players/${encodeURIComponent(playerId)}`)
  );
}

/* =========================
 * Stats
 * ========================= */

export async function fetchLeaderboard(
  metric: LeaderboardMetric = "deltaTotal",
  limit = 50,
  opts?: ApiOpts
) {
  const base = opts?.base ?? defaultBase();
  const qs = new URLSearchParams({
    metric,
    limit: String(limit),
  });

  return fetchJson<LeaderboardResponse>(
    buildUrl(base, `/api/stats/leaderboard?${qs.toString()}`)
  );
}

export async function fetchCumulative(limitGames = 2000, opts?: ApiOpts) {
  const base = opts?.base ?? defaultBase();
  const qs = new URLSearchParams({ limitGames: String(limitGames) });

  return fetchJson<CumulativeResponse>(
    buildUrl(base, `/api/stats/cumulative?${qs.toString()}`)
  );
}

/* =========================
 * Tournament
 * ========================= */

export async function fetchTournamentMeta(opts?: ApiOpts) {
  const base = opts?.base ?? defaultBase();
  return fetchJson<TournamentMeta>(buildUrl(base, "/api/tournament/meta"));
}

/**
 * 事故防止のため「オブジェクト引数」
 */
export async function fetchTournamentKpi(opts?: {
  phase?: "qualifier" | "finals";
  base?: string;
}) {
  const phase = opts?.phase ?? "qualifier";
  const base = opts?.base ?? defaultBase();
  const qs = new URLSearchParams({ phase });

  return fetchJson<TournamentKpiResponse>(
    buildUrl(base, `/api/tournament/kpi?${qs.toString()}`)
  );
}

/* =========================
 * Qualifier
 * ========================= */

export async function fetchQualifierGroups(opts?: ApiOpts) {
  const base = opts?.base ?? defaultBase();
  const res = await fetchJson<{ groups: QualifierGroup[] }>(
    buildUrl(base, "/api/tournament/qualifier/groups")
  );
  return res.groups ?? [];
}

/**
 * fetchQualifierGroupStandings は “引数順事故” が起きやすいのでオブジェクト引数に統一。
 *
 * ✅ 正:
 *   fetchQualifierGroupStandings({ groupId })
 *   fetchQualifierGroupStandings({ groupId, base: "http://localhost:3001" })
 *
 * 互換:
 *   fetchQualifierGroupStandings(groupId)
 *   fetchQualifierGroupStandings(groupId, base)
 */
export async function fetchQualifierGroupStandings(
  arg1:
    | { groupId: string; base?: string }
    | string,
  arg2?: string
) {
  const groupId =
    typeof arg1 === "string" ? arg1 : arg1.groupId;

  const base =
    typeof arg1 === "string"
      ? (arg2 ?? defaultBase())
      : (arg1.base ?? defaultBase());

  if (!groupId) {
    throw new Error("groupId is required");
  }

  return fetchJson<QualifierGroupStandings>(
    buildUrl(
      base,
      `/api/tournament/qualifier/groups/${encodeURIComponent(groupId)}/standings`
    )
  );
}

export async function fetchQualifierWildcards(opts?: ApiOpts) {
  const base = opts?.base ?? defaultBase();
  return fetchJson<WildcardResponse>(
    buildUrl(base, "/api/tournament/qualifier/wildcards")
  );
}

export async function fetchQualifierWinners(opts?: ApiOpts) {
  const base = opts?.base ?? defaultBase();
  return fetchJson<QualifierWinnersResponse>(
    buildUrl(base, "/api/tournament/qualifier/winners")
  );
}

/* =========================
 * Finals
 * ========================= */

export async function fetchFinalsBracket(opts?: ApiOpts) {
  const base = opts?.base ?? defaultBase();
  return fetchJson<FinalsBracketResponse>(
    buildUrl(base, "/api/tournament/finals/bracket")
  );
}

export async function fetchFinalsMatches(opts?: ApiOpts) {
  const base = opts?.base ?? defaultBase();
  return fetchJson<FinalsMatchesResponse>(
    buildUrl(base, "/api/tournament/finals/matches")
  );
}

export async function fetchFinalsMatch(matchId: string, opts?: ApiOpts) {
  const base = opts?.base ?? defaultBase();
  if (!matchId) throw new Error("matchId is required");

  return fetchJson<FinalsMatchResponse>(
    buildUrl(base, `/api/tournament/finals/matches/${encodeURIComponent(matchId)}`)
  );
}

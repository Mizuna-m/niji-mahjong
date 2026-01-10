// src/lib/tournamentApi.ts
import type {
  TournamentKpiResponse,
  QualifierGroup,
  QualifierGroupStandings,
  WildcardResponse,
} from "@/lib/typesTournament";

/**
 * tournament 系はすべて相対URLで叩く
 * - Client: /api/... → rewrites 経由
 * - Server: Next.js が正しく解決
 */
async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    let msg = `${path} failed: ${res.status}`;
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
 * KPI
 * ========================= */

export async function fetchTournamentKpi(
  phase: "qualifier" | "finals" = "qualifier"
) {
  return getJson<TournamentKpiResponse>(
    `/api/tournament/kpi?phase=${encodeURIComponent(phase)}`
  );
}

/* =========================
 * Qualifier
 * ========================= */

export async function fetchQualifierGroups() {
  const r = await getJson<{ groups: QualifierGroup[] }>(
    `/api/tournament/qualifier/groups`
  );
  return r.groups ?? [];
}

export async function fetchQualifierGroupStandings(groupId: string) {
  if (!groupId) {
    throw new Error("groupId is required");
  }
  return getJson<QualifierGroupStandings>(
    `/api/tournament/qualifier/groups/${encodeURIComponent(groupId)}/standings`
  );
}

export async function fetchWildcards() {
  return getJson<WildcardResponse>(
    `/api/tournament/qualifier/wildcards`
  );
}

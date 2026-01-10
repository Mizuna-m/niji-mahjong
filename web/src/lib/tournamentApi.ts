// src/lib/tournamentApi.ts
import { API_BASE_PUBLIC } from "@/lib/api";
import type {
  TournamentKpiResponse,
  QualifierGroup,
  QualifierGroupStandings,
  WildcardResponse,
} from "@/lib/typesTournament";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_PUBLIC}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchTournamentKpi(phase: "qualifier" | "finals" = "qualifier") {
  return getJson<TournamentKpiResponse>(`/api/tournament/kpi?phase=${phase}`);
}

export async function fetchQualifierGroups() {
  const r = await getJson<{ groups: QualifierGroup[] }>(`/api/tournament/qualifier/groups`);
  return r.groups ?? [];
}

export async function fetchQualifierGroupStandings(groupId: string) {
  return getJson<QualifierGroupStandings>(`/api/tournament/qualifier/groups/${groupId}/standings`);
}

export async function fetchWildcards() {
  return getJson<WildcardResponse>(`/api/tournament/qualifier/wildcards`);
}

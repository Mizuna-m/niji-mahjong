// src/lib/typesTournament.ts
export type TournamentKpiResponse = {
  phase: "qualifier" | "finals";
  gamesTotal?: number | null;
  gamesPlayed: number;
  groupWinnersConfirmed?: number | null;
  wildcardSlots?: number | null;
  wildcardCut?: {
    rank: number;
    points: number;
    playerId?: string | null;
    displayName: string;
  } | null;
};

export type QualifierGroup = {
  groupId: string;
  label: string;
};

export type QualifierGroupStandingsRow = {
  playerId?: string | null;
  displayName: string;
  image?: string | null;
  games: number; // qualifierは基本1
  tournamentPoints: number; // 素点そのまま
  place?: number | null;    // 1位=1（想定）
  isWinner: boolean;
  qualified?: boolean | null;
};

export type QualifierGroupStandings = {
  groupId: string;
  tables: Array<{
    tableLabel?: string | null;
    title?: string | null;
    gameUuid: string;
    startTime?: number | null;
  }>;
  standings: QualifierGroupStandingsRow[];
};

export type WildcardCandidate = {
  rank: number;
  playerId?: string | null;
  displayName: string;
  image?: string | null;
  points: number;
  groupId?: string | null;
  gameUuid?: string | null;
};

export type WildcardResponse = {
  cutRank: number;
  cutPoints?: number | null;
  candidates: WildcardCandidate[];
};

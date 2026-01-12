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

// === Finals (Tournament Bracket) ===

export type FinalsPhase = "finals";

export type FinalsMatchStatus = "unplayed" | "scheduled" | "live" | "finished";

/** bracket 内の seat 情報（未確定枠は source を使う） */
export type FinalsSeat = {
  seat: 0 | 1 | 2 | 3;
  playerId?: string | null;

  // finals.yaml を playerId 指定にしても API で埋める想定（埋まらない場合もあるので optional）
  displayName?: string | null;
  image?: string | null;

  // 予選の表現と揃えるため残しておく（今は null でもOK）
  nickname?: string | null;
  tags?: string[] | null;

  // 例: "Q-A", "WC-1", "SF1-1st" など
  source?: string | null;
};

export type FinalsMatchResult = {
  finalScores: number[];      // len=4
  placeBySeat: number[];      // len=4 (1..4)
  winnerSeat: 0 | 1 | 2 | 3;
  deltaBySeat: number[];      // len=4
};

export type FinalsMatch = {
  matchId: string;
  label?: string | null;
  tableLabel?: string | null;
  title?: string | null;

  gameUuid?: string | null;
  status: FinalsMatchStatus;

  startTime?: number | null; // unix sec
  endTime?: number | null;   // unix sec

  seats: FinalsSeat[];

  result?: FinalsMatchResult | null;

  // 将来用（いまは空配列でもOK）
  advance?: any[];
};

export type FinalsRound = {
  roundId: string; // "QF" | "SF" | "F" など
  label: string;
  matches: FinalsMatch[];
};

export type FinalsBracketResponse = {
  phase: FinalsPhase;
  updatedAt?: string | null;  // あなたの例: Date string
  rounds: FinalsRound[];
};

export type FinalsMatchesResponse = {
  phase: FinalsPhase;
  matches: Array<{
    roundId: string;
    roundLabel: string;
    matchId: string;

    label?: string | null;
    tableLabel?: string | null;

    gameUuid?: string | null;
    status: FinalsMatchStatus;

    startTime?: number | null;
    endTime?: number | null;
  }>;
};

export type FinalsMatchResponse = {
  phase: FinalsPhase;
  updatedAt?: string | null;
  round: { roundId: string; label: string };
  match: FinalsMatch;
};

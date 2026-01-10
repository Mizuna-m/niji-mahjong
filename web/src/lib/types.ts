export type ErrorResponse = { error: string; details?: unknown };

export type TableInfo = {
  uuid?: string | null;
  label?: string | null;
  note?: string | null;
  name?: string | null; // 過去互換
};

export type ApiPlayer = {
  seat: number;
  nickname: string;
  playerId?: string | null;
  displayName?: string | null;
  image?: string | null;
};

export type PlayerEnriched = {
  seat?: number | null; // 0-3
  nickname: string;     // MahjongSoul nickname (project-unique)
  playerId: string;     // stable ID (overlay)
  displayName: string;  // pretty name
  image?: string | null;
  tags?: string[] | null;
};

export type PlayerProfile = {
  playerId: string;
  displayName: string;
  image?: string | null;
  tags: string[];
};

export type PlayerPill = {
  seat: number;
  label: string;        // 表示名（必須）
  playerId?: string;    // あればリンク
  image?: string | null;
};

export type GameListItem = {
  uuid: string;
  startTime: number;
  endTime: number;
  finalScores?: number[] | null;
  title?: string | null;
  table?: TableInfo | null;
  players: ApiPlayer[];
};

export type GamesListResponse = { games: GameListItem[] };

export type RuleInfo = {
  mode?: string | null;
  name?: string | null;
};

export type RoundId = {
  roundIndex: number;
  chang?: number;         // 追加: 0=東,1=南...
  ju?: number;            // 追加: 0..3
  honba: number;
  riichiSticks: number;
};


export type HuleEvent = {
  kind: "tsumo" | "ron";
  winners: number[];      // seats
  loser?: number | null;  // seat
  deltaScores: number[];  // 4 items
};

export type Round = {
  id: RoundId;
  roundName?: string | null;      // 追加
  roundNameLong?: string | null;  // 追加（例: "東1局 1本場"）
  hule?: HuleEvent | null;
};

export type PlayerStat = {
  seat: number;
  nickname: string;
  displayName: string;
  playerId: string;
  image?: string | null;
  tags?: string[] | null;

  games: number;
  rounds: number;

  deltaTotal: number;
  hule: number;
  tsumo: number;
  ron: number;
  dealIn: number;
  riichi: number;
  calls: number;
  top1: number;
};

export type DerivedGame = {
  uuid: string;
  startTime: number;
  endTime: number;
  rule: RuleInfo;
  players: PlayerEnriched[];
  finalScores?: number[] | null;
  rounds: Round[];
  playerStats: PlayerStat[];
  parseNotes?: string[];
};

export type GameDetailResponse = {
  uuid: string;
  title?: string | null;      // ← 追加
  table: TableInfo;
  derived: DerivedGame;
};

export type PlayersListResponse = { players: PlayerProfile[] };

export type PlayerAggregate = {
  games: number;
  rounds: number;
  deltaTotal: number;
  hule: number;
  tsumo: number;
  ron: number;
  dealIn: number;
  riichi: number;
  calls: number;
  top1: number;
};

export type PlayerRates = {
  hulePerRound: number;
  dealInPerRound: number;
  riichiPerRound: number;
  topRate: number;
};

export type PlayerRecentOpponent = {
  seat: number;
  nickname: string;
  playerId?: string | null;
  displayName: string;
  image?: string | null;
};

export type PlayerRecentGame = {
  uuid: string;
  startTime: number;
  delta: number;
  place?: number | null;

  tableLabel?: string | null;
  title?: string | null;

  opponents: PlayerRecentOpponent[];
};

export type PlayerSummaryResponse = {
  profile: PlayerProfile;
  nicknames: string[];
  aggregate: PlayerAggregate;
  rates: PlayerRates;
  recentGames: PlayerRecentGame[];
};

export type LeaderboardMetric =
  | "deltaTotal"
  | "hule"
  | "dealIn"
  | "riichi"
  | "calls"
  | "rounds"
  | "top1";

export type LeaderboardRow = {
  rank: number;
  playerId: string;
  displayName: string;
  image?: string | null;
  value: number;
  games: number;
};

export type LeaderboardResponse = {
  metric: LeaderboardMetric;
  metricLabel: string;
  leaderboard: LeaderboardRow[];
};

export type CumulativeGameIndex = {
  uuid: string;
  startTime: number;
  endTime: number;
};

export type CumulativePoint = {
  gameIndex: number;
  value: number;
};

export type CumulativeSeries = {
  playerId: string;
  displayName: string;
  image?: string | null;
  points: CumulativePoint[];
};

export type CumulativeResponse = {
  games: CumulativeGameIndex[];
  players: PlayerProfile[];
  series: CumulativeSeries[];
};

export type Seat = 0 | 1 | 2 | 3;

export type EnrichedPlayer = {
  seat: Seat;
  nickname: string;
  playerId: string | null;
  displayName: string;
  image?: string | null;
  tags?: string[] | null;
};

/** tournament */
export type TournamentMeta = {
  season: string;
  qualifier: {
    groups: number;
    wildcards: number;
    mode: "tonpuu" | "hanchan";
    umaoka: boolean;
    startScore: number;
    gamesPerPlayer: number;
    wildcardRanking: { basis: "raw_final_score"; tieBreak: "seat_order" };
  };
  finals: { name: string; players: number; mode: "tonpuu" | "hanchan"; advance?: number | null; games?: number | null }[];
};

export type TournamentKpiResponse = {
  phase: "qualifier" | "finals";
  gamesTotal?: number | null;
  gamesPlayed: number;
  groupWinnersConfirmed?: number | null;
  wildcardSlots?: number | null;
  wildcardCut?: { rank: number; points: number; playerId?: string | null; displayName: string } | null;
};

export type QualifierGroup = { groupId: string; label: string };

export type QualifierGroupStandingsTable = {
  tableLabel?: string | null;
  title?: string | null;
  gameUuid: string;
  startTime?: number | null;
};

export type QualifierGroupStandingsRow = {
  playerId?: string | null;
  displayName: string;
  image?: string | null;
  games: number; // qualifierは基本1
  tournamentPoints: number; // 素点(finalScores)そのまま
  place?: number | null; // ここは「1位=1」想定で扱う（+1しない）
  isWinner: boolean;
  qualified?: boolean | null;
};

export type QualifierGroupStandings = {
  groupId: string;
  tables: QualifierGroupStandingsTable[];
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

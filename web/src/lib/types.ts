export type ErrorResponse = { error: string; details?: unknown };

export type TableInfo = {
  name?: string | null;
  id?: number | null;
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

export type GameListItem = {
  uuid: string;
  startTime: number; // epoch sec
  endTime: number;   // epoch sec
  table?: TableInfo;
  players: PlayerEnriched[];
  finalScores?: number[] | null; // 4 items
};

export type GamesListResponse = { games: GameListItem[] };

export type RuleInfo = {
  mode?: string | null;
  name?: string | null;
};

export type RoundId = {
  roundIndex: number;
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
  huleRate: number;
  dealInRate: number;
  riichiRate: number;
  top1Rate: number;
};

export type PlayerRecentGame = {
  uuid: string;
  startTime: number;
  endTime: number;
  delta: number;
  place?: number | null;
  finalScores?: number[] | null;
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

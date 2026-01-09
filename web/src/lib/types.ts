// web/src/lib/types.ts
export type Seat = 0 | 1 | 2 | 3;

export type PlayerRef = {
  seat: Seat;
  nickname: string;
};

export type PlayerStats = {
  seat: Seat;
  nickname: string;
  rounds: number;
  hule: number;
  tsumo: number;
  ron: number;
  dealIn: number;
  riichi: number;
  calls: number;
  deltaTotal: number;
};

export type HuleEvent = {
  kind: "tsumo" | "ron";
  winners: Seat[];
  loser?: Seat;
  han?: number;
  fu?: number;
  point?: number;
  deltaScores?: number[]; // len=4
};

export type RoundSummary = {
  id: {
    roundIndex: number;
    honba: number;
    riichiSticks: number;
  };
  startScores: number[];
  dealer: Seat;
  riichiBy: Seat[];
  callsBy: Seat[];
  endScores?: number[];
  hule?: HuleEvent;
};

export type DerivedGame = {
  uuid: string;
  startTime?: number;
  endTime?: number;
  players: PlayerRef[];
  finalScores?: number[];
  rounds: RoundSummary[];
  playerStats?: PlayerStats[];
  parseNotes?: string[];
};

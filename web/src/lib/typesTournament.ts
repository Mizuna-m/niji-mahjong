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

// export type FinalsPhase = "finals";

// export type FinalsMatchStatus = "unplayed" | "scheduled" | "live" | "finished";

/** bracket 内の seat 情報（未確定枠は source を使う） */
// export type FinalsSeat = {
//   seat: 0 | 1 | 2 | 3;
//   playerId?: string | null;

//   // finals.yaml を playerId 指定にしても API で埋める想定（埋まらない場合もあるので optional）
//   displayName?: string | null;
//   image?: string | null;

//   // 予選の表現と揃えるため残しておく（今は null でもOK）
//   nickname?: string | null;
//   tags?: string[] | null;

//   // 例: "Q-A", "WC-1", "SF1-1st" など
//   source?: string | null;
// };

export type FinalsMatchResult = {
  finalScores: number[];      // len=4
  placeBySeat: number[];      // len=4 (1..4)
  winnerSeat: 0 | 1 | 2 | 3;
  deltaBySeat: number[];      // len=4
};

// export type FinalsMatch = {
//   matchId: string;
//   label?: string | null;
//   tableLabel?: string | null;
//   title?: string | null;

//   gameUuid?: string | null;
//   status: FinalsMatchStatus;

//   startTime?: number | null; // unix sec
//   endTime?: number | null;   // unix sec

//   seats: FinalsSeat[];

//   result?: FinalsMatchResult | null;

//   // 将来用（いまは空配列でもOK）
//   advance?: any[];
// };

export type FinalsRound = {
  roundId: string; // "QF" | "SF" | "F" など
  label: string;
  matches: FinalsMatch[];
};

// export type FinalsBracketResponse = {
//   phase: FinalsPhase;
//   updatedAt?: string | null;  // あなたの例: Date string
//   rounds: FinalsRound[];
// };

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

// export type FinalsMatchResponse = {
//   phase: FinalsPhase;
//   updatedAt?: string | null;
//   round: { roundId: string; label: string };
//   match: FinalsMatch;
// };

/** =========================
 *  Finals (決勝トーナメント)
 *  ========================= */

export type FinalsPhase = "finals";

export type FinalsMatchStatus =
  | "unplayed"
  | "scheduled"
  | "live"
  | "finished"
  | (string & {});

/** ブラケット上の1席（固定枠） */
export type FinalsBracketSeat = {
  seat: number; // 0..3
  playerId?: string | null;

  /** 表示用 */
  displayName?: string | null;
  nickname?: string | null;
  image?: string | null;
  tags?: string[] | null;

  /**
   * まだプレイヤーが確定していない枠の由来表示
   * 例: "SF-9-1st"
   */
  source?: string | null;
};

/**
 * 試合結果（1戦分 or 合算）
 * - 2戦合計を扱うので、将来の拡張に備えて `note`/`byGame` を持たせています
 */
export type FinalsBracketResult = {
  /** seat順の素点（合算 or 1戦分） */
  finalScores: number[]; // length=4
  /** 順位（1がトップ）。seat順 */
  placeBySeat: number[]; // length=4
  /** 優勝/勝ち上がりの代表seat（同点など未確定なら null を許容） */
  winnerSeat: number | null;
  /** seat順の増減（表示用。無い場合もある） */
  deltaBySeat?: number[] | null;

  /**
   * 2戦合計・3戦目など曖昧さがある場合の注記
   * 例: "2戦合計（同点時は追加戦の可能性あり）"
   */
  note?: string | null;

  /** 1戦ごとの内訳を並べたい場合に利用（APIが対応したら生かせる） */
  byGame?: Array<{
    gameUuid: string | null;
    finalScores: number[];
    placeBySeat: number[];
    deltaBySeat?: number[] | null;
  }> | null;
};

export type FinalsAdvance = {
  fromSeat: number; // 0..3
  toMatchId: string;
  toSeat: number; // 0..3
};

/**
 * ブラケット上の1試合
 * - 現状APIは `gameUuid` 単体だが、決勝2戦/追加戦を見据えて `gameUuids` も許容
 */
export type FinalsBracketMatch = {
  matchId: string;
  label?: string | null;
  tableLabel?: string | null;
  title?: string | null;

  /** 旧: 単発UUID（未確定なら null） */
  gameUuid?: string | null;

  /** 新: 複数戦（2戦/追加戦）対応用 */
  gameUuids?: Array<string | null> | null;

  status: FinalsMatchStatus;

  /** unix秒 or null */
  startTime?: number | null;
  endTime?: number | null;

  seats: FinalsBracketSeat[];

  /** 2戦合計など。未確定なら null */
  result: FinalsBracketResult | null;

  /** 勝ち上がり情報 */
  advance: FinalsAdvance[];
};

export type FinalsBracketRound = {
  roundId: string; // "QF" | "SF" | "F" など
  label: string;
  matches: FinalsBracketMatch[];
};

export type FinalsBracketResponse = {
  phase: FinalsPhase;
  updatedAt: string;
  rounds: FinalsBracketRound[];
};

export type FinalsMatchListResponse = {
  phase: FinalsPhase;
  matches: Array<{
    roundId: string;
    roundLabel?: string | null;
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
  updatedAt: string;
  round: { roundId: string; label: string };
  match: FinalsBracketMatch;
};

/** ---- 互換alias（コンポーネント側の既存importを壊さない） ---- */
export type FinalsSeat = FinalsBracketSeat;
export type FinalsMatch = FinalsBracketMatch;

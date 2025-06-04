
export interface Team {
  id: string;
  name: string;
  koreanName: string;
  logoColor: string;
  textColor: string;
  city: string;
  batting: number; // Overall batting strength (0-100)
  pitching: number; // Overall pitching strength (0-100)
  defense: number; // Overall defensive strength (0-100)
}

export interface Game {
  id:string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  played: boolean;
  week: number;
  log?: string[]; // Optional: For detailed game log
}

export interface StandingsEntry {
  teamId: string;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  winPercentage: number;
  points: number; // For sorting: W*1 + D*0.5
}

export enum TeamMorale {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum FanHappinessLevel {
  ECSTATIC = 'ECSTATIC', // 광란
  HAPPY = 'HAPPY',     // 행복
  NEUTRAL = 'NEUTRAL',   // 보통
  DISAPPOINTED = 'DISAPPOINTED', // 실망
  ANGRY = 'ANGRY',     // 분노
}

export enum TicketPriceLevel {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export interface BudgetAllocation {
  trainingBatting: number; // Percentage for Batting Training
  trainingPitching: number; // Percentage for Pitching Training
  trainingDefense: number; // Percentage for Defense Training
  marketing: number; // Percentage for Marketing & Fan Service
  facilities: number; // Percentage for Facility Management
  scouting: number;  // Percentage for Player Scouting
  medical: number;   // Percentage for Medical Staff & Player Condition
}

export interface FinancialData {
  budget: number;
  incomeHistory: { week: number; amount: number; description: string }[];
  expenseHistory: { week: number; amount: number; description: string }[];
  budgetAllocation: BudgetAllocation; // For user's team
  effectiveBatting?: number; // Optional: to store effective stats after bonuses for display
  effectivePitching?: number;
  effectiveDefense?: number;
  fanHappiness: number; // Score from 0-100
  ticketPriceLevel: TicketPriceLevel;
}

export interface SponsorshipOffer {
  id: string;
  sponsorName: string;
  koreanSponsorName: string;
  amount: number;
  description: string;
  moraleEffect?: {
    type: 'boost' | 'penalty';
    chance: number; // 0-1
  };
}

export interface SponsorshipOfferTemplate {
  sponsorName: string;
  koreanSponsorName: string;
  minAmount: number;
  maxAmount: number;
  description: string;
  moraleEffect?: {
    type: 'boost' | 'penalty';
    chance: number; // 0-1
  };
}

export interface EffectiveStatsDataPoint {
  week: number;
  batting: number;
  pitching: number;
  defense: number;
}

export interface SpecialDrillTemplate {
  id: string;
  name: string;
  koreanName: string;
  description: string;
  koreanDescription: string;
  cost: number;
  statBoosted: 'batting' | 'pitching' | 'defense' | 'all';
  boostAmount: number;
  durationWeeks: number;
}

export interface ActiveSpecialDrill extends SpecialDrillTemplate {
  remainingWeeks: number;
}

export interface HistoricalSeasonRecord {
  seasonNumber: number;
  year: number;
  teamId: string;
  teamKoreanName: string;
  rank: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface GameState {
  selectedTeamId: string | null;
  currentWeek: number; // 1-indexed
  schedule: Game[][]; // Array of weeks, each week is an array of games
  standings: StandingsEntry[];
  teamFinancials: Record<string, FinancialData>; // Keyed by teamId
  allTeams: Team[];
  seasonEnded: boolean;
  gamesPlayedThisWeekInfo: { game: Game; homeTeamName: string, awayTeamName: string }[] | null;
  statusMessage: string; // For general messages like "Season started"
  teamMorale: Record<string, TeamMorale>; // Keyed by teamId
  activeSponsorshipOffer: SponsorshipOffer | null; 
  userGamePlayByPlayLog: string[] | null; // Log for the user's team game
  showPlayByPlayModal: boolean; // Controls visibility of the play-by-play modal
  isPlayByPlayFullyDisplayed: boolean; 
  scoutingReportMessage?: string | null; // For messages from scouting
  userTeamEffectiveStatsHistory: EffectiveStatsDataPoint[]; // History of user team's effective stats
  availableSpecialDrills: SpecialDrillTemplate[];
  activeSpecialDrill: ActiveSpecialDrill | null;
  isCpuDelegated: boolean; 
  currentSeasonYear: number; // New: Current in-game year
  historicalSeasonResults: HistoricalSeasonRecord[]; // New: History of past seasons
}

export enum GameActionType {
  SELECT_TEAM = 'SELECT_TEAM',
  SIMULATE_WEEK = 'SIMULATE_WEEK',
  START_NEW_SEASON = 'START_NEW_SEASON',
  CLOSE_RESULTS_MODAL = 'CLOSE_RESULTS_MODAL',
  BOOST_MORALE = 'BOOST_MORALE',
  ACCEPT_SPONSORSHIP = 'ACCEPT_SPONSORSHIP',
  REJECT_SPONSORSHIP = 'REJECT_SPONSORSHIP',
  ACKNOWLEDGE_PLAY_BY_PLAY = 'ACKNOWLEDGE_PLAY_BY_PLAY',
  PLAY_BY_PLAY_FULLY_DISPLAYED = 'PLAY_BY_PLAY_FULLY_DISPLAYED', 
  UPDATE_BUDGET_ALLOCATION = 'UPDATE_BUDGET_ALLOCATION',
  CLEAR_SCOUTING_MESSAGE = 'CLEAR_SCOUTING_MESSAGE',
  SET_TICKET_PRICE = 'SET_TICKET_PRICE',
  SELECT_SPECIAL_DRILL = 'SELECT_SPECIAL_DRILL',
  SKIP_SPECIAL_DRILLS = 'SKIP_SPECIAL_DRILLS', 
  TOGGLE_CPU_DELEGATION = 'TOGGLE_CPU_DELEGATION',
  RESET_GAME = 'RESET_GAME', // New action to reset the entire game
}

export type GameAction =
  | { type: GameActionType.SELECT_TEAM; payload: string }
  | { type: GameActionType.SIMULATE_WEEK }
  | { type: GameActionType.START_NEW_SEASON }
  | { type: GameActionType.CLOSE_RESULTS_MODAL }
  | { type: GameActionType.BOOST_MORALE }
  | { type: GameActionType.ACCEPT_SPONSORSHIP }
  | { type: GameActionType.REJECT_SPONSORSHIP }
  | { type: GameActionType.ACKNOWLEDGE_PLAY_BY_PLAY }
  | { type: GameActionType.PLAY_BY_PLAY_FULLY_DISPLAYED } 
  | { type: GameActionType.UPDATE_BUDGET_ALLOCATION; payload: BudgetAllocation }
  | { type: GameActionType.CLEAR_SCOUTING_MESSAGE }
  | { type: GameActionType.SET_TICKET_PRICE; payload: TicketPriceLevel }
  | { type: GameActionType.SELECT_SPECIAL_DRILL; payload: string } // drillId
  | { type: GameActionType.SKIP_SPECIAL_DRILLS } 
  | { type: GameActionType.TOGGLE_CPU_DELEGATION }
  | { type: GameActionType.RESET_GAME }; // New

export interface ChartDataItem {
  name: string; // Corresponds to 'week' for most charts
  [key: string]: number | string;
}

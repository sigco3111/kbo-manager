
import { Team, TeamMorale, SponsorshipOfferTemplate, BudgetAllocation, FanHappinessLevel, TicketPriceLevel, SpecialDrillTemplate } from './types';

export const KBO_TEAMS: Team[] = [
  { id: 'bears', name: 'Doosan Bears', koreanName: '두산 베어스', logoColor: 'bg-gray-700', textColor: 'text-white', city: 'Seoul', batting: 82, pitching: 80, defense: 83 },
  { id: 'twins', name: 'LG Twins', koreanName: 'LG 트윈스', logoColor: 'bg-red-700', textColor: 'text-white', city: 'Seoul', batting: 85, pitching: 84, defense: 82 },
  { id: 'wiz', name: 'KT Wiz', koreanName: 'KT 위즈', logoColor: 'bg-black', textColor: 'text-white', city: 'Suwon', batting: 80, pitching: 81, defense: 79 },
  { id: 'lions', name: 'Samsung Lions', koreanName: '삼성 라이온즈', logoColor: 'bg-blue-700', textColor: 'text-white', city: 'Daegu', batting: 77, pitching: 75, defense: 76 },
  { id: 'dinos', name: 'NC Dinos', koreanName: 'NC 다이노스', logoColor: 'bg-sky-600', textColor: 'text-white', city: 'Changwon', batting: 79, pitching: 78, defense: 78 },
  { id: 'landers', name: 'SSG Landers', koreanName: 'SSG 랜더스', logoColor: 'bg-red-500', textColor: 'text-white', city: 'Incheon', batting: 76, pitching: 72, defense: 74 },
  { id: 'tigers', name: 'KIA Tigers', koreanName: 'KIA 타이거즈', logoColor: 'bg-red-900', textColor: 'text-white', city: 'Gwangju', batting: 88, pitching: 85, defense: 86 },
  { id: 'giants', name: 'Lotte Giants', koreanName: '롯데 자이언츠', logoColor: 'bg-orange-500', textColor: 'text-black', city: 'Busan', batting: 73, pitching: 70, defense: 71 },
  { id: 'eagles', name: 'Hanwha Eagles', koreanName: '한화 이글스', logoColor: 'bg-orange-600', textColor: 'text-white', city: 'Daejeon', batting: 70, pitching: 68, defense: 70 },
  { id: 'heroes', name: 'Kiwoom Heroes', koreanName: '키움 히어로즈', logoColor: 'bg-purple-800', textColor: 'text-white', city: 'Seoul', batting: 78, pitching: 74, defense: 75 },
];

export const INITIAL_BUDGET = 500000000; // 500 Million KRW
export const WEEKLY_EXPENSES = 50000000; // 50 Million KRW for salaries etc.
export const INCOME_PER_HOME_GAME_WIN = 70000000; // 70M KRW
export const INCOME_PER_HOME_GAME_LOSS_OR_DRAW = 40000000; // 40M KRW

export const GAMES_AGAINST_EACH_OPPONENT = 4; // Each team plays every other team 4 times (2 home, 2 away)
export const TOTAL_WEEKS = (KBO_TEAMS.length - 1) * GAMES_AGAINST_EACH_OPPONENT; // Total logical game weeks in a season
export const INITIAL_SEASON_YEAR = 2024; // Starting year for the game

// Team Morale Constants
export const INITIAL_MORALE: TeamMorale = TeamMorale.MEDIUM;
export const MORALE_BOOST_COST = 10000000; // 10 Million KRW
export const LOW_BUDGET_THRESHOLD_FOR_MORALE = 50000000; // 50 Million KRW

export const MORALE_STAT_MODIFIERS: Record<TeamMorale, number> = {
  [TeamMorale.VERY_LOW]: -3,
  [TeamMorale.LOW]: -1,
  [TeamMorale.MEDIUM]: 0,
  [TeamMorale.HIGH]: +1,
  [TeamMorale.VERY_HIGH]: +3,
};

export const MORALE_DESCRIPTIONS: Record<TeamMorale, string> = {
  [TeamMorale.VERY_LOW]: '매우 낮음',
  [TeamMorale.LOW]: '낮음',
  [TeamMorale.MEDIUM]: '보통',
  [TeamMorale.HIGH]: '높음',
  [TeamMorale.VERY_HIGH]: '매우 높음',
};

export const MORALE_WIN_INCREASE_CHANCE = 0.7;
export const MORALE_LOSS_DECREASE_CHANCE = 0.7;
export const MORALE_DRAW_SHIFT_TO_MEDIUM_CHANCE = 0.3;
export const MORALE_LOW_BUDGET_NEGATIVE_IMPACT_CHANCE = 0.5; 
export const MORALE_BOOST_SUCCESS_RATE = 0.8;

// Fan Happiness Constants
export const INITIAL_FAN_HAPPINESS = 50; // Score 0-100, starts at Neutral
export const FAN_HAPPINESS_LEVELS: Record<FanHappinessLevel, {min: number, max: number, description: string, attendanceModifier: number}> = {
    [FanHappinessLevel.ANGRY]:      {min: 0,  max: 19, description: "분노", attendanceModifier: -0.30},
    [FanHappinessLevel.DISAPPOINTED]:{min: 20, max: 39, description: "실망", attendanceModifier: -0.15},
    [FanHappinessLevel.NEUTRAL]:    {min: 40, max: 59, description: "보통", attendanceModifier: 0.0},
    [FanHappinessLevel.HAPPY]:      {min: 60, max: 79, description: "행복", attendanceModifier: 0.10},
    [FanHappinessLevel.ECSTATIC]:   {min: 80, max: 100,description: "광란", attendanceModifier: 0.20},
};

export const TICKET_PRICE_LEVELS: Record<TicketPriceLevel, {description: string, incomeModifier: number, happinessImpact: number}> = {
    [TicketPriceLevel.VERY_LOW]: {description: "매우 저렴", incomeModifier: 0.80, happinessImpact: 2}, // Small positive impact or less negative
    [TicketPriceLevel.LOW]:      {description: "저렴",     incomeModifier: 0.90, happinessImpact: 1},
    [TicketPriceLevel.NORMAL]:   {description: "보통",     incomeModifier: 1.00, happinessImpact: 0},
    [TicketPriceLevel.HIGH]:     {description: "비쌈",     incomeModifier: 1.15, happinessImpact: -2}, // Negative impact
    [TicketPriceLevel.VERY_HIGH]:{description: "매우 비쌈", incomeModifier: 1.30, happinessImpact: -4}, // Strong negative impact
};
export const DEFAULT_TICKET_PRICE_LEVEL = TicketPriceLevel.NORMAL;

// Happiness change points
export const HAPPINESS_HOME_WIN = 3;
export const HAPPINESS_AWAY_WIN = 2;
export const HAPPINESS_HOME_LOSS = -4;
export const HAPPINESS_AWAY_LOSS = -3;
export const HAPPINESS_DRAW = 0;
export const HAPPINESS_WIN_STREAK_BONUS = 1; // Per game in streak (e.g. 3+ wins)
export const HAPPINESS_LOSS_STREAK_MALUS = -1; // Per game in streak
export const HAPPINESS_MARKETING_EFFECT = 0.05; // Multiplier for marketing budget % deviation from default
export const HAPPINESS_LEAGUE_RANK_EFFECT = { top3: 1, bottom3: -1 }; // Points per week
export const HAPPINESS_MORALE_SPILLOVER_HIGH = 1; // If team morale is HIGH/VERY_HIGH
export const HAPPINESS_MORALE_SPILLOVER_LOW = -1; // If team morale is LOW/VERY_LOW
export const MAX_FAN_HAPPINESS = 100;
export const MIN_FAN_HAPPINESS = 0;


// Budget Allocation Constants
export const DEFAULT_BUDGET_ALLOCATION: BudgetAllocation = {
  trainingBatting: 15, 
  trainingPitching: 15,
  trainingDefense: 10, 
  marketing: 20,   
  facilities: 15,  
  scouting: 15,    
  medical: 10,     
};

export const DEFAULT_TRAINING_BATTING_ALLOCATION = 15;
export const DEFAULT_TRAINING_PITCHING_ALLOCATION = 15;
export const DEFAULT_TRAINING_DEFENSE_ALLOCATION = 10;
export const DEFAULT_MARKETING_ALLOCATION = 20;
export const DEFAULT_MEDICAL_ALLOCATION = 10; // For Player Condition & Morale Resilience

export const TRAINING_STAT_POINT_DIVISOR = 10; 
export const MAX_TRAINING_STAT_EFFECT = 2;  

export const MARKETING_ALLOCATION_INCOME_DIVISOR = 10; 
export const MAX_MARKETING_INCOME_EFFECT_PERCENT = 10;

export const FACILITY_HIGH_ALLOCATION_THRESHOLD = DEFAULT_BUDGET_ALLOCATION.facilities + 10; 
export const FACILITY_LOW_ALLOCATION_THRESHOLD = DEFAULT_BUDGET_ALLOCATION.facilities - 7;  
export const FACILITY_MORALE_IMPACT_CHANCE = 0.25;

export const SCOUTING_HIGH_ALLOCATION_THRESHOLD = DEFAULT_BUDGET_ALLOCATION.scouting + 10; 
export const SCOUTING_DISCOVERY_CHANCE = 0.15; 

export const MEDICAL_HIGH_ALLOCATION_THRESHOLD = DEFAULT_MEDICAL_ALLOCATION + 7; // Threshold for better morale resilience
export const MEDICAL_MORALE_RESILIENCE_EFFECT_CHANCE = 0.25; // Chance to reduce morale drop or boost morale gain

// Sponsorship Constants
export const SPONSORSHIP_OFFER_CHANCE_PER_WEEK = 0.2; 
export const POTENTIAL_SPONSORSHIP_OFFERS: SponsorshipOfferTemplate[] = [
  {
    sponsorName: "Local Chicken Shack",
    koreanSponsorName: "동네 치킨 맛집",
    minAmount: 5000000, 
    maxAmount: 15000000, 
    description: "지역 사회 발전에 기여하는 동네 치킨집에서 소정의 후원금을 제안했습니다.",
  },
  {
    sponsorName: "Rising IT Startup",
    koreanSponsorName: "신생 IT 스타트업",
    minAmount: 20000000, 
    maxAmount: 50000000, 
    description: "혁신적인 기술을 개발하는 IT 스타트업에서 구단과의 파트너십을 제안합니다. 함께 성장할 기회입니다!",
    moraleEffect: { type: 'boost', chance: 0.2 },
  },
  {
    sponsorName: "Regional Beverage Co.",
    koreanSponsorName: "지역 음료 회사",
    minAmount: 10000000, 
    maxAmount: 30000000, 
    description: "오랜 전통의 지역 음료 회사에서 팬들을 위한 공동 프로모션을 제안합니다.",
  },
  {
    sponsorName: "Global Tech Corp",
    koreanSponsorName: "글로벌 테크 기업",
    minAmount: 50000000, 
    maxAmount: 100000000, 
    description: "세계적인 테크 기업에서 구단의 첨단 이미지와 시너지를 낼 수 있는 대규모 스폰서십을 제안합니다.",
    moraleEffect: { type: 'boost', chance: 0.35 },
  },
  {
    sponsorName: "Slightly Shady Investment Firm",
    koreanSponsorName: "수상한 투자 회사",
    minAmount: 30000000, 
    maxAmount: 75000000, 
    description: "빠른 성장을 약속하는 투자 회사에서 거액의 후원금을 제안하지만, 평판에 대한 우려가 약간 있습니다.",
    moraleEffect: { type: 'penalty', chance: 0.25 },
  },
];

// Special Training Drills Constants
export const POTENTIAL_SPECIAL_DRILLS: SpecialDrillTemplate[] = [
  {
    id: 'drill_bat_power',
    name: 'Power Hitting Focus',
    koreanName: '장타력 집중 훈련',
    description: 'Focuses on increasing slugging power and extra-base hits.',
    koreanDescription: '장타력 및 추가 진루타 생산 능력 향상에 집중합니다.',
    cost: 7500000, // 7.5M KRW
    statBoosted: 'batting',
    boostAmount: 2, // Moderate boost to batting
    durationWeeks: 2,
  },
  {
    id: 'drill_bat_contact',
    name: 'Contact Hitting Clinic',
    koreanName: '정교한 타격 클리닉',
    description: 'Aims to improve batting average and on-base percentage.',
    koreanDescription: '타율 및 출루율 향상을 목표로 합니다.',
    cost: 6000000, // 6M KRW
    statBoosted: 'batting',
    boostAmount: 1, // Smaller boost, potentially more consistent
    durationWeeks: 2,
  },
  {
    id: 'drill_pitch_control',
    name: 'Precision Pitching Drill',
    koreanName: '제구력 집중 훈련',
    description: 'Sharpens pitchers\' control and reduces walks.',
    koreanDescription: '투수들의 제구력을 가다듬어 볼넷 허용을 줄입니다.',
    cost: 8000000, // 8M KRW
    statBoosted: 'pitching',
    boostAmount: 2,
    durationWeeks: 2,
  },
  {
    id: 'drill_pitch_stamina',
    name: 'Pitcher Stamina Building',
    koreanName: '투수 체력 강화',
    description: 'Helps pitchers maintain effectiveness longer into games.',
    koreanDescription: '투수들이 경기 후반까지 효과적인 투구를 유지하도록 돕습니다.',
    cost: 5000000, // 5M KRW
    statBoosted: 'pitching',
    boostAmount: 1,
    durationWeeks: 3, // Longer duration for stamina
  },
  {
    id: 'drill_def_agility',
    name: 'Defensive Agility Course',
    koreanName: '수비 민첩성 강화 코스',
    description: 'Improves fielders\' range and reaction time.',
    koreanDescription: '야수들의 수비 범위와 반응 속도를 향상시킵니다.',
    cost: 7000000, // 7M KRW
    statBoosted: 'defense',
    boostAmount: 2,
    durationWeeks: 2,
  },
  {
    id: 'drill_def_teamwork',
    name: 'Team Defensive Coordination',
    koreanName: '팀 수비 조직력 강화',
    description: 'Enhances communication and execution on defensive plays.',
    koreanDescription: '수비 시 팀원 간의 소통과 협력 플레이를 강화합니다.',
    cost: 5500000, // 5.5M KRW
    statBoosted: 'defense',
    boostAmount: 1,
    durationWeeks: 2,
  },
  {
    id: 'drill_all_mental_game',
    name: 'Mental Game Workshop',
    koreanName: '멘탈 게임 워크샵',
    description: 'Improves focus and clutch performance across the team.',
    koreanDescription: '팀 전체의 집중력과 중요한 순간의 경기력을 향상시킵니다.',
    cost: 10000000, // 10M KRW
    statBoosted: 'all', // Affects all stats slightly
    boostAmount: 1,
    durationWeeks: 1, // Shorter, intensive workshop
  },
];
export const MAX_DRILLS_OFFERED = 2; // Show 2 drills to choose from

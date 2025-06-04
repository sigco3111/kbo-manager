
import { Team, Game, StandingsEntry, FinancialData, TeamMorale, SponsorshipOffer, SponsorshipOfferTemplate, BudgetAllocation, FanHappinessLevel, TicketPriceLevel, SpecialDrillTemplate, ActiveSpecialDrill } from '../types';
import { 
  INITIAL_BUDGET, WEEKLY_EXPENSES, INCOME_PER_HOME_GAME_WIN, 
  INCOME_PER_HOME_GAME_LOSS_OR_DRAW, GAMES_AGAINST_EACH_OPPONENT,
  INITIAL_MORALE, MORALE_STAT_MODIFIERS, LOW_BUDGET_THRESHOLD_FOR_MORALE,
  MORALE_WIN_INCREASE_CHANCE, MORALE_LOSS_DECREASE_CHANCE, MORALE_DRAW_SHIFT_TO_MEDIUM_CHANCE,
  MORALE_LOW_BUDGET_NEGATIVE_IMPACT_CHANCE,
  SPONSORSHIP_OFFER_CHANCE_PER_WEEK, POTENTIAL_SPONSORSHIP_OFFERS,
  DEFAULT_BUDGET_ALLOCATION, 
  DEFAULT_TRAINING_BATTING_ALLOCATION, DEFAULT_TRAINING_PITCHING_ALLOCATION, DEFAULT_TRAINING_DEFENSE_ALLOCATION, 
  DEFAULT_MARKETING_ALLOCATION, DEFAULT_MEDICAL_ALLOCATION,
  TRAINING_STAT_POINT_DIVISOR, MAX_TRAINING_STAT_EFFECT,
  MARKETING_ALLOCATION_INCOME_DIVISOR, MAX_MARKETING_INCOME_EFFECT_PERCENT,
  FACILITY_HIGH_ALLOCATION_THRESHOLD, FACILITY_LOW_ALLOCATION_THRESHOLD, FACILITY_MORALE_IMPACT_CHANCE,
  SCOUTING_HIGH_ALLOCATION_THRESHOLD, SCOUTING_DISCOVERY_CHANCE,
  MEDICAL_HIGH_ALLOCATION_THRESHOLD, MEDICAL_MORALE_RESILIENCE_EFFECT_CHANCE, // Updated for morale resilience
  INITIAL_FAN_HAPPINESS, DEFAULT_TICKET_PRICE_LEVEL, FAN_HAPPINESS_LEVELS, TICKET_PRICE_LEVELS,
  HAPPINESS_HOME_WIN, HAPPINESS_AWAY_WIN, HAPPINESS_HOME_LOSS, HAPPINESS_AWAY_LOSS, HAPPINESS_DRAW,
  HAPPINESS_WIN_STREAK_BONUS, HAPPINESS_LOSS_STREAK_MALUS, HAPPINESS_MARKETING_EFFECT, 
  HAPPINESS_LEAGUE_RANK_EFFECT, HAPPINESS_MORALE_SPILLOVER_HIGH, HAPPINESS_MORALE_SPILLOVER_LOW,
  MAX_FAN_HAPPINESS, MIN_FAN_HAPPINESS, POTENTIAL_SPECIAL_DRILLS, MAX_DRILLS_OFFERED
} from '../constants';

export const generateSchedule = (teams: Team[]): Game[][] => {
  const numTeams = teams.length;
  if (numTeams < 2) return [];

  const scheduleWeeks = (numTeams - 1) * GAMES_AGAINST_EACH_OPPONENT;
  const schedule: Game[][] = Array.from({ length: scheduleWeeks }, () => []);
  let gameIdCounter = 0;

  const effectiveTeams = [...teams];
  let includesBye = false;
  if (effectiveTeams.length % 2 !== 0) {
    effectiveTeams.push({ id: 'bye', name: 'Bye', koreanName: '부전승', batting:0, pitching:0, defense:0, city: '', logoColor: '', textColor: '' });
    includesBye = true;
  }
  const n = effectiveTeams.length;

  const baseMatchupsPerRound: { home: string; away: string }[][] = [];
  const teamsForRoundRobin = [...effectiveTeams]; 

  for (let r = 0; r < n - 1; r++) {
    const roundGames: { home: string; away: string }[] = [];
    for (let i = 0; i < n / 2; i++) {
      const homeTeam = teamsForRoundRobin[i];
      const awayTeam = teamsForRoundRobin[n - 1 - i];
      if (homeTeam.id !== 'bye' && awayTeam.id !== 'bye') {
        roundGames.push({ home: homeTeam.id, away: awayTeam.id });
      }
    }
    baseMatchupsPerRound.push(roundGames);
    
    if (n > 1) {
        const lastTeam = teamsForRoundRobin.pop()!;
        teamsForRoundRobin.splice(1, 0, lastTeam);
    }
  }

  for (let seriesNum = 0; seriesNum < GAMES_AGAINST_EACH_OPPONENT; seriesNum++) {
    for (let roundInSeries = 0; roundInSeries < baseMatchupsPerRound.length; roundInSeries++) {
      const overallWeekIndex = seriesNum * (baseMatchupsPerRound.length) + roundInSeries;

      if (overallWeekIndex >= scheduleWeeks && !includesBye) continue;
      if (includesBye && overallWeekIndex >= (numTeams * GAMES_AGAINST_EACH_OPPONENT) ) continue;


      baseMatchupsPerRound[roundInSeries].forEach(matchup => {
        let homeTeamId = matchup.home;
        let awayTeamId = matchup.away;

        if (seriesNum % 2 !== 0) { 
          [homeTeamId, awayTeamId] = [awayTeamId, homeTeamId];
        }

        const game: Game = {
          id: `s${seriesNum}-r${roundInSeries}-g${gameIdCounter++}`,
          homeTeamId: homeTeamId,
          awayTeamId: awayTeamId,
          played: false,
          week: overallWeekIndex + 1,
        };
        if (schedule[overallWeekIndex]) {
            schedule[overallWeekIndex].push(game);
        }
      });
    }
  }
  return schedule.filter(weekGames => weekGames.length > 0);
};

const getRandomPlayerName = () => {
  const firstNames = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
  const lastNames = ["민준", "서준", "도윤", "예준", "시우", "하준", "지호", "주원", "지후", "준서", "서연", "서윤", "지우", "서현", "하윤", "민서", "지유", "윤서", "채원", "수아"];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]}${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
};

const getTrainingStatBonus = (allocation: BudgetAllocation): { batting: number; pitching: number; defense: number } => {
  const calcBonus = (allocPercent: number, defaultAllocPercent: number): number => {
    const diff = allocPercent - defaultAllocPercent;
    let points = 0;
    if (diff >= TRAINING_STAT_POINT_DIVISOR * 2) { // +20% or more above default
      points = 2;
    } else if (diff >= TRAINING_STAT_POINT_DIVISOR) { // +10% to +19% above default
      points = 1;
    } else if (diff > -TRAINING_STAT_POINT_DIVISOR) { // -9% to +9% around default
      points = 0;
    } else if (diff > -TRAINING_STAT_POINT_DIVISOR * 2) { // -19% to -10% below default
      points = -1;
    } else { // -20% or more below default
      points = -2;
    }
    return Math.max(-MAX_TRAINING_STAT_EFFECT, Math.min(MAX_TRAINING_STAT_EFFECT, points));
  };

  return {
    batting: calcBonus(allocation.trainingBatting, DEFAULT_TRAINING_BATTING_ALLOCATION),
    pitching: calcBonus(allocation.trainingPitching, DEFAULT_TRAINING_PITCHING_ALLOCATION),
    defense: calcBonus(allocation.trainingDefense, DEFAULT_TRAINING_DEFENSE_ALLOCATION),
  };
};


const getSpecialDrillBonuses = (activeDrill: ActiveSpecialDrill | null): { batting: number; pitching: number; defense: number } => {
    const bonuses = { batting: 0, pitching: 0, defense: 0 };
    if (activeDrill && activeDrill.remainingWeeks > 0) {
        if (activeDrill.statBoosted === 'all') {
            bonuses.batting += activeDrill.boostAmount;
            bonuses.pitching += activeDrill.boostAmount;
            bonuses.defense += activeDrill.boostAmount;
        } else {
            bonuses[activeDrill.statBoosted] += activeDrill.boostAmount;
        }
    }
    return bonuses;
};

export const simulateGame = (
  homeTeamBase: Team, 
  awayTeamBase: Team,
  homeTeamMorale: TeamMorale,
  awayTeamMorale: TeamMorale,
  homeTeamFinancials: FinancialData,
  awayTeamFinancials: FinancialData,
  homeActiveDrill: ActiveSpecialDrill | null, 
  awayActiveDrill: ActiveSpecialDrill | null  
): { homeScore: number; awayScore: number; log: string[] } => {
  let homeScore = 0;
  let awayScore = 0;
  const log: string[] = [];
  const innings = 9;

  log.push(`경기 시작: ${homeTeamBase.koreanName} vs ${awayTeamBase.koreanName}`);

  const homeTrainingBonus = getTrainingStatBonus(homeTeamFinancials.budgetAllocation);
  const awayTrainingBonus = getTrainingStatBonus(awayTeamFinancials.budgetAllocation);
  
  const homeMoraleMod = MORALE_STAT_MODIFIERS[homeTeamMorale];
  const awayMoraleMod = MORALE_STAT_MODIFIERS[awayTeamMorale];

  const homeDrillBonus = getSpecialDrillBonuses(homeActiveDrill);
  const awayDrillBonus = getSpecialDrillBonuses(awayActiveDrill);

  const getEffectiveStats = (
      team: Team, 
      trainingBonus: {batting:number, pitching:number, defense:number}, 
      moraleMod: number,
      drillBonus: {batting:number, pitching:number, defense:number}
    ) => {
    return {
      batting: Math.max(10, team.batting + trainingBonus.batting + moraleMod + drillBonus.batting + Math.floor(Math.random() * 11 - 5)),
      pitching: Math.max(10, team.pitching + trainingBonus.pitching + moraleMod + drillBonus.pitching + Math.floor(Math.random() * 11 - 5)),
      defense: Math.max(10, team.defense + trainingBonus.defense + moraleMod + drillBonus.defense + Math.floor(Math.random() * 11 - 5)),
    };
  };
  
  const homeTeam = getEffectiveStats(homeTeamBase, homeTrainingBonus, homeMoraleMod, homeDrillBonus);
  const awayTeam = getEffectiveStats(awayTeamBase, awayTrainingBonus, awayMoraleMod, awayDrillBonus);

  for (let i = 1; i <= innings; i++) {
    // --- Away team bats (top of inning) ---
    let awayRunsThisInning = 0;
    log.push(`--- ${i}회 초 (${awayTeamBase.koreanName} 공격) ---`);
    let outs = 0;
    const baseRunners = [false, false, false]; 

    while(outs < 3) {
        const batterName = getRandomPlayerName();
        const offenseRating = awayTeam.batting * (0.8 + Math.random() * 0.4); 
        const defenseRating = (homeTeam.pitching + homeTeam.defense) / 2 * (0.8 + Math.random() * 0.4) + 5; 

        const outcomeRoll = Math.random() * 100;
        let event = "";

        if (offenseRating > defenseRating + 20 && outcomeRoll < 25) { 
            const hitTypeRoll = Math.random();
            if (hitTypeRoll < 0.05) { 
                event = "홈런!!!";
                log.push(`${batterName} 선수 ${event}`);
                let runsFromHR = 1 + baseRunners.filter(r => r).length;
                awayRunsThisInning += runsFromHR;
                baseRunners.fill(false);
                log.push(`${awayTeamBase.koreanName} ${runsFromHR}점 득점!`);
            } else if (hitTypeRoll < 0.20) { 
                event = "3루타!";
                log.push(`${batterName} 선수 ${event}`);
                if (baseRunners[2]) { awayRunsThisInning++; baseRunners[2] = false; log.push(`${awayTeamBase.koreanName} 1점 득점!`);}
                if (baseRunners[1]) { awayRunsThisInning++; baseRunners[1] = false; log.push(`${awayTeamBase.koreanName} 1점 득점!`);}
                if (baseRunners[0]) { awayRunsThisInning++; baseRunners[0] = false; log.push(`${awayTeamBase.koreanName} 1점 득점!`);}
                baseRunners[2] = true;
            } else if (hitTypeRoll < 0.50) { 
                event = "2루타!";
                log.push(`${batterName} 선수 ${event}`);
                if (baseRunners[2]) { awayRunsThisInning++; baseRunners[2] = false; log.push(`${awayTeamBase.koreanName} 1점 득점!`);}
                if (baseRunners[1]) { awayRunsThisInning++; baseRunners[1] = false; log.push(`${awayTeamBase.koreanName} 1점 득점!`);}
                if (baseRunners[0]) { baseRunners[2] = true; baseRunners[0] = false;}
                baseRunners[1] = true;
            } else { 
                event = "안타!";
                log.push(`${batterName} 선수 ${event}`);
                if (baseRunners[2]) { awayRunsThisInning++; baseRunners[2] = false; log.push(`${awayTeamBase.koreanName} 1점 득점!`);}
                if (baseRunners[1]) { baseRunners[2] = true; baseRunners[1] = false; }
                if (baseRunners[0]) { baseRunners[1] = true; }
                baseRunners[0] = true;
            }
        } else if (offenseRating > defenseRating - 10 && outcomeRoll < 45) { 
            const contactRoll = Math.random();
            if (contactRoll < 0.7) { 
                 event = "안타!";
                log.push(`${batterName} 선수 ${event}`);
                if (baseRunners[2]) { awayRunsThisInning++; baseRunners[2] = false; log.push(`${awayTeamBase.koreanName} 1점 득점!`);}
                if (baseRunners[1]) { baseRunners[2] = true; baseRunners[1] = false; }
                if (baseRunners[0]) { baseRunners[1] = true; }
                baseRunners[0] = true;
            } else { 
                event = "볼넷으로 출루.";
                log.push(`${batterName} 선수 ${event}`);
                 if (baseRunners[0] && baseRunners[1] && baseRunners[2]) { awayRunsThisInning++; log.push(`${awayTeamBase.koreanName} 밀어내기 1점 득점!`);}
                 else if (baseRunners[0] && baseRunners[1]) { baseRunners[2] = true; baseRunners[1] = false; baseRunners[0] = true; } 
                 else if (baseRunners[0]) { baseRunners[1] = true; baseRunners[0] = true; } 
                 else { baseRunners[0] = true; } 
            }
        } else { 
            const outTypeRoll = Math.random();
            if (outTypeRoll < 0.33) event = "땅볼 아웃.";
            else if (outTypeRoll < 0.66) event = "뜬공 아웃.";
            else event = "삼진 아웃!";
            log.push(`${batterName} 선수 ${event}`);
            outs++;
        }
        if (outs === 3) break;
    }
    if (awayRunsThisInning === 0 && outs === 3) log.push(`${i}회 초, ${awayTeamBase.koreanName} 득점 없음.`);
    awayScore += awayRunsThisInning;

    // --- Home team bats (bottom of inning) ---
    log.push(`--- ${i}회 말 (${homeTeamBase.koreanName} 공격) ---`);
    if (i === innings && homeScore > awayScore) { 
      log.push(`${homeTeamBase.koreanName} 승리! ${i}회 말 공격은 진행하지 않습니다.`);
      break;
    }
    
    let homeRunsThisInning = 0;
    outs = 0;
    baseRunners.fill(false);

    while(outs < 3) {
        const batterName = getRandomPlayerName();
        const offenseRating = homeTeam.batting * (0.8 + Math.random() * 0.4) + 5; 
        const defenseRating = (awayTeam.pitching + awayTeam.defense) / 2 * (0.8 + Math.random() * 0.4);
        const outcomeRoll = Math.random() * 100;
        let event = "";

        if (offenseRating > defenseRating + 20 && outcomeRoll < 25) { 
            const hitTypeRoll = Math.random();
            if (hitTypeRoll < 0.05) { 
                event = "홈런!!!";
                log.push(`${batterName} 선수 ${event}`);
                let runsFromHR = 1 + baseRunners.filter(r => r).length;
                homeRunsThisInning += runsFromHR;
                baseRunners.fill(false);
                log.push(`${homeTeamBase.koreanName} ${runsFromHR}점 득점!`);
            } else if (hitTypeRoll < 0.20) { 
                event = "3루타!";
                log.push(`${batterName} 선수 ${event}`);
                if (baseRunners[2]) { homeRunsThisInning++; baseRunners[2] = false; log.push(`${homeTeamBase.koreanName} 1점 득점!`);}
                if (baseRunners[1]) { homeRunsThisInning++; baseRunners[1] = false; log.push(`${homeTeamBase.koreanName} 1점 득점!`);}
                if (baseRunners[0]) { homeRunsThisInning++; baseRunners[0] = false; log.push(`${homeTeamBase.koreanName} 1점 득점!`);}
                baseRunners[2] = true;
            } else if (hitTypeRoll < 0.50) { 
                event = "2루타!";
                log.push(`${batterName} 선수 ${event}`);
                if (baseRunners[2]) { homeRunsThisInning++; baseRunners[2] = false; log.push(`${homeTeamBase.koreanName} 1점 득점!`);}
                if (baseRunners[1]) { homeRunsThisInning++; baseRunners[1] = false; log.push(`${homeTeamBase.koreanName} 1점 득점!`);}
                if (baseRunners[0]) { baseRunners[2] = true; baseRunners[0] = false;}
                baseRunners[1] = true;
            } else { 
                event = "안타!";
                log.push(`${batterName} 선수 ${event}`);
                if (baseRunners[2]) { homeRunsThisInning++; baseRunners[2] = false; log.push(`${homeTeamBase.koreanName} 1점 득점!`);}
                if (baseRunners[1]) { baseRunners[2] = true; baseRunners[1] = false; }
                if (baseRunners[0]) { baseRunners[1] = true; }
                baseRunners[0] = true;
            }
        } else if (offenseRating > defenseRating - 10 && outcomeRoll < 45) { 
            const contactRoll = Math.random();
             if (contactRoll < 0.7) { 
                 event = "안타!";
                log.push(`${batterName} 선수 ${event}`);
                if (baseRunners[2]) { homeRunsThisInning++; baseRunners[2] = false; log.push(`${homeTeamBase.koreanName} 1점 득점!`);}
                if (baseRunners[1]) { baseRunners[2] = true; baseRunners[1] = false; }
                if (baseRunners[0]) { baseRunners[1] = true; }
                baseRunners[0] = true;
            } else { 
                event = "볼넷으로 출루.";
                log.push(`${batterName} 선수 ${event}`);
                 if (baseRunners[0] && baseRunners[1] && baseRunners[2]) { homeRunsThisInning++; log.push(`${homeTeamBase.koreanName} 밀어내기 1점 득점!`);}
                 else if (baseRunners[0] && baseRunners[1]) { baseRunners[2] = true; baseRunners[1] = false; baseRunners[0] = true; }
                 else if (baseRunners[0]) { baseRunners[1] = true; baseRunners[0] = true; }
                 else { baseRunners[0] = true; }
            }
        } else { 
            const outTypeRoll = Math.random();
            if (outTypeRoll < 0.33) event = "땅볼 아웃.";
            else if (outTypeRoll < 0.66) event = "뜬공 아웃.";
            else event = "삼진 아웃!";
            log.push(`${batterName} 선수 ${event}`);
            outs++;
        }
        if (i === innings && homeRunsThisInning + homeScore > awayScore && outs < 3) { 
             homeScore += homeRunsThisInning;
             log.push(`${homeTeamBase.koreanName} 끝내기 승리! 최종 스코어: ${homeScore}:${awayScore}`);
             break; 
         }
        if (outs === 3) break;
    }
    if (homeRunsThisInning === 0 && outs === 3) log.push(`${i}회 말, ${homeTeamBase.koreanName} 득점 없음.`);
    homeScore += homeRunsThisInning;

    if (i === innings && homeScore > awayScore && outs < 3) break; 
  }

  log.push(`--- 경기 종료 ---`);
  log.push(`최종 스코어: ${homeTeamBase.koreanName} ${homeScore} : ${awayScore} ${awayTeamBase.koreanName}`);
  if (homeScore > awayScore) log.push(`${homeTeamBase.koreanName} 승리!`);
  else if (awayScore > homeScore) log.push(`${awayTeamBase.koreanName} 승리!`);
  else log.push("무승부!");

  return { homeScore, awayScore, log };
};

export const updateStandings = (
  standings: StandingsEntry[],
  game: Game,
  homeScore: number,
  awayScore: number
): StandingsEntry[] => {
  const newStandings = standings.map(s => ({ ...s }));

  const homeEntry = newStandings.find(s => s.teamId === game.homeTeamId);
  const awayEntry = newStandings.find(s => s.teamId === game.awayTeamId);

  if (homeEntry && awayEntry) {
    homeEntry.gamesPlayed += 1;
    awayEntry.gamesPlayed += 1;

    if (homeScore > awayScore) {
      homeEntry.wins += 1;
      awayEntry.losses += 1;
    } else if (awayScore > homeScore) {
      awayEntry.wins += 1;
      homeEntry.losses += 1;
    } else {
      homeEntry.draws += 1;
      awayEntry.draws += 1;
    }
    
    [homeEntry, awayEntry].forEach(entry => {
        entry.points = entry.wins * 1 + entry.draws * 0.5;
        entry.winPercentage = entry.gamesPlayed > 0 ? (entry.wins + entry.draws * 0.5) / entry.gamesPlayed : 0;
    });
  }
  return newStandings.sort((a, b) => b.points - a.points || (b.wins - a.wins) || (a.losses - b.losses));
};

export const initializeStandings = (teams: Team[]): StandingsEntry[] => {
  return teams.map(team => ({
    teamId: team.id,
    wins: 0,
    losses: 0,
    draws: 0,
    gamesPlayed: 0,
    winPercentage: 0,
    points: 0,
  })).sort((a, b) => b.points - a.points || (b.wins - a.wins) || (a.losses - b.losses));
};

export const initializeFinancials = (teams: Team[], userTeamId?: string): Record<string, FinancialData> => {
  const financials: Record<string, FinancialData> = {};
  teams.forEach(team => {
    financials[team.id] = {
      budget: INITIAL_BUDGET,
      incomeHistory: [],
      expenseHistory: [],
      budgetAllocation: team.id === userTeamId 
        ? { ...DEFAULT_BUDGET_ALLOCATION } 
        : { // Slightly different defaults for AI teams for variety
            trainingBatting: 17 + Math.floor(Math.random()*5-2), // 15-19
            trainingPitching: 17 + Math.floor(Math.random()*5-2),// 15-19
            trainingDefense: 16 + Math.floor(Math.random()*5-2), // 14-18
            marketing: 20 + Math.floor(Math.random()*11-5),   // 15-25
            facilities: 15 + Math.floor(Math.random()*7-3),  // 12-18
            scouting: 8 + Math.floor(Math.random()*5-2),     // 6-10
            medical: 7 + Math.floor(Math.random()*5-2)      // 5-9
          },
      fanHappiness: INITIAL_FAN_HAPPINESS,
      ticketPriceLevel: DEFAULT_TICKET_PRICE_LEVEL,
    };
    // Ensure AI budget allocations sum to 100
     if (team.id !== userTeamId) {
        let sum = Object.values(financials[team.id].budgetAllocation).reduce((acc, val) => acc + val, 0);
        let diff = 100 - sum;
        // Adjust training budgets to meet 100%
        financials[team.id].budgetAllocation.trainingBatting += Math.floor(diff/3);
        financials[team.id].budgetAllocation.trainingPitching += Math.ceil(diff/3);
        financials[team.id].budgetAllocation.trainingDefense += Math.round(diff/3); // Or some other distribution
        
        // Re-clamp after adjustment
        (Object.keys(financials[team.id].budgetAllocation) as Array<keyof BudgetAllocation>).forEach(key => {
            financials[team.id].budgetAllocation[key] = Math.max(0, Math.min(100, financials[team.id].budgetAllocation[key]));
        });
        // Final pass to ensure 100
        sum = Object.values(financials[team.id].budgetAllocation).reduce((acc, val) => acc + val, 0);
        diff = 100 - sum;
        if (diff !== 0) financials[team.id].budgetAllocation.trainingBatting += diff; // Add remainder to one key
    }


  });
  return financials;
};

export const initializeTeamMorale = (teams: Team[]): Record<string, TeamMorale> => {
  const morale: Record<string, TeamMorale> = {};
  teams.forEach(team => {
    morale[team.id] = INITIAL_MORALE;
  });
  return morale;
};

const moraleLevels = [TeamMorale.VERY_LOW, TeamMorale.LOW, TeamMorale.MEDIUM, TeamMorale.HIGH, TeamMorale.VERY_HIGH];

export const applyMoraleChange = (currentMorale: TeamMorale, direction: 'increase' | 'decrease'): TeamMorale => {
    const currentIndex = moraleLevels.indexOf(currentMorale);
    if (direction === 'increase' && currentIndex < moraleLevels.length - 1) {
        return moraleLevels[currentIndex + 1];
    }
    if (direction === 'decrease' && currentIndex > 0) {
        return moraleLevels[currentIndex - 1];
    }
    return currentMorale;
};

export const updateTeamMorale = (
  currentMorale: TeamMorale,
  gameResult: 'win' | 'loss' | 'draw' | null, 
  teamBudget: number,
  budgetAllocation: BudgetAllocation,
  sponsorshipEffect?: SponsorshipOffer['moraleEffect'],
  fanHappinessScore?: number 
): TeamMorale => {
  let newMorale = currentMorale;
  
  if (sponsorshipEffect && Math.random() < sponsorshipEffect.chance) {
    newMorale = applyMoraleChange(newMorale, sponsorshipEffect.type === 'boost' ? 'increase' : 'decrease');
  }

  let budgetMalus = false;
  if (teamBudget < LOW_BUDGET_THRESHOLD_FOR_MORALE && Math.random() < MORALE_LOW_BUDGET_NEGATIVE_IMPACT_CHANCE) {
    budgetMalus = true;
    newMorale = applyMoraleChange(newMorale, 'decrease');
  }

  if (budgetAllocation.facilities > FACILITY_HIGH_ALLOCATION_THRESHOLD && Math.random() < FACILITY_MORALE_IMPACT_CHANCE) {
      newMorale = applyMoraleChange(newMorale, 'increase');
  } else if (budgetAllocation.facilities < FACILITY_LOW_ALLOCATION_THRESHOLD && Math.random() < FACILITY_MORALE_IMPACT_CHANCE) {
      newMorale = applyMoraleChange(newMorale, 'decrease');
  }

  const isMedicalHigh = budgetAllocation.medical >= MEDICAL_HIGH_ALLOCATION_THRESHOLD;

  if (fanHappinessScore !== undefined) {
    const fanLevel = getFanHappinessLevelFromScore(fanHappinessScore);
    if (fanLevel === FanHappinessLevel.ANGRY && Math.random() < 0.15) { 
        newMorale = applyMoraleChange(newMorale, 'decrease');
    }
  }

  if (gameResult) {
    let baseWinChance = MORALE_WIN_INCREASE_CHANCE;
    let baseLossChance = MORALE_LOSS_DECREASE_CHANCE;

    if (isMedicalHigh && Math.random() < MEDICAL_MORALE_RESILIENCE_EFFECT_CHANCE) {
        if (gameResult === 'win') baseWinChance = Math.min(1, baseWinChance + 0.15); 
        if (gameResult === 'loss') baseLossChance = Math.max(0, baseLossChance - 0.15); 
    }


    switch (gameResult) {
      case 'win':
        if (Math.random() < baseWinChance && !budgetMalus) {
          newMorale = applyMoraleChange(newMorale, 'increase');
        }
        break;
      case 'loss':
        if (Math.random() < baseLossChance) {
          newMorale = applyMoraleChange(newMorale, 'decrease');
        }
        break;
      case 'draw':
        if (Math.random() < MORALE_DRAW_SHIFT_TO_MEDIUM_CHANCE && !budgetMalus) {
          const mediumIndex = moraleLevels.indexOf(TeamMorale.MEDIUM);
          const currentDrawIndex = moraleLevels.indexOf(newMorale);
          if (currentDrawIndex < mediumIndex) newMorale = applyMoraleChange(newMorale, 'increase');
          else if (currentDrawIndex > mediumIndex) newMorale = applyMoraleChange(newMorale, 'decrease');
        }
        break;
    }
  }
  return newMorale;
};

export const getFanHappinessLevelFromScore = (score: number): FanHappinessLevel => {
    if (score <= FAN_HAPPINESS_LEVELS[FanHappinessLevel.ANGRY].max) return FanHappinessLevel.ANGRY;
    if (score <= FAN_HAPPINESS_LEVELS[FanHappinessLevel.DISAPPOINTED].max) return FanHappinessLevel.DISAPPOINTED;
    if (score <= FAN_HAPPINESS_LEVELS[FanHappinessLevel.NEUTRAL].max) return FanHappinessLevel.NEUTRAL;
    if (score <= FAN_HAPPINESS_LEVELS[FanHappinessLevel.HAPPY].max) return FanHappinessLevel.HAPPY;
    return FanHappinessLevel.ECSTATIC;
};

export const updateFanHappiness = (
    currentHappiness: number,
    gamesThisWeek: Game[],
    teamId: string,
    ticketPriceLevel: TicketPriceLevel,
    marketingAllocationPercent: number,
    teamMorale: TeamMorale,
    leagueRank: number,
    totalTeams: number
): number => {
    let happinessChange = 0;
    const teamGames = gamesThisWeek.filter(g => (g.homeTeamId === teamId || g.awayTeamId === teamId) && g.played);

    let winStreak = 0; 
    let lossStreak = 0;

    teamGames.forEach(game => {
        if (game.homeTeamId === teamId) {
            if (game.homeScore! > game.awayScore!) { happinessChange += HAPPINESS_HOME_WIN; winStreak++; lossStreak = 0;}
            else if (game.homeScore! < game.awayScore!) { happinessChange += HAPPINESS_HOME_LOSS; lossStreak++; winStreak = 0;}
            else { happinessChange += HAPPINESS_DRAW; }
        } else { 
            if (game.awayScore! > game.homeScore!) { happinessChange += HAPPINESS_AWAY_WIN; winStreak++; lossStreak = 0;}
            else if (game.awayScore! < game.homeScore!) { happinessChange += HAPPINESS_AWAY_LOSS; lossStreak++; winStreak = 0;}
            else { happinessChange += HAPPINESS_DRAW; }
        }
    });

    if (winStreak >= 3) happinessChange += HAPPINESS_WIN_STREAK_BONUS * (winStreak - 2);
    if (lossStreak >= 3) happinessChange += HAPPINESS_LOSS_STREAK_MALUS * (lossStreak - 2);
    
    happinessChange += TICKET_PRICE_LEVELS[ticketPriceLevel].happinessImpact;
    const marketingDeviation = marketingAllocationPercent - DEFAULT_MARKETING_ALLOCATION;
    happinessChange += Math.round(marketingDeviation * HAPPINESS_MARKETING_EFFECT);

    if (leagueRank <= 3) happinessChange += HAPPINESS_LEAGUE_RANK_EFFECT.top3;
    else if (leagueRank >= totalTeams - 2) happinessChange += HAPPINESS_LEAGUE_RANK_EFFECT.bottom3;

    if (teamMorale === TeamMorale.HIGH || teamMorale === TeamMorale.VERY_HIGH) happinessChange += HAPPINESS_MORALE_SPILLOVER_HIGH;
    else if (teamMorale === TeamMorale.LOW || teamMorale === TeamMorale.VERY_LOW) happinessChange += HAPPINESS_MORALE_SPILLOVER_LOW;
    
    let newHappiness = currentHappiness + happinessChange;
    newHappiness = Math.max(MIN_FAN_HAPPINESS, Math.min(MAX_FAN_HAPPINESS, newHappiness));
    
    return Math.round(newHappiness);
};

export const processWeeklyFinancesAndUpdateTeam = (
  team: Team, 
  currentFinancials: FinancialData,
  gamesThisWeekPlayedByTeam: Game[], 
  currentWeek: number
): { updatedFinancials: FinancialData, updatedTeam: Team, scoutingMessage: string | null } => {
  
  const newFinancials = JSON.parse(JSON.stringify(currentFinancials)) as FinancialData; 
  const updatedTeam = JSON.parse(JSON.stringify(team)) as Team; 
  let scoutingMessage: string | null = null;
  
  const trainingBonus = getTrainingStatBonus(newFinancials.budgetAllocation);

  const applyStatChange = (currentStat: number, bonus: number): number => {
    let newStat = currentStat;
    if (bonus >= 0) { 
      let increaseChance = 0.0;
      if (bonus === 0 && Math.random() < 0.20) { // 20% chance to increase by 1 if at default allocation
          newStat += 1;
      } else if (bonus === 1 && Math.random() < 0.40) { // 40% chance to increase by 1
          newStat += 1;
      } else if (bonus === 2 && Math.random() < 0.70) { // 70% chance to increase by 1
          newStat += 1; 
      }
    } else { // bonus is negative (-1 or -2)
      newStat += bonus; // Definite decrease
    }
    return Math.max(10, Math.min(100, newStat));
  };

  updatedTeam.batting = applyStatChange(team.batting, trainingBonus.batting);
  updatedTeam.pitching = applyStatChange(team.pitching, trainingBonus.pitching);
  updatedTeam.defense = applyStatChange(team.defense, trainingBonus.defense);


  const weeklySalaryExpense = WEEKLY_EXPENSES;
  newFinancials.budget -= weeklySalaryExpense;
  newFinancials.expenseHistory.push({ week: currentWeek, amount: weeklySalaryExpense, description: `Week ${currentWeek} Salaries & Operations` });

  const marketingIncomeBonusPercent = Math.floor((newFinancials.budgetAllocation.marketing - DEFAULT_MARKETING_ALLOCATION) / MARKETING_ALLOCATION_INCOME_DIVISOR);
  const clampedMarketingBonusPercent = Math.max(-MAX_MARKETING_INCOME_EFFECT_PERCENT, Math.min(MAX_MARKETING_INCOME_EFFECT_PERCENT, marketingIncomeBonusPercent));
  const baseMarketingMultiplier = 1 + (clampedMarketingBonusPercent / 100);

  const currentFanHappinessLevel = getFanHappinessLevelFromScore(newFinancials.fanHappiness);
  const attendanceModifier = FAN_HAPPINESS_LEVELS[currentFanHappinessLevel].attendanceModifier;
  const ticketPriceIncomeModifier = TICKET_PRICE_LEVELS[newFinancials.ticketPriceLevel].incomeModifier;

  gamesThisWeekPlayedByTeam.forEach(game => {
    if (game.homeTeamId === team.id && game.played) {
      let income = 0;
      if (game.homeScore! > game.awayScore!) income = INCOME_PER_HOME_GAME_WIN;
      else income = INCOME_PER_HOME_GAME_LOSS_OR_DRAW;
      
      const finalIncomeMultiplier = baseMarketingMultiplier * (1 + attendanceModifier) * ticketPriceIncomeModifier;
      income *= finalIncomeMultiplier;
      income = Math.round(income);

      newFinancials.budget += income;
      newFinancials.incomeHistory.push({ 
          week: currentWeek, 
          amount: income, 
          description: `W${currentWeek} 홈 경기 (관중:${((1+attendanceModifier)*100).toFixed(0)}% 티켓:${TICKET_PRICE_LEVELS[newFinancials.ticketPriceLevel].description})` 
      });
    }
  });

  if (newFinancials.budgetAllocation.scouting >= SCOUTING_HIGH_ALLOCATION_THRESHOLD && Math.random() < SCOUTING_DISCOVERY_CHANCE) {
    const discoveredTalents = ["엄청난 타격 재능을 가진 신인", "강속구를 던지는 유망주 투수", "철벽 수비를 자랑하는 내야수"];
    const talent = discoveredTalents[Math.floor(Math.random() * discoveredTalents.length)];
    scoutingMessage = `스카우팅 팀 보고: "${talent}"를 발견했습니다! 다음 시즌이 기대됩니다.`;
  }

  return { updatedFinancials: newFinancials, updatedTeam, scoutingMessage };
};

let offerIdCounter = 0;
export const generateNewSponsorshipOffer = (): SponsorshipOffer | null => {
  if (Math.random() < SPONSORSHIP_OFFER_CHANCE_PER_WEEK && POTENTIAL_SPONSORSHIP_OFFERS.length > 0) {
    const template = POTENTIAL_SPONSORSHIP_OFFERS[Math.floor(Math.random() * POTENTIAL_SPONSORSHIP_OFFERS.length)];
    const amount = Math.floor(Math.random() * (template.maxAmount - template.minAmount + 1)) + template.minAmount;
    return {
      id: `sp-offer-${offerIdCounter++}`,
      sponsorName: template.sponsorName,
      koreanSponsorName: template.koreanSponsorName,
      amount,
      description: template.description,
      moraleEffect: template.moraleEffect ? { ...template.moraleEffect } : undefined,
    };
  }
  return null;
};

export const generateAvailableSpecialDrills = (): SpecialDrillTemplate[] => {
    const shuffled = [...POTENTIAL_SPECIAL_DRILLS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, MAX_DRILLS_OFFERED);
};

export const getDisplayEffectiveStats = (
    baseTeam: Team, 
    morale: TeamMorale, 
    budgetAllocation: BudgetAllocation,
    activeDrill?: ActiveSpecialDrill | null 
): { batting: number, pitching: number, defense: number } => {
    const trainingBonus = getTrainingStatBonus(budgetAllocation);
    const moraleMod = MORALE_STAT_MODIFIERS[morale];
    const drillBonus = activeDrill ? getSpecialDrillBonuses(activeDrill) : { batting: 0, pitching: 0, defense: 0 };
    
    return {
        batting: Math.max(0, baseTeam.batting + trainingBonus.batting + moraleMod + drillBonus.batting),
        pitching: Math.max(0, baseTeam.pitching + trainingBonus.pitching + moraleMod + drillBonus.pitching),
        defense: Math.max(0, baseTeam.defense + trainingBonus.defense + moraleMod + drillBonus.defense),
    };
};

// --- CPU Delegation Logic Helpers ---

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export const determineCpuTicketPrice = (
  currentFinancials: FinancialData,
  currentWeek: number
): TicketPriceLevel | null => {
  // Only consider changing every 2 weeks unless critical
  const fanHappiness = currentFinancials.fanHappiness;
  const currentPrice = currentFinancials.ticketPriceLevel;
  let suggestedPrice: TicketPriceLevel | null = null;

  const isCriticalHappiness = fanHappiness < 30 || fanHappiness > 80;
  if (currentWeek % 2 !== 0 && !isCriticalHappiness) { // On odd weeks, only change if critical
      return null;
  }

  if (fanHappiness > 75) { // Ecstatic or very happy
    if (currentPrice === TicketPriceLevel.NORMAL) suggestedPrice = TicketPriceLevel.HIGH;
    else if (currentPrice === TicketPriceLevel.LOW || currentPrice === TicketPriceLevel.VERY_LOW) suggestedPrice = TicketPriceLevel.NORMAL;
  } else if (fanHappiness > 60) { // Happy
    if (currentPrice === TicketPriceLevel.LOW || currentPrice === TicketPriceLevel.VERY_LOW) suggestedPrice = TicketPriceLevel.NORMAL;
    else if (currentPrice === TicketPriceLevel.VERY_HIGH) suggestedPrice = TicketPriceLevel.HIGH; // Reduce if too high
  } else if (fanHappiness < 35) { // Disappointed or Angry
    if (currentPrice === TicketPriceLevel.NORMAL) suggestedPrice = TicketPriceLevel.LOW;
    else if (currentPrice === TicketPriceLevel.HIGH || currentPrice === TicketPriceLevel.VERY_HIGH) suggestedPrice = TicketPriceLevel.NORMAL;
  } else if (fanHappiness < 50) { // Neutral but leaning disappointed
    if (currentPrice === TicketPriceLevel.HIGH) suggestedPrice = TicketPriceLevel.NORMAL;
    else if (currentPrice === TicketPriceLevel.VERY_HIGH) suggestedPrice = TicketPriceLevel.HIGH;
  }

  if (suggestedPrice && suggestedPrice !== currentPrice) {
    return suggestedPrice;
  }
  return null;
};


export const determineCpuBudgetAllocation = (
  currentFinancials: FinancialData,
  currentWeek: number
): BudgetAllocation | null => {
  // Only consider changing every 4 weeks unless critical budget situation
  const currentBudget = currentFinancials.budget;
  const currentAllocation = currentFinancials.budgetAllocation;
  let newAllocation: BudgetAllocation = { ...currentAllocation };

  const isCriticalBudget = currentBudget < WEEKLY_EXPENSES * 2; // Less than 2 weeks of expenses
  if (currentWeek % 4 !== 1 && !isCriticalBudget ) { // Week 1, 5, 9 etc.
     return null;
  }

  let changed = false;

  if (isCriticalBudget) { // Very Low Budget
    newAllocation.marketing = clamp(currentAllocation.marketing - 5, 5, DEFAULT_BUDGET_ALLOCATION.marketing);
    newAllocation.facilities = clamp(currentAllocation.facilities - 3, 5, DEFAULT_BUDGET_ALLOCATION.facilities);
    newAllocation.scouting = clamp(currentAllocation.scouting - 3, 5, DEFAULT_BUDGET_ALLOCATION.scouting);
    newAllocation.medical = clamp(currentAllocation.medical + 3, DEFAULT_BUDGET_ALLOCATION.medical, 20);
    changed = true;
  } else if (currentBudget > INITIAL_BUDGET * 0.6) { // Healthy Budget (60% of initial)
    if (currentAllocation.marketing < DEFAULT_BUDGET_ALLOCATION.marketing + 5) {
      newAllocation.marketing = clamp(currentAllocation.marketing + 3, DEFAULT_BUDGET_ALLOCATION.marketing, 25);
      changed = true;
    }
    if (currentAllocation.facilities < DEFAULT_BUDGET_ALLOCATION.facilities + 5) {
      newAllocation.facilities = clamp(currentAllocation.facilities + 2, DEFAULT_BUDGET_ALLOCATION.facilities, 20);
      changed = true;
    }
    if (currentAllocation.scouting < DEFAULT_BUDGET_ALLOCATION.scouting + 5) {
      newAllocation.scouting = clamp(currentAllocation.scouting + 3, DEFAULT_BUDGET_ALLOCATION.scouting, 20);
      changed = true;
    }
    if (currentAllocation.medical < DEFAULT_BUDGET_ALLOCATION.medical) {
        newAllocation.medical = clamp(currentAllocation.medical + 2, 5, DEFAULT_BUDGET_ALLOCATION.medical + 2);
        changed = true;
    }
  } else { // Moderate budget, tend towards default for non-training
      const keysToDefault: (keyof BudgetAllocation)[] = ['marketing', 'facilities', 'scouting', 'medical'];
      keysToDefault.forEach(key => {
          if (Math.abs(currentAllocation[key] - DEFAULT_BUDGET_ALLOCATION[key]) > 3) {
            newAllocation[key] = DEFAULT_BUDGET_ALLOCATION[key];
            changed = true;
          }
      });
  }
  
  if (!changed) return null; // No significant reason to change non-training parts

  // Rebalance to 100% by adjusting training budgets
  let nonTrainingSum = newAllocation.marketing + newAllocation.facilities + newAllocation.scouting + newAllocation.medical;
  let trainingTotalTarget = 100 - nonTrainingSum;
  
  if (trainingTotalTarget < 30) { // Ensure training gets at least 30% total if possible
      const diffToThirty = 30 - trainingTotalTarget;
      // Take from largest non-essential if possible to give back to training
      const maxNonTrainingKey = (['marketing', 'facilities', 'scouting'] as (keyof BudgetAllocation)[])
                                .sort((a,b) => newAllocation[b] - newAllocation[a])[0];
      if(newAllocation[maxNonTrainingKey] - diffToThirty >= 5) {
          newAllocation[maxNonTrainingKey] -= diffToThirty;
          trainingTotalTarget = 30;
      } else { // Can't reach 30 for training, just use what's left
          trainingTotalTarget = 100 - (newAllocation.marketing + newAllocation.facilities + newAllocation.scouting + newAllocation.medical);
      }
  }


  // Distribute training budget - simple proportional based on defaults for now
  const defaultTrainingSum = DEFAULT_BUDGET_ALLOCATION.trainingBatting + DEFAULT_BUDGET_ALLOCATION.trainingPitching + DEFAULT_BUDGET_ALLOCATION.trainingDefense;
  newAllocation.trainingBatting = Math.round((DEFAULT_BUDGET_ALLOCATION.trainingBatting / defaultTrainingSum) * trainingTotalTarget);
  newAllocation.trainingPitching = Math.round((DEFAULT_BUDGET_ALLOCATION.trainingPitching / defaultTrainingSum) * trainingTotalTarget);
  newAllocation.trainingDefense = trainingTotalTarget - newAllocation.trainingBatting - newAllocation.trainingPitching; // Remainder to defense

  // Check if the new allocation is actually different enough from current
  let sumAbsDiff = 0;
  (Object.keys(newAllocation) as Array<keyof BudgetAllocation>).forEach(key => {
    sumAbsDiff += Math.abs(newAllocation[key] - currentAllocation[key]);
  });

  if (sumAbsDiff > 5) { // Only return if changes are somewhat significant
    return newAllocation;
  }

  return null;
};


import React, { useReducer, useEffect, useState } from 'react';
import { TeamSelection } from './components/TeamSelection';
import { Dashboard } from './components/Dashboard';
import { GameResultModal } from './components/GameResultModal';
import { PlayByPlayModal } from './components/PlayByPlayModal'; 
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { 
  KBO_TEAMS, TOTAL_WEEKS, INITIAL_BUDGET, GAMES_AGAINST_EACH_OPPONENT, 
  MORALE_BOOST_COST, MORALE_BOOST_SUCCESS_RATE, INITIAL_MORALE, MORALE_DESCRIPTIONS, MORALE_STAT_MODIFIERS,
  DEFAULT_BUDGET_ALLOCATION, DEFAULT_TICKET_PRICE_LEVEL, DEFAULT_MARKETING_ALLOCATION, TICKET_PRICE_LEVELS, WEEKLY_EXPENSES,
  INITIAL_SEASON_YEAR
} from './constants';
import { 
    GameState, GameAction, GameActionType, Team, StandingsEntry, FinancialData, 
    Game, TeamMorale, SponsorshipOffer, BudgetAllocation, EffectiveStatsDataPoint, 
    TicketPriceLevel, SpecialDrillTemplate, ActiveSpecialDrill, HistoricalSeasonRecord
} from './types';
import { 
  generateSchedule, simulateGame, updateStandings, initializeStandings, 
  initializeFinancials, processWeeklyFinancesAndUpdateTeam, initializeTeamMorale, updateTeamMorale,
  generateNewSponsorshipOffer, applyMoraleChange, getDisplayEffectiveStats, updateFanHappiness,
  generateAvailableSpecialDrills, determineCpuTicketPrice, determineCpuBudgetAllocation
} from './utils/gameLogic';

const initialGameState: GameState = {
  selectedTeamId: null,
  currentWeek: 1,
  schedule: [],
  standings: [],
  teamFinancials: {},
  allTeams: KBO_TEAMS.map(t => ({...t})), 
  seasonEnded: false,
  gamesPlayedThisWeekInfo: null,
  statusMessage: '',
  teamMorale: {},
  activeSponsorshipOffer: null,
  userGamePlayByPlayLog: null,
  showPlayByPlayModal: false,
  isPlayByPlayFullyDisplayed: false, 
  scoutingReportMessage: null,
  userTeamEffectiveStatsHistory: [],
  availableSpecialDrills: [],
  activeSpecialDrill: null,
  isCpuDelegated: false,
  currentSeasonYear: INITIAL_SEASON_YEAR,
  historicalSeasonResults: [],
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case GameActionType.SELECT_TEAM:
      {
        const selectedTeamId = action.payload;
        const mutableTeams = KBO_TEAMS.map(t => ({...t})); 
        const schedule = generateSchedule(mutableTeams);
        const standings = initializeStandings(mutableTeams);
        const teamFinancials = initializeFinancials(mutableTeams, selectedTeamId);
        const teamMorale = initializeTeamMorale(mutableTeams);
        
        const userTeam = mutableTeams.find(t => t.id === selectedTeamId)!;
        const initialEffectiveStats = getDisplayEffectiveStats(
            userTeam, 
            teamMorale[selectedTeamId], 
            teamFinancials[selectedTeamId].budgetAllocation,
            null 
        );
        const initialStatsHistory: EffectiveStatsDataPoint[] = [{ 
            week: 1, 
            batting: initialEffectiveStats.batting,
            pitching: initialEffectiveStats.pitching,
            defense: initialEffectiveStats.defense
        }];
        const availableDrills = generateAvailableSpecialDrills();

        return {
          ...initialGameState, 
          allTeams: mutableTeams,
          selectedTeamId,
          schedule,
          standings,
          teamFinancials,
          teamMorale,
          userTeamEffectiveStatsHistory: initialStatsHistory,
          statusMessage: `${mutableTeams.find(t=>t.id === selectedTeamId)?.koreanName} 감독으로 부임하셨습니다! ${INITIAL_SEASON_YEAR} 시즌을 시작하세요. (총 ${TOTAL_WEEKS}주)`,
          availableSpecialDrills: availableDrills,
          currentSeasonYear: INITIAL_SEASON_YEAR,
          historicalSeasonResults: [],
          activeSpecialDrill: null,
          isCpuDelegated: false, 
          seasonEnded: false,
          currentWeek: 1,
          activeSponsorshipOffer: null,
          userGamePlayByPlayLog: null,
          showPlayByPlayModal: false,
          isPlayByPlayFullyDisplayed: false,
          scoutingReportMessage: null,
          gamesPlayedThisWeekInfo: null,
        };
      }
    case GameActionType.SIMULATE_WEEK:
      {
        if (state.currentWeek > TOTAL_WEEKS) return { ...state, seasonEnded: true, statusMessage: '시즌이 종료되었습니다.' };
        
        const currentWeekSchedule = state.schedule[state.currentWeek - 1];
        if (!currentWeekSchedule) {
            console.error(`No schedule found for week ${state.currentWeek}`);
            return { ...state, seasonEnded: true, statusMessage: '시즌 일정 오류로 종료되었습니다.' };
        }
        
        let newStandings = [...state.standings];
        const newTeamFinancials = JSON.parse(JSON.stringify(state.teamFinancials)) as Record<string, FinancialData>;
        const newTeamMorale = JSON.parse(JSON.stringify(state.teamMorale)) as Record<string, TeamMorale>;
        const newAllTeams = state.allTeams.map(t => ({...t})); 
        
        const gamesPlayedThisWeekInfo: { game: Game; homeTeamName: string, awayTeamName: string }[] = [];
        let userGameLogThisWeek: string[] | null = null;
        let weeklyScoutingMessage: string | null = null;
        let newUserTeamEffectiveStatsHistory = [...state.userTeamEffectiveStatsHistory];
        let newActiveSpecialDrill = state.activeSpecialDrill ? {...state.activeSpecialDrill} : null;
        let newAvailableSpecialDrills = [...state.availableSpecialDrills];

        if (newActiveSpecialDrill && state.selectedTeamId) {
            newActiveSpecialDrill.remainingWeeks -= 1;
            if (newActiveSpecialDrill.remainingWeeks <= 0) {
                newActiveSpecialDrill = null;
            }
        }
        
        if (!newActiveSpecialDrill && state.selectedTeamId && !state.isCpuDelegated) { 
            newAvailableSpecialDrills = generateAvailableSpecialDrills();
        } else if (newActiveSpecialDrill) {
            newAvailableSpecialDrills = []; 
        } else if (state.isCpuDelegated && !newActiveSpecialDrill){ 
             newAvailableSpecialDrills = generateAvailableSpecialDrills();
        }


        const updatedScheduleWeek = currentWeekSchedule.map(game => {
          if (game.played) return game; 
          
          const homeTeamIdx = newAllTeams.findIndex(t => t.id === game.homeTeamId);
          const awayTeamIdx = newAllTeams.findIndex(t => t.id === game.awayTeamId);

          if (homeTeamIdx === -1 || awayTeamIdx === -1) return game;
          
          const homeTeamForSim = state.allTeams.find(t => t.id === game.homeTeamId)!;
          const awayTeamForSim = state.allTeams.find(t => t.id === game.awayTeamId)!;

          const homeTeamMorale = newTeamMorale[game.homeTeamId];
          const awayTeamMorale = newTeamMorale[game.awayTeamId];
          
          const homeFinancialsForSim = newTeamFinancials[game.homeTeamId];
          const awayFinancialsForSim = newTeamFinancials[game.awayTeamId];

          const currentHomeDrill = game.homeTeamId === state.selectedTeamId ? newActiveSpecialDrill : null;
          const currentAwayDrill = game.awayTeamId === state.selectedTeamId ? newActiveSpecialDrill : null;

          const { homeScore, awayScore, log: gameLog } = simulateGame(
            homeTeamForSim, awayTeamForSim, 
            homeTeamMorale, awayTeamMorale,
            homeFinancialsForSim, awayFinancialsForSim,
            currentHomeDrill, currentAwayDrill
          );
          const playedGame = { ...game, homeScore, awayScore, played: true, log: gameLog };
          
          if (state.selectedTeamId && (game.homeTeamId === state.selectedTeamId || game.awayTeamId === state.selectedTeamId)) {
            userGameLogThisWeek = gameLog;
          }
          
          newStandings = updateStandings(newStandings, playedGame, homeScore, awayScore);
          
          const homeGameResult = homeScore > awayScore ? 'win' : (homeScore < awayScore ? 'loss' : 'draw');
          const awayGameResult = awayScore > homeScore ? 'win' : (awayScore < homeScore ? 'loss' : 'draw');
          
          const homeFanHappiness = game.homeTeamId === state.selectedTeamId ? newTeamFinancials[game.homeTeamId].fanHappiness : undefined;
          const awayFanHappiness = game.awayTeamId === state.selectedTeamId ? newTeamFinancials[game.awayTeamId].fanHappiness : undefined;

          newTeamMorale[game.homeTeamId] = updateTeamMorale(newTeamMorale[game.homeTeamId], homeGameResult, newTeamFinancials[game.homeTeamId].budget, newTeamFinancials[game.homeTeamId].budgetAllocation, undefined, homeFanHappiness);
          newTeamMorale[game.awayTeamId] = updateTeamMorale(newTeamMorale[game.awayTeamId], awayGameResult, newTeamFinancials[game.awayTeamId].budget, newTeamFinancials[game.awayTeamId].budgetAllocation, undefined, awayFanHappiness);
          
          gamesPlayedThisWeekInfo.push({ 
            game: playedGame, 
            homeTeamName: homeTeamForSim.koreanName, 
            awayTeamName: awayTeamForSim.koreanName 
          });
          return playedGame;
        });
        
        newAllTeams.forEach((team, index) => {
          const teamGamesThisWeek = updatedScheduleWeek.filter(g => (g.homeTeamId === team.id || g.awayTeamId === team.id) && g.played);
          
          if (team.id === state.selectedTeamId) {
            const userRank = newStandings.findIndex(s => s.teamId === team.id) + 1;
            newTeamFinancials[team.id].fanHappiness = updateFanHappiness(
                newTeamFinancials[team.id].fanHappiness,
                teamGamesThisWeek,
                team.id,
                newTeamFinancials[team.id].ticketPriceLevel,
                newTeamFinancials[team.id].budgetAllocation.marketing,
                newTeamMorale[team.id],
                userRank,
                newAllTeams.length
            );
          }
          
          const processResult = processWeeklyFinancesAndUpdateTeam(
             state.allTeams[index], 
             newTeamFinancials[team.id], 
             teamGamesThisWeek, 
             state.currentWeek
            );
          newTeamFinancials[team.id] = processResult.updatedFinancials;
          newAllTeams[index] = processResult.updatedTeam; 

          if (team.id === state.selectedTeamId) {
            if (processResult.scoutingMessage) weeklyScoutingMessage = processResult.scoutingMessage;
          }
        });

        const newSchedule = [...state.schedule];
        newSchedule[state.currentWeek - 1] = updatedScheduleWeek;
        
        const nextWeek = state.currentWeek + 1;
        const seasonEnded = nextWeek > TOTAL_WEEKS;
        let newHistoricalSeasonResults = [...state.historicalSeasonResults];

        if (seasonEnded && state.selectedTeamId) {
            const userTeamEntry = newStandings.find(s => s.teamId === state.selectedTeamId);
            const userTeamDetails = state.allTeams.find(t => t.id === state.selectedTeamId);
            if (userTeamEntry && userTeamDetails) {
                const seasonRecord: HistoricalSeasonRecord = {
                    seasonNumber: state.historicalSeasonResults.length + 1,
                    year: state.currentSeasonYear,
                    teamId: state.selectedTeamId,
                    teamKoreanName: userTeamDetails.koreanName,
                    rank: newStandings.findIndex(s => s.teamId === state.selectedTeamId) + 1,
                    wins: userTeamEntry.wins,
                    losses: userTeamEntry.losses,
                    draws: userTeamEntry.draws,
                };
                newHistoricalSeasonResults.push(seasonRecord);
            }
        }


        if (state.selectedTeamId && !seasonEnded) {
            const userUpdatedBaseTeam = newAllTeams.find(t => t.id === state.selectedTeamId)!;
            const userUpdatedMorale = newTeamMorale[state.selectedTeamId];
            const userBudgetAlloc = newTeamFinancials[state.selectedTeamId].budgetAllocation;
            const effectiveStatsForNextWeek = getDisplayEffectiveStats(userUpdatedBaseTeam, userUpdatedMorale, userBudgetAlloc, newActiveSpecialDrill);
            newUserTeamEffectiveStatsHistory.push({
                week: nextWeek,
                batting: effectiveStatsForNextWeek.batting,
                pitching: effectiveStatsForNextWeek.pitching,
                defense: effectiveStatsForNextWeek.defense,
            });
        }

        let baseStatusMessage = "";
        if (seasonEnded) {
            baseStatusMessage = `${state.currentSeasonYear} 시즌 모든 경기가 종료되었습니다! 최종 순위를 확인하세요.`;
        } else if (userGameLogThisWeek) {
            baseStatusMessage = `${state.allTeams.find(t=>t.id===state.selectedTeamId)?.koreanName}의 ${state.currentWeek}주차 경기 로그를 확인하세요.`;
        } else {
            baseStatusMessage = `${state.currentWeek}주차 경기가 종료되었습니다.`;
        }
        
        let newSponsorshipOfferGenerated: SponsorshipOffer | null = null;
        if (!seasonEnded && !state.activeSponsorshipOffer && !state.isCpuDelegated) { 
            newSponsorshipOfferGenerated = generateNewSponsorshipOffer();
            if (newSponsorshipOfferGenerated) {
                baseStatusMessage += ` 새로운 스폰서십 제안: ${newSponsorshipOfferGenerated.koreanSponsorName}!`;
            }
        } else if (state.isCpuDelegated && !state.activeSponsorshipOffer && !seasonEnded) {
             newSponsorshipOfferGenerated = generateNewSponsorshipOffer(); 
        }
        
        return {
          ...state,
          allTeams: newAllTeams, 
          currentWeek: nextWeek,
          standings: newStandings,
          schedule: newSchedule,
          teamFinancials: newTeamFinancials,
          teamMorale: newTeamMorale,
          userTeamEffectiveStatsHistory: newUserTeamEffectiveStatsHistory,
          gamesPlayedThisWeekInfo, 
          userGamePlayByPlayLog: userGameLogThisWeek,
          showPlayByPlayModal: !!userGameLogThisWeek,
          isPlayByPlayFullyDisplayed: !!userGameLogThisWeek ? false : state.isPlayByPlayFullyDisplayed, 
          seasonEnded,
          statusMessage: baseStatusMessage,
          activeSponsorshipOffer: newSponsorshipOfferGenerated || state.activeSponsorshipOffer,
          scoutingReportMessage: weeklyScoutingMessage || state.scoutingReportMessage,
          activeSpecialDrill: newActiveSpecialDrill,
          availableSpecialDrills: newAvailableSpecialDrills,
          historicalSeasonResults: newHistoricalSeasonResults,
        };
      }
    case GameActionType.START_NEW_SEASON:
      {
        const newSeasonYear = state.currentSeasonYear + 1;
        const mutableTeams = KBO_TEAMS.map(t => ({...t})); 
        const schedule = generateSchedule(mutableTeams);
        const standings = initializeStandings(mutableTeams);
        const teamFinancials = initializeFinancials(mutableTeams, state.selectedTeamId || undefined);
        const teamMorale = initializeTeamMorale(mutableTeams);
        const availableDrills = generateAvailableSpecialDrills();

        let initialStatsHistory: EffectiveStatsDataPoint[] = [];
        if (state.selectedTeamId) {
            const userTeam = mutableTeams.find(t => t.id === state.selectedTeamId)!;
            const initialEffectiveStats = getDisplayEffectiveStats(
                userTeam, 
                teamMorale[state.selectedTeamId], 
                teamFinancials[state.selectedTeamId].budgetAllocation,
                null 
            );
            initialStatsHistory = [{ 
                week: 1, 
                batting: initialEffectiveStats.batting,
                pitching: initialEffectiveStats.pitching,
                defense: initialEffectiveStats.defense
            }];
        }
        
        return {
          ...state,
          allTeams: mutableTeams,
          currentWeek: 1,
          schedule,
          standings,
          teamFinancials,
          teamMorale,
          userTeamEffectiveStatsHistory: initialStatsHistory,
          seasonEnded: false,
          gamesPlayedThisWeekInfo: null,
          statusMessage: `${newSeasonYear} 시즌이 시작되었습니다! (총 ${TOTAL_WEEKS}주) ${mutableTeams.find(t=>t.id === state.selectedTeamId)?.koreanName}을(를) 우승으로 이끄세요!`,
          activeSponsorshipOffer: null, 
          userGamePlayByPlayLog: null,
          showPlayByPlayModal: false,
          isPlayByPlayFullyDisplayed: false,
          scoutingReportMessage: null,
          availableSpecialDrills: availableDrills,
          activeSpecialDrill: null,
          isCpuDelegated: state.isCpuDelegated, // Preserve CPU delegation state
          currentSeasonYear: newSeasonYear,
          // historicalSeasonResults is preserved from previous state
        };
      }
    case GameActionType.ACKNOWLEDGE_PLAY_BY_PLAY:
      return { 
        ...state, 
        showPlayByPlayModal: false,
        statusMessage: state.gamesPlayedThisWeekInfo ? 
          `${state.currentWeek-1}주차 전체 경기 결과를 확인하세요.${state.statusMessage.split("경기 로그를 확인하세요.")[1] || ''}` 
          : state.statusMessage 
      };
    case GameActionType.PLAY_BY_PLAY_FULLY_DISPLAYED: 
      return {
        ...state,
        isPlayByPlayFullyDisplayed: true,
      };
    case GameActionType.CLOSE_RESULTS_MODAL:
      return { ...state, gamesPlayedThisWeekInfo: null, userGamePlayByPlayLog: null }; 
    
    case GameActionType.BOOST_MORALE:
      {
        if (!state.selectedTeamId) return state;
        const userTeamId = state.selectedTeamId;
        const currentUserMorale: TeamMorale = state.teamMorale[userTeamId]; 
        const currentUserFinancials = state.teamFinancials[userTeamId];

        if (currentUserMorale === TeamMorale.VERY_HIGH) {
          return { ...state, statusMessage: "팀 사기가 이미 최고치입니다!" };
        }
        if (currentUserFinancials.budget < MORALE_BOOST_COST) {
          return { ...state, statusMessage: "팀 사기 진작 활동을 위한 예산이 부족합니다." };
        }

        const newFinancials = {
          ...currentUserFinancials,
          budget: currentUserFinancials.budget - MORALE_BOOST_COST,
          expenseHistory: [
            ...currentUserFinancials.expenseHistory,
            { week: state.currentWeek, amount: MORALE_BOOST_COST, description: "팀 사기 진작 활동" }
          ]
        };
        
        let newMoraleValue: TeamMorale = currentUserMorale; 
        let successMessage = "팀 미팅이 별다른 효과를 보지 못했습니다. 사기는 그대로입니다.";

        if (Math.random() < MORALE_BOOST_SUCCESS_RATE) {
          newMoraleValue = applyMoraleChange(currentUserMorale, 'increase');
          if (newMoraleValue !== currentUserMorale) {
            successMessage = `팀 미팅이 성공적이었습니다! 팀 사기가 ${MORALE_DESCRIPTIONS[newMoraleValue]}(으)로 상승했습니다.`;
          } else {
             successMessage = "팀 사기가 이미 최고치이거나, 알 수 없는 이유로 상승하지 않았습니다.";
          }
        }
        
        const userBaseTeam = state.allTeams.find(t => t.id === userTeamId)!;
        const newEffectiveStats = getDisplayEffectiveStats(userBaseTeam, newMoraleValue, newFinancials.budgetAllocation, state.activeSpecialDrill);
        const updatedHistory = [...state.userTeamEffectiveStatsHistory];
        
        const currentWeekEntryIndex = updatedHistory.findIndex(entry => entry.week === state.currentWeek);
        if(currentWeekEntryIndex !== -1) {
            updatedHistory[currentWeekEntryIndex] = {
                ...updatedHistory[currentWeekEntryIndex], 
                batting: newEffectiveStats.batting,
                pitching: newEffectiveStats.pitching,
                defense: newEffectiveStats.defense
            };
        } else if (updatedHistory.length > 0) { 
            const lastEntry = updatedHistory[updatedHistory.length-1];
             if (lastEntry.week === state.currentWeek || (state.currentWeek === 1 && lastEntry.week ===1) ) { 
                updatedHistory[updatedHistory.length-1] = {
                    ...lastEntry,
                    batting: newEffectiveStats.batting,
                    pitching: newEffectiveStats.pitching,
                    defense: newEffectiveStats.defense
                };
            }
        }

        return {
          ...state,
          teamFinancials: {
            ...state.teamFinancials,
            [userTeamId]: newFinancials,
          },
          teamMorale: {
            ...state.teamMorale,
            [userTeamId]: newMoraleValue,
          },
          userTeamEffectiveStatsHistory: updatedHistory,
          statusMessage: successMessage,
        };
      }
    case GameActionType.ACCEPT_SPONSORSHIP:
      {
        if (!state.selectedTeamId || !state.activeSponsorshipOffer) return state;
        const userTeamId = state.selectedTeamId;
        const offer = state.activeSponsorshipOffer;
        
        const currentUserFinancials = state.teamFinancials[userTeamId];
        const newFinancials = {
          ...currentUserFinancials,
          budget: currentUserFinancials.budget + offer.amount,
          incomeHistory: [
            ...currentUserFinancials.incomeHistory,
            { week: state.currentWeek, amount: offer.amount, description: `${offer.koreanSponsorName} 스폰서십 계약` }
          ]
        };

        let newMoraleValue = state.teamMorale[userTeamId];
        let moraleMessage = "";
        if (offer.moraleEffect) {
            const oldMorale = newMoraleValue;
            newMoraleValue = updateTeamMorale(newMoraleValue, null, newFinancials.budget, newFinancials.budgetAllocation, offer.moraleEffect);
            if (newMoraleValue !== oldMorale) {
                moraleMessage = ` 팀 사기가 ${MORALE_DESCRIPTIONS[oldMorale]}에서 ${MORALE_DESCRIPTIONS[newMoraleValue]}(으)로 변경되었습니다.`;
            }
        }
        
        const userBaseTeam = state.allTeams.find(t => t.id === userTeamId)!;
        const newEffectiveStats = getDisplayEffectiveStats(userBaseTeam, newMoraleValue, newFinancials.budgetAllocation, state.activeSpecialDrill);
        const updatedHistory = [...state.userTeamEffectiveStatsHistory];
        const currentWeekEntryIndex = updatedHistory.findIndex(entry => entry.week === state.currentWeek);

        if (currentWeekEntryIndex !== -1) {
             updatedHistory[currentWeekEntryIndex] = {
                 ...updatedHistory[currentWeekEntryIndex],
                batting: newEffectiveStats.batting,
                pitching: newEffectiveStats.pitching,
                defense: newEffectiveStats.defense
            };
        } else if (updatedHistory.length > 0) {
             const lastEntry = updatedHistory[updatedHistory.length-1];
             if (lastEntry.week === state.currentWeek || (state.currentWeek === 1 && lastEntry.week ===1) ) {
                updatedHistory[updatedHistory.length-1] = {
                    ...lastEntry,
                    batting: newEffectiveStats.batting,
                    pitching: newEffectiveStats.pitching,
                    defense: newEffectiveStats.defense
                };
            }
        }

        return {
          ...state,
          teamFinancials: {
            ...state.teamFinancials,
            [userTeamId]: newFinancials,
          },
          teamMorale: {
            ...state.teamMorale,
            [userTeamId]: newMoraleValue,
          },
          userTeamEffectiveStatsHistory: updatedHistory,
          activeSponsorshipOffer: null,
          statusMessage: `${offer.koreanSponsorName}와의 스폰서십 계약 체결! +${offer.amount.toLocaleString()} KRW.${moraleMessage}`,
        };
      }
    case GameActionType.REJECT_SPONSORSHIP:
      {
        if (!state.activeSponsorshipOffer) return state;
        const offer = state.activeSponsorshipOffer;
        return {
          ...state,
          activeSponsorshipOffer: null,
          statusMessage: `${offer.koreanSponsorName}의 스폰서십 제안을 거절했습니다.`,
        };
      }
    case GameActionType.UPDATE_BUDGET_ALLOCATION:
        if (!state.selectedTeamId) return state;
        const newAllocation = action.payload;
        const sum = Object.values(newAllocation).reduce((s, v) => s + v, 0);
        
        if (Object.values(newAllocation).some(v => v < 0) || Math.abs(Math.round(sum) - 100) > 0.1 ) { // Allow for small float deviations
            return { ...state, statusMessage: `예산 배분 총합은 100%여야 하며(현재: ${sum.toFixed(1)}%), 각 항목은 0% 이상이어야 합니다.` };
        }
        const roundedAllocation = { ...newAllocation };
        let roundedSum = 0;
        (Object.keys(roundedAllocation) as Array<keyof BudgetAllocation>).forEach(key => {
            roundedAllocation[key] = Math.round(roundedAllocation[key]*10)/10; 
            roundedSum += roundedAllocation[key];
        });
        const diff = 100 - roundedSum;
        if (Math.abs(diff) > 0.01) { 
             const keyToAdjust = roundedAllocation.marketing + diff > 0 ? 'marketing' : 'trainingBatting';
             roundedAllocation[keyToAdjust] = Math.max(0, roundedAllocation[keyToAdjust] + diff);
             let finalSum = 0;
             (Object.keys(roundedAllocation) as Array<keyof BudgetAllocation>).forEach(key => finalSum += roundedAllocation[key]);
             const finalDiff = 100 - finalSum;
             if(Math.abs(finalDiff) > 0.01) roundedAllocation.trainingBatting += finalDiff; 
        }


        const userTeamId = state.selectedTeamId;
        const updatedFinancials = {
            ...state.teamFinancials[userTeamId],
            budgetAllocation: roundedAllocation, 
        };

        const userBaseTeam = state.allTeams.find(t => t.id === userTeamId)!; 
        const userMorale = state.teamMorale[userTeamId];
        const newEffectiveStats = getDisplayEffectiveStats(userBaseTeam, userMorale, roundedAllocation, state.activeSpecialDrill);
        const updatedHistory = [...state.userTeamEffectiveStatsHistory];
        const currentWeekEntryIndex = updatedHistory.findIndex(entry => entry.week === state.currentWeek);
        
        if (currentWeekEntryIndex !== -1) {
             updatedHistory[currentWeekEntryIndex] = {
                ...updatedHistory[currentWeekEntryIndex],
                batting: newEffectiveStats.batting,
                pitching: newEffectiveStats.pitching,
                defense: newEffectiveStats.defense
            };
        } else if (updatedHistory.length > 0) {
            const lastEntry = updatedHistory[updatedHistory.length-1];
             if (lastEntry.week === state.currentWeek || (state.currentWeek === 1 && lastEntry.week ===1) ) {
                updatedHistory[updatedHistory.length-1] = {
                    ...lastEntry,
                    batting: newEffectiveStats.batting,
                    pitching: newEffectiveStats.pitching,
                    defense: newEffectiveStats.defense
                };
            }
        }

        return {
            ...state,
            teamFinancials: {
                ...state.teamFinancials,
                [userTeamId]: updatedFinancials
            },
            userTeamEffectiveStatsHistory: updatedHistory,
            statusMessage: "예산 배분 계획이 업데이트되어 다음 주부터 적용됩니다."
        };
    case GameActionType.SET_TICKET_PRICE:
        if (!state.selectedTeamId) return state;
        const newTicketPriceLevel = action.payload;
        const userTeamIdForTicket = state.selectedTeamId;
        const currentTeamFinancials = state.teamFinancials[userTeamIdForTicket];
        
        const updatedTeamFinancialsForTicket = {
            ...currentTeamFinancials,
            ticketPriceLevel: newTicketPriceLevel,
        };
        return {
            ...state,
            teamFinancials: {
                ...state.teamFinancials,
                [userTeamIdForTicket]: updatedTeamFinancialsForTicket,
            },
            statusMessage: `티켓 가격이 "${TICKET_PRICE_LEVELS[newTicketPriceLevel].description}"(으)로 설정되었습니다. 다음 홈 경기부터 적용됩니다.`
        };
    case GameActionType.CLEAR_SCOUTING_MESSAGE:
        return { ...state, scoutingReportMessage: null };
    case GameActionType.SELECT_SPECIAL_DRILL:
        {
            if (!state.selectedTeamId) return state;
            const drillId = action.payload;
            const selectedDrill = state.availableSpecialDrills.find(d => d.id === drillId);
            if (!selectedDrill) return { ...state, statusMessage: "선택한 특별 훈련을 찾을 수 없습니다."};

            const userTeamId = state.selectedTeamId;
            const currentUserFinancials = state.teamFinancials[userTeamId];

            if (currentUserFinancials.budget < selectedDrill.cost) {
                return { ...state, statusMessage: `${selectedDrill.koreanName}을(를) 위한 예산이 부족합니다. (필요: ${selectedDrill.cost.toLocaleString()} KRW)`};
            }

            const newFinancials = {
                ...currentUserFinancials,
                budget: currentUserFinancials.budget - selectedDrill.cost,
                expenseHistory: [
                    ...currentUserFinancials.expenseHistory,
                    { week: state.currentWeek, amount: selectedDrill.cost, description: `${selectedDrill.koreanName} 실시` }
                ]
            };
            
            const newActiveDrill: ActiveSpecialDrill = {
                ...selectedDrill,
                remainingWeeks: selectedDrill.durationWeeks,
            };
            
            const userBaseTeam = state.allTeams.find(t => t.id === userTeamId)!;
            const userMorale = state.teamMorale[userTeamId];
            const newEffectiveStats = getDisplayEffectiveStats(userBaseTeam, userMorale, newFinancials.budgetAllocation, newActiveDrill);
            const updatedHistory = [...state.userTeamEffectiveStatsHistory];
            const currentWeekEntryIndex = updatedHistory.findIndex(entry => entry.week === state.currentWeek);
            
            if (currentWeekEntryIndex !== -1) {
                 updatedHistory[currentWeekEntryIndex] = {
                    ...updatedHistory[currentWeekEntryIndex],
                    batting: newEffectiveStats.batting,
                    pitching: newEffectiveStats.pitching,
                    defense: newEffectiveStats.defense
                };
            } else if (updatedHistory.length > 0) {
                const lastEntry = updatedHistory[updatedHistory.length-1];
                 if (lastEntry.week === state.currentWeek || (state.currentWeek === 1 && lastEntry.week ===1) ) {
                    updatedHistory[updatedHistory.length-1] = {
                        ...lastEntry,
                        batting: newEffectiveStats.batting,
                        pitching: newEffectiveStats.pitching,
                        defense: newEffectiveStats.defense
                    };
                }
            }
            
            return {
                ...state,
                teamFinancials: {
                    ...state.teamFinancials,
                    [userTeamId]: newFinancials,
                },
                activeSpecialDrill: newActiveDrill,
                availableSpecialDrills: [], 
                userTeamEffectiveStatsHistory: updatedHistory,
                statusMessage: `${selectedDrill.koreanName}을(를) 시작합니다! ${selectedDrill.durationWeeks}주 동안 효과가 적용됩니다.`
            };
        }
     case GameActionType.SKIP_SPECIAL_DRILLS:
      return {
        ...state,
        availableSpecialDrills: [],
        activeSpecialDrill: null, 
        statusMessage: "이번 주 특별 훈련을 건너뜁니다.",
      };
    case GameActionType.TOGGLE_CPU_DELEGATION: 
      const newIsCpuDelegated = !state.isCpuDelegated;
      return {
        ...state,
        isCpuDelegated: newIsCpuDelegated,
        statusMessage: `CPU 위임 ${newIsCpuDelegated ? '활성화됨' : '비활성화됨'}.`,
      };
    case GameActionType.RESET_GAME: // Primarily handled by localStorage clear and reload in component
      return initialGameState; // Returns to truly initial state (no team selected)
    default:
      return state;
  }
};

const getEffectiveInitialState = (): GameState => {
  try {
    const savedGame = localStorage.getItem('kboLeagueManagerGameState');
    if (savedGame) {
      const loadedState = JSON.parse(savedGame) as Partial<GameState>;
      const userTeamName = loadedState.allTeams?.find(t => t.id === loadedState.selectedTeamId)?.koreanName || '이전';
      
      const mergedState: GameState = {
        ...initialGameState, 
        ...loadedState,      
        showPlayByPlayModal: false,
        gamesPlayedThisWeekInfo: null,
        userGamePlayByPlayLog: null,
        isPlayByPlayFullyDisplayed: false,
        statusMessage: `저장된 게임 '${userTeamName}' (${loadedState.currentSeasonYear || INITIAL_SEASON_YEAR} 시즌)을(를) 불러왔습니다. (주차: ${loadedState.currentWeek || 1})`,
        allTeams: loadedState.allTeams && Array.isArray(loadedState.allTeams) ? loadedState.allTeams : initialGameState.allTeams,
        schedule: loadedState.schedule && Array.isArray(loadedState.schedule) ? loadedState.schedule : initialGameState.schedule,
        standings: loadedState.standings && Array.isArray(loadedState.standings) ? loadedState.standings : initialGameState.standings,
        teamFinancials: loadedState.teamFinancials && typeof loadedState.teamFinancials === 'object' ? loadedState.teamFinancials : initialGameState.teamFinancials,
        teamMorale: loadedState.teamMorale && typeof loadedState.teamMorale === 'object' ? loadedState.teamMorale : initialGameState.teamMorale,
        userTeamEffectiveStatsHistory: loadedState.userTeamEffectiveStatsHistory && Array.isArray(loadedState.userTeamEffectiveStatsHistory) ? loadedState.userTeamEffectiveStatsHistory : initialGameState.userTeamEffectiveStatsHistory,
        availableSpecialDrills: loadedState.availableSpecialDrills && Array.isArray(loadedState.availableSpecialDrills) ? loadedState.availableSpecialDrills : initialGameState.availableSpecialDrills,
        activeSponsorshipOffer: loadedState.activeSponsorshipOffer !== undefined ? loadedState.activeSponsorshipOffer : initialGameState.activeSponsorshipOffer,
        activeSpecialDrill: loadedState.activeSpecialDrill !== undefined ? loadedState.activeSpecialDrill : initialGameState.activeSpecialDrill,
        scoutingReportMessage: loadedState.scoutingReportMessage !== undefined ? loadedState.scoutingReportMessage : initialGameState.scoutingReportMessage,
        currentSeasonYear: loadedState.currentSeasonYear || INITIAL_SEASON_YEAR,
        historicalSeasonResults: loadedState.historicalSeasonResults && Array.isArray(loadedState.historicalSeasonResults) ? loadedState.historicalSeasonResults : initialGameState.historicalSeasonResults,
      };
      return mergedState;
    }
  } catch (error) {
    console.error("저장된 게임 불러오기 실패:", error);
    localStorage.removeItem('kboLeagueManagerGameState'); 
    return { ...initialGameState, statusMessage: "저장된 게임을 불러오는데 실패하여 새 게임을 시작합니다." };
  }
  return { ...initialGameState }; 
};


const App: React.FC = () => {
  const [internalGameState, dispatch] = useReducer(gameReducer, getEffectiveInitialState());
  const [isLoading, setIsLoading] = useState(true);
  const [standingsHistory, setStandingsHistory] = useState<StandingsEntry[][]>([]);
  const [cpuActionTimeout, setCpuActionTimeout] = useState<number | null>(null);
  const [autoNewSeasonTimeout, setAutoNewSeasonTimeout] = useState<number | null>(null);


  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); 
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (internalGameState.selectedTeamId) { 
      const {
        showPlayByPlayModal,
        gamesPlayedThisWeekInfo,
        userGamePlayByPlayLog,
        isPlayByPlayFullyDisplayed,
        statusMessage, 
        ...persistentState
      } = internalGameState;
      localStorage.setItem('kboLeagueManagerGameState', JSON.stringify(persistentState));
    }
  }, [internalGameState]); 


   useEffect(() => {
    if (internalGameState.currentWeek === 1) {
        setStandingsHistory([]);
    } else if (internalGameState.currentWeek > 1 && internalGameState.currentWeek <= TOTAL_WEEKS + 1) {
        if (!internalGameState.gamesPlayedThisWeekInfo && !internalGameState.showPlayByPlayModal) {
            setStandingsHistory(prev => {
                const lastSavedWeekInHistory = prev.length;
                const expectedWeekForNewEntry = internalGameState.currentWeek - 1; 
                
                if (lastSavedWeekInHistory < expectedWeekForNewEntry) {
                    return [...prev, internalGameState.standings];
                }
                return prev; 
            });
        }
    }
  }, [internalGameState.currentWeek, internalGameState.standings, internalGameState.gamesPlayedThisWeekInfo, internalGameState.showPlayByPlayModal]);


  const userTeamId = internalGameState.selectedTeamId;
  const userFinancials = userTeamId ? internalGameState.teamFinancials[userTeamId] : undefined;
  const userBudget = userFinancials?.budget;


  useEffect(() => {
    if (internalGameState.isCpuDelegated && !internalGameState.seasonEnded && userTeamId && userFinancials) {
      if (cpuActionTimeout) {
        clearTimeout(cpuActionTimeout);
      }

      const performCpuAction = () => {
        if (internalGameState.showPlayByPlayModal) {
          if (internalGameState.isPlayByPlayFullyDisplayed) {
            dispatch({ type: GameActionType.ACKNOWLEDGE_PLAY_BY_PLAY });
          }
          return; 
        }

        if (internalGameState.activeSponsorshipOffer) {
          const offer = internalGameState.activeSponsorshipOffer;
          const isBudgetVeryLow = userFinancials.budget < WEEKLY_EXPENSES * 2;
          if ( (offer.amount > 20000000 && (!offer.moraleEffect || offer.moraleEffect.type !== 'penalty')) || isBudgetVeryLow ) {
            dispatch({ type: GameActionType.ACCEPT_SPONSORSHIP });
          } else {
            dispatch({ type: GameActionType.REJECT_SPONSORSHIP });
          }
          return; 
        }

        if (internalGameState.availableSpecialDrills.length > 0 && !internalGameState.activeSpecialDrill) {
          if (userBudget === undefined) return; 
          const affordableDrills = internalGameState.availableSpecialDrills.filter(d => userBudget >= d.cost);
          if (affordableDrills.length > 0) {
            dispatch({ type: GameActionType.SELECT_SPECIAL_DRILL, payload: affordableDrills[0].id });
          } else {
            dispatch({ type: GameActionType.SKIP_SPECIAL_DRILLS });
          }
          return; 
        }
        
        const newTicketPrice = determineCpuTicketPrice(userFinancials, internalGameState.currentWeek);
        if (newTicketPrice) {
            dispatch({ type: GameActionType.SET_TICKET_PRICE, payload: newTicketPrice });
            return; 
        }

        const newBudgetAllocation = determineCpuBudgetAllocation(userFinancials, internalGameState.currentWeek);
        if (newBudgetAllocation) {
            dispatch({ type: GameActionType.UPDATE_BUDGET_ALLOCATION, payload: newBudgetAllocation });
            return; 
        }
        
        const canSimulate = !internalGameState.activeSponsorshipOffer && 
                            !(internalGameState.availableSpecialDrills.length > 0 && !internalGameState.activeSpecialDrill);

        if (canSimulate && internalGameState.currentWeek <= TOTAL_WEEKS) {
            dispatch({ type: GameActionType.SIMULATE_WEEK });
        } else if (internalGameState.currentWeek > TOTAL_WEEKS && !internalGameState.seasonEnded) {
             // Season ended this simulation, handled by another effect.
             // CPU delegation will be turned off if START_NEW_SEASON is not auto-triggered.
        }
      };
      
      const timeoutId = window.setTimeout(performCpuAction, 1500); 
      setCpuActionTimeout(timeoutId);

    } else if (!internalGameState.isCpuDelegated && cpuActionTimeout) {
      clearTimeout(cpuActionTimeout);
      setCpuActionTimeout(null);
    } else if (internalGameState.isCpuDelegated && internalGameState.seasonEnded && cpuActionTimeout) {
      clearTimeout(cpuActionTimeout); // Stop normal CPU actions if season ended
      setCpuActionTimeout(null);
    }

    return () => {
      if (cpuActionTimeout) {
        clearTimeout(cpuActionTimeout);
      }
    };
  }, [
    internalGameState.isCpuDelegated, 
    internalGameState.currentWeek, 
    internalGameState.activeSponsorshipOffer, 
    internalGameState.availableSpecialDrills, 
    internalGameState.activeSpecialDrill,
    internalGameState.seasonEnded,
    internalGameState.showPlayByPlayModal, 
    internalGameState.isPlayByPlayFullyDisplayed, 
    userTeamId, 
    userFinancials, 
    userBudget, 
    dispatch 
  ]);

  // Auto-start new season if CPU delegated and season ended
  useEffect(() => {
    if (internalGameState.isCpuDelegated && internalGameState.seasonEnded && internalGameState.selectedTeamId) {
      if (autoNewSeasonTimeout) clearTimeout(autoNewSeasonTimeout); // Clear previous timeout if any

      const timeoutId = window.setTimeout(() => {
        // Double check conditions as state might change due to other interactions
        if (internalGameState.isCpuDelegated && internalGameState.seasonEnded && internalGameState.selectedTeamId) {
          dispatch({ type: GameActionType.START_NEW_SEASON });
        }
      }, 3000); // 3 seconds delay
      setAutoNewSeasonTimeout(timeoutId);
    } else if (autoNewSeasonTimeout) { // If conditions no longer met, clear timeout
        clearTimeout(autoNewSeasonTimeout);
        setAutoNewSeasonTimeout(null);
    }
    
    return () => {
      if (autoNewSeasonTimeout) {
        clearTimeout(autoNewSeasonTimeout);
      }
    };
  }, [internalGameState.isCpuDelegated, internalGameState.seasonEnded, internalGameState.selectedTeamId, dispatch]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary">
        <LoadingSpinner size="lg" message="KBO 리그 매니저 로딩 중..." />
      </div>
    );
  }

  if (!internalGameState.selectedTeamId) {
    return <TeamSelection teams={internalGameState.allTeams} onSelectTeam={(teamId) => dispatch({ type: GameActionType.SELECT_TEAM, payload: teamId })} />;
  }
  
  return (
    <>
      <Dashboard 
        gameState={internalGameState} 
        dispatch={dispatch} 
        standingsHistory={standingsHistory}
      />
      <PlayByPlayModal
        isOpen={internalGameState.showPlayByPlayModal && !!internalGameState.userGamePlayByPlayLog}
        onClose={() => dispatch({ type: GameActionType.ACKNOWLEDGE_PLAY_BY_PLAY })}
        onAllLogsDisplayed={() => dispatch({ type: GameActionType.PLAY_BY_PLAY_FULLY_DISPLAYED })} 
        log={internalGameState.userGamePlayByPlayLog}
        teams={internalGameState.allTeams}
        userTeamId={internalGameState.selectedTeamId}
        currentWeek={internalGameState.currentWeek}
        isCpuDelegated={internalGameState.isCpuDelegated} 
        dispatch={dispatch} 
      />
      <GameResultModal
        isOpen={!!internalGameState.gamesPlayedThisWeekInfo && !internalGameState.showPlayByPlayModal}
        onClose={() => dispatch({ type: GameActionType.CLOSE_RESULTS_MODAL })}
        gamesPlayedThisWeek={internalGameState.gamesPlayedThisWeekInfo}
        currentWeek={internalGameState.currentWeek} 
      />
    </>
  );
};

export default App;

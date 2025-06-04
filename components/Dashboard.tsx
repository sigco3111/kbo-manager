import React from 'react';
import { GameState, Team, GameActionType, TeamMorale, SponsorshipOffer, BudgetAllocation, FanHappinessLevel, HistoricalSeasonRecord } from '../types';
import { StandingsTable } from './StandingsTable';
import { FinancialChart } from './FinancialChart';
import { PerformanceChart } from './PerformanceChart';
import { EffectiveStatsChart } from './EffectiveStatsChart'; 
import { HistoricalStandingsChart } from './HistoricalStandingsChart'; // New
import { Button } from './common/Button';
import { Card } from './common/Card';
import { ClubManagementCard } from './ClubManagementCard';
import { SpecialDrillsCard } from './SpecialDrillsCard';
import { TOTAL_WEEKS, MORALE_DESCRIPTIONS, MORALE_STAT_MODIFIERS, DEFAULT_BUDGET_ALLOCATION, FAN_HAPPINESS_LEVELS } from '../constants';
import { getDisplayEffectiveStats, getFanHappinessLevelFromScore } from '../utils/gameLogic';


interface DashboardProps {
  gameState: GameState;
  dispatch: React.Dispatch<any>; 
  standingsHistory: any[]; 
}

export const Dashboard: React.FC<DashboardProps> = ({ gameState, dispatch, standingsHistory }) => {
  const { 
    selectedTeamId, allTeams, currentWeek, schedule, standings, 
    teamFinancials, seasonEnded, teamMorale, statusMessage, activeSponsorshipOffer,
    scoutingReportMessage, userTeamEffectiveStatsHistory,
    availableSpecialDrills, activeSpecialDrill, isCpuDelegated,
    currentSeasonYear, historicalSeasonResults // New fields from gameState
  } = gameState;

  if (!selectedTeamId) return null; 

  const userBaseTeam = allTeams.find(t => t.id === selectedTeamId) as Team; 
  const userFinancials = teamFinancials[selectedTeamId];
  const userCurrentMorale = teamMorale[selectedTeamId] || TeamMorale.MEDIUM;
  const userBudgetAllocation = userFinancials.budgetAllocation || DEFAULT_BUDGET_ALLOCATION;
  const userFanHappinessScore = userFinancials.fanHappiness;
  const userFanHappinessLevel = getFanHappinessLevelFromScore(userFanHappinessScore);
  
  const displayEffectiveStats = getDisplayEffectiveStats(userBaseTeam, userCurrentMorale, userBudgetAllocation, activeSpecialDrill);


  const upcomingGamesForWeek = schedule[currentWeek -1] || [];
  const userGameThisWeek = upcomingGamesForWeek.find(g => g.homeTeamId === selectedTeamId || g.awayTeamId === selectedTeamId);
  
  const getTeamName = (id: string) => allTeams.find(t => t.id === id)?.koreanName || 'Unknown Team';

  const handleSimulateWeek = () => {
    dispatch({ type: GameActionType.SIMULATE_WEEK });
  };

  const handleNewSeason = () => {
    dispatch({ type: GameActionType.START_NEW_SEASON });
  };

  const handleAcceptSponsorship = () => {
    dispatch({ type: GameActionType.ACCEPT_SPONSORSHIP });
  };

  const handleRejectSponsorship = () => {
    dispatch({ type: GameActionType.REJECT_SPONSORSHIP });
  };
  
  const userTeamStanding = standings.find(s => s.teamId === selectedTeamId);
  const moraleDescription = MORALE_DESCRIPTIONS[userCurrentMorale];
  const moraleModifierForDisplay = MORALE_STAT_MODIFIERS[userCurrentMorale];
  const fanHappinessDescription = FAN_HAPPINESS_LEVELS[userFanHappinessLevel].description;


  const formatCurrencyMillions = (amount: number) => {
    return `${(amount / 1000000).toLocaleString()}M KRW`;
  }

  const handleClearScoutingMessage = () => {
    dispatch({ type: GameActionType.CLEAR_SCOUTING_MESSAGE });
  };

  const handleResetGame = () => {
    if (window.confirm("정말로 게임을 초기화하시겠습니까? 모든 진행 상황이 삭제됩니다.")) {
      localStorage.removeItem('kboLeagueManagerGameState');
      // dispatch({ type: GameActionType.RESET_GAME }); // This would reset state but not clear localStorage for next load
      window.location.reload(); // Reloads the app, effectively starting from scratch
    }
  };

  return (
    <div className="min-h-screen bg-primary p-4 md:p-6 space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-center pb-4 border-b border-accent">
        <div>
          <h1 className={`text-3xl font-bold ${userBaseTeam.textColor} flex items-baseline`} style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)'}}>
            <span className={`py-1 px-3 rounded ${userBaseTeam.logoColor}`}>{userBaseTeam.koreanName}</span>
            <span className="ml-2">운영</span>
          </h1>
          <p className="text-text-secondary mt-1">
            {currentSeasonYear} 시즌 - {currentWeek > TOTAL_WEEKS ? `시즌 종료` : `${currentWeek} 주차`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 mt-2 sm:mt-0">
            <div className="flex items-center space-x-2">
                <label htmlFor="cpu-delegation-toggle" className="text-text-secondary cursor-pointer select-none">
                CPU 위임:
                </label>
                <input
                type="checkbox"
                id="cpu-delegation-toggle"
                className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 cursor-pointer"
                checked={isCpuDelegated}
                onChange={() => dispatch({ type: GameActionType.TOGGLE_CPU_DELEGATION })}
                aria-checked={isCpuDelegated}
                aria-label="CPU 위임 모드 토글"
                />
                {isCpuDelegated && <span className="text-xs text-indigo-400 animate-pulse">자동 진행 중...</span>}
            </div>
            {seasonEnded && (
              <>
                <Button onClick={handleNewSeason} variant="primary" size="lg" aria-label="새 시즌 시작">
                    새 시즌 시작
                </Button>
                <Button onClick={handleResetGame} variant="danger" size="md" aria-label="게임 초기화">
                    게임 초기화
                </Button>
              </>
            )}
            {!seasonEnded && currentWeek <= TOTAL_WEEKS && (
            <Button 
                onClick={handleSimulateWeek} 
                variant="primary" 
                size="lg" 
                disabled={currentWeek > TOTAL_WEEKS || !!activeSponsorshipOffer || (availableSpecialDrills.length > 0 && !activeSpecialDrill) || isCpuDelegated}
                aria-label={isCpuDelegated ? "CPU 자동 진행 중" : `다음 주 진행, 현재 ${currentWeek}주차 из ${TOTAL_WEEKS}주차`}
                title={isCpuDelegated ? "CPU가 자동으로 게임을 진행합니다." : (activeSponsorshipOffer ? "스폰서십 제안에 먼저 응답해주세요." : (availableSpecialDrills.length > 0 && !activeSpecialDrill && !isCpuDelegated ? "특별 훈련을 먼저 선택하거나 다음 주로 넘겨주세요." :`다음 주 진행 (${currentWeek}/${TOTAL_WEEKS})`))}
            >
                {isCpuDelegated ? "CPU 자동 진행 중..." : (activeSponsorshipOffer ? "제안 응답 필요" : (availableSpecialDrills.length > 0 && !activeSpecialDrill ? "훈련 선택 필요" : `다음 주 진행 (${currentWeek}/${TOTAL_WEEKS})`))}
            </Button>
            )}
        </div>
      </header>

      {statusMessage && (
        <Card className={`text-white ${
            statusMessage.includes("성공") || statusMessage.includes("부임") || statusMessage.includes("시작") || 
            statusMessage.includes("체결") || statusMessage.includes("업데이트") || statusMessage.includes("적용") || 
            statusMessage.includes("설정") || statusMessage.includes("복귀") || statusMessage.includes("실시합니다") || statusMessage.includes("활성화됨")
            ? 'bg-green-600' 
            : (statusMessage.includes("부족") || statusMessage.includes("실패") || statusMessage.includes("오류") || 
               statusMessage.includes("거절") || statusMessage.includes("100%") || statusMessage.includes("부상 발생") || statusMessage.includes("찾을 수 없습니다")
               ? 'bg-red-600' 
               : 'bg-indigo-600')
        }`}>
            <p role="alert" dangerouslySetInnerHTML={{ __html: statusMessage.replace(/\. /g, '.<br/>') }}></p>
        </Card>
      )}

      {scoutingReportMessage && (
        <Card className="bg-blue-600 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">스카우팅 리포트</h3>
              <p>{scoutingReportMessage}</p>
            </div>
            <Button onClick={handleClearScoutingMessage} variant="secondary" size="sm" className="ml-4 flex-shrink-0">확인</Button>
          </div>
        </Card>
      )}
      
      {seasonEnded && (
        <Card className="bg-indigo-700 text-white text-center">
            <h2 className="text-2xl font-bold mb-2">{currentSeasonYear} 시즌 종료!</h2>
            <p>최종 순위와 재정을 확인하고 새 시즌을 시작하거나 게임을 초기화할 수 있습니다.</p>
            {userTeamStanding && (
              <p className="mt-2">
                {userBaseTeam.koreanName} 최종 성적: {userTeamStanding.wins}승 {userTeamStanding.losses}패 {userTeamStanding.draws}무 (리그 {standings.findIndex(s => s.teamId === selectedTeamId) + 1}위)
              </p>
            )}
        </Card>
      )}

      {activeSponsorshipOffer && !seasonEnded && (
        <Card title="스폰서십 제안" className="border-2 border-yellow-400">
          <h3 className="text-xl font-semibold text-yellow-300">{activeSponsorshipOffer.koreanSponsorName}</h3>
          <p className="text-text-secondary my-2">{activeSponsorshipOffer.description}</p>
          <p className="text-lg text-white font-bold">제안 금액: {formatCurrencyMillions(activeSponsorshipOffer.amount)}</p>
          {activeSponsorshipOffer.moraleEffect && (
            <p className={`text-sm mt-1 ${activeSponsorshipOffer.moraleEffect.type === 'boost' ? 'text-green-400' : 'text-red-400'}`}>
              (수락 시 사기 {activeSponsorshipOffer.moraleEffect.type === 'boost' ? '상승' : '하락'} 가능성 {activeSponsorshipOffer.moraleEffect.chance * 100}%)
            </p>
          )}
          <div className="mt-4 flex space-x-3">
            <Button onClick={handleAcceptSponsorship} variant="primary" aria-label={`스폰서십 수락: ${activeSponsorshipOffer.koreanSponsorName}`} disabled={isCpuDelegated} title={isCpuDelegated ? "CPU 위임 중에는 수동 조작 불가" : undefined}>수락</Button>
            <Button onClick={handleRejectSponsorship} variant="danger" aria-label={`스폰서십 거절: ${activeSponsorshipOffer.koreanSponsorName}`} disabled={isCpuDelegated} title={isCpuDelegated ? "CPU 위임 중에는 수동 조작 불가" : undefined}>거절</Button>
          </div>
        </Card>
      )}
      
      {!seasonEnded && (availableSpecialDrills.length > 0 || activeSpecialDrill) && (
          <SpecialDrillsCard
            availableDrills={availableSpecialDrills}
            activeDrill={activeSpecialDrill}
            dispatch={dispatch}
            userBudget={userFinancials.budget}
            hasActiveSponsorshipOffer={!!activeSponsorshipOffer}
            isCpuDelegated={isCpuDelegated} 
          />
      )}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <Card title="팀 요약">
            {userTeamStanding && userBaseTeam && userFinancials ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-text-main text-sm">
                <div className="space-y-1.5">
                  <p><strong>성적:</strong> {userTeamStanding.wins}승 {userTeamStanding.losses}패 {userTeamStanding.draws}무</p>
                  <p><strong>승률:</strong> {userTeamStanding.winPercentage.toFixed(3)}</p>
                  <p><strong>리그 순위:</strong> {standings.findIndex(s => s.teamId === selectedTeamId) + 1} 위</p>
                  <p><strong>현재 예산:</strong> {formatCurrencyMillions(userFinancials.budget)}</p>
                  <p>
                    <strong>팬 만족도:</strong> {fanHappinessDescription} ({userFanHappinessScore}점)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p>
                    <strong>팀 사기:</strong> {moraleDescription}
                    <span className={`ml-1 ${moraleModifierForDisplay > 0 ? 'text-green-400' : moraleModifierForDisplay < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      (주요 능력치 {moraleModifierForDisplay > 0 ? `+${moraleModifierForDisplay}` : moraleModifierForDisplay})
                    </span>
                  </p>
                  <div className="pt-1">
                    <p className="font-semibold">적용 능력치 (기본+훈련+사기+특별훈련):</p>
                    <ul className="list-disc list-inside ml-1">
                        <li>타격: {displayEffectiveStats.batting} (기본: {userBaseTeam.batting})</li>
                        <li>투구: {displayEffectiveStats.pitching} (기본: {userBaseTeam.pitching})</li>
                        <li>수비: {displayEffectiveStats.defense} (기본: {userBaseTeam.defense})</li>
                    </ul>
                  </div>
                </div>
              </div>
            ): (
                 <p className="text-text-secondary">데이터 로딩 중...</p>
            )}
          </Card>
          <StandingsTable standings={standings} teams={allTeams} userTeamId={selectedTeamId} />
          <ClubManagementCard 
            userFinancials={userFinancials}
            userTeamBaseStats={userBaseTeam} 
            userMorale={userCurrentMorale}
            dispatch={dispatch}
            seasonEnded={seasonEnded}
            hasActiveSponsorshipOffer={!!activeSponsorshipOffer}
            activeSpecialDrill={activeSpecialDrill}
            isCpuDelegated={isCpuDelegated} 
          />
        </div>
        <aside className="lg:col-span-1 space-y-6">
          <Card title="다음 경기">
            {currentWeek <= TOTAL_WEEKS && userGameThisWeek ? (
              <div>
                <p className="text-lg font-semibold text-indigo-400">Week {currentWeek}</p>
                <p className="text-text-main">
                  {getTeamName(userGameThisWeek.homeTeamId)} (홈) vs {getTeamName(userGameThisWeek.awayTeamId)} (원정)
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  {userGameThisWeek.homeTeamId === selectedTeamId ? '우리 팀 홈 경기입니다!' : '우리 팀 원정 경기입니다.'}
                </p>
              </div>
            ) : (
              <p className="text-text-secondary">{seasonEnded ? "시즌이 종료되었습니다." : "모든 경기가 완료되었습니다."}</p>
            )}
          </Card>
        </aside>
      </div>

      {historicalSeasonResults && historicalSeasonResults.length > 0 && (
        <HistoricalStandingsChart history={historicalSeasonResults} />
      )}

      <FinancialChart financialData={userFinancials} />
      
      {selectedTeamId && standingsHistory && (
        <PerformanceChart 
          standingsHistory={standingsHistory} 
          userTeamId={selectedTeamId}
          currentWeek={currentWeek}
        />
      )}

      {selectedTeamId && userTeamEffectiveStatsHistory && userTeamEffectiveStatsHistory.length > 0 && (
        <EffectiveStatsChart 
            statsHistory={userTeamEffectiveStatsHistory} 
        />
      )}
      
      <footer className="mt-8 text-center text-text-secondary text-sm">
        <p>&copy; {new Date().getFullYear()} KBO League Manager</p>
      </footer>
    </div>
  );
};
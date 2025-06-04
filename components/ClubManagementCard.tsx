
import React, { useState, useEffect, useCallback } from 'react';
import { FinancialData, TeamMorale, GameActionType, BudgetAllocation, Team, TicketPriceLevel, ActiveSpecialDrill } from '../types';
import { Card } from './common/Card';
import { Button } from './common/Button';
import {
    DEFAULT_BUDGET_ALLOCATION, MORALE_BOOST_COST,
    TRAINING_STAT_POINT_DIVISOR, MAX_TRAINING_STAT_EFFECT,
    DEFAULT_TRAINING_BATTING_ALLOCATION, DEFAULT_TRAINING_PITCHING_ALLOCATION, DEFAULT_TRAINING_DEFENSE_ALLOCATION,
    DEFAULT_MARKETING_ALLOCATION, DEFAULT_MEDICAL_ALLOCATION,
    MARKETING_ALLOCATION_INCOME_DIVISOR, MAX_MARKETING_INCOME_EFFECT_PERCENT,
    FACILITY_HIGH_ALLOCATION_THRESHOLD, FACILITY_LOW_ALLOCATION_THRESHOLD,
    SCOUTING_HIGH_ALLOCATION_THRESHOLD, MEDICAL_HIGH_ALLOCATION_THRESHOLD, MEDICAL_MORALE_RESILIENCE_EFFECT_CHANCE,
    TICKET_PRICE_LEVELS, DEFAULT_TICKET_PRICE_LEVEL
} from '../constants';

interface ClubManagementCardProps {
  userFinancials: FinancialData;
  userTeamBaseStats: Team;
  userMorale: TeamMorale;
  dispatch: React.Dispatch<any>;
  seasonEnded: boolean;
  hasActiveSponsorshipOffer: boolean;
  activeSpecialDrill: ActiveSpecialDrill | null;
  isCpuDelegated: boolean;
}

const formatCurrencyMillions = (amount: number) => `${(amount / 1000000).toLocaleString()}M KRW`;
const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export const ClubManagementCard: React.FC<ClubManagementCardProps> = ({
    userFinancials, userTeamBaseStats, userMorale, dispatch, seasonEnded,
    hasActiveSponsorshipOffer, activeSpecialDrill, isCpuDelegated
}) => {
  const [allocations, setAllocations] = useState<BudgetAllocation>(
    userFinancials.budgetAllocation || DEFAULT_BUDGET_ALLOCATION
  );
  const [ticketPrice, setTicketPrice] = useState<TicketPriceLevel>(
    userFinancials.ticketPriceLevel || DEFAULT_TICKET_PRICE_LEVEL
  );

  useEffect(() => {
    setAllocations(userFinancials.budgetAllocation || DEFAULT_BUDGET_ALLOCATION);
    setTicketPrice(userFinancials.ticketPriceLevel || DEFAULT_TICKET_PRICE_LEVEL);
  }, [userFinancials.budgetAllocation, userFinancials.ticketPriceLevel]);


  const handleSliderChange = (changedKey: keyof BudgetAllocation, newValueStr: string) => {
    const parsedNewValue = parseInt(newValueStr, 10);
    if (isNaN(parsedNewValue)) return;

    const newCalculatedAllocations = ((currentAllocs: BudgetAllocation, keyToChange: keyof BudgetAllocation, valToSet: number): BudgetAllocation => {
        const newValues = { ...currentAllocs };
        newValues[keyToChange] = clamp(valToSet, 0, 100);

        let currentSum = 0;
        for (const key in newValues) {
            currentSum += newValues[key as keyof BudgetAllocation];
        }
        let diff = 100 - currentSum;
        const otherKeys = (Object.keys(newValues) as Array<keyof BudgetAllocation>).filter(k => k !== keyToChange);
        if (diff !== 0 && otherKeys.length > 0) {
            let sumOfOthers = 0;
            otherKeys.forEach(k => sumOfOthers += newValues[k]);

            if (sumOfOthers === 0 && diff > 0) {
                const share = Math.floor(diff / otherKeys.length);
                const remainder = diff % otherKeys.length;
                otherKeys.forEach((k, idx) => {
                    newValues[k] = clamp(newValues[k] + share + (idx < remainder ? 1 : 0) , 0, 100);
                });
            } else if (sumOfOthers > 0 || (sumOfOthers === 0 && diff < 0)) {
                let totalAppliedDiff = 0;
                const changes = otherKeys.map(k => {
                    const proportion = sumOfOthers === 0 ? (1 / otherKeys.length) : (newValues[k] / sumOfOthers) ;
                    return Math.round(diff * proportion);
                });
                changes.forEach((change, idx) => {
                    const k = otherKeys[idx];
                    newValues[k] = clamp(newValues[k] + change, 0, 100);
                    totalAppliedDiff += change;
                });
                let finalPassDiff = diff - totalAppliedDiff;
                if (finalPassDiff !== 0) {
                    for (const k of otherKeys) {
                        if (newValues[k] + finalPassDiff >= 0 && newValues[k] + finalPassDiff <= 100) {
                            newValues[k] = clamp(newValues[k] + finalPassDiff, 0, 100);
                            finalPassDiff = 0;
                            break;
                        }
                    }
                    if (finalPassDiff !== 0 && newValues[keyToChange] - finalPassDiff >=0 && newValues[keyToChange] - finalPassDiff <=100) {
                         newValues[keyToChange] = clamp(newValues[keyToChange] - finalPassDiff, 0, 100);
                    }
                }
            }
        }
        currentSum = 0;
        let allKeys = Object.keys(newValues) as Array<keyof BudgetAllocation>;
        allKeys.forEach(k => currentSum += newValues[k]);
        if (Math.round(currentSum) !== 100 && allKeys.length > 0) {
            const adjustment = 100 - currentSum;
            const keyToAdjustFinally = allKeys.find(k => newValues[k] + adjustment >=0 && newValues[k] + adjustment <=100 && k !== keyToChange) ||
                                      allKeys.find(k => newValues[k] + adjustment >=0 && newValues[k] + adjustment <=100 ) ||
                                      keyToChange;
            if(keyToAdjustFinally) newValues[keyToAdjustFinally] = clamp(newValues[keyToAdjustFinally] + adjustment, 0, 100);
        }
        return newValues;
    })(allocations, changedKey, parsedNewValue);

    setAllocations(newCalculatedAllocations);

    if (!isCpuDelegated && !seasonEnded && !hasActiveSponsorshipOffer) {
        dispatch({
            type: GameActionType.UPDATE_BUDGET_ALLOCATION,
            payload: newCalculatedAllocations
        });
    }
  };

  const handleTicketPriceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPrice = e.target.value as TicketPriceLevel;
    setTicketPrice(newPrice);

    if (!isCpuDelegated && !seasonEnded && !hasActiveSponsorshipOffer) {
        dispatch({
            type: GameActionType.SET_TICKET_PRICE,
            payload: newPrice
        });
    }
  };

  const handleBoostMorale = () => {
    dispatch({ type: GameActionType.BOOST_MORALE });
  };

  const canBoostMorale = userMorale !== TeamMorale.VERY_HIGH && userFinancials.budget >= MORALE_BOOST_COST;
  let boostMoraleDisabledReason = "";
  if (userMorale === TeamMorale.VERY_HIGH) boostMoraleDisabledReason = "팀 사기가 이미 최고치입니다.";
  else if (userFinancials.budget < MORALE_BOOST_COST) boostMoraleDisabledReason = "예산이 부족합니다.";

  const battingTrainingPointEffect = Math.max(-MAX_TRAINING_STAT_EFFECT, Math.min(MAX_TRAINING_STAT_EFFECT, Math.floor((allocations.trainingBatting - DEFAULT_TRAINING_BATTING_ALLOCATION) / TRAINING_STAT_POINT_DIVISOR)));
  const pitchingTrainingPointEffect = Math.max(-MAX_TRAINING_STAT_EFFECT, Math.min(MAX_TRAINING_STAT_EFFECT, Math.floor((allocations.trainingPitching - DEFAULT_TRAINING_PITCHING_ALLOCATION) / TRAINING_STAT_POINT_DIVISOR)));
  const defenseTrainingPointEffect = Math.max(-MAX_TRAINING_STAT_EFFECT, Math.min(MAX_TRAINING_STAT_EFFECT, Math.floor((allocations.trainingDefense - DEFAULT_TRAINING_DEFENSE_ALLOCATION) / TRAINING_STAT_POINT_DIVISOR)));

  const incomeEffectPercent = Math.max(-MAX_MARKETING_INCOME_EFFECT_PERCENT, Math.min(MAX_MARKETING_INCOME_EFFECT_PERCENT, Math.floor((allocations.marketing - DEFAULT_BUDGET_ALLOCATION.marketing) / MARKETING_ALLOCATION_INCOME_DIVISOR)));

  let facilityMoraleEffectDesc = "사기 보통 영향";
  if (allocations.facilities >= FACILITY_HIGH_ALLOCATION_THRESHOLD) facilityMoraleEffectDesc = "사기 긍정적 영향↑";
  else if (allocations.facilities <= FACILITY_LOW_ALLOCATION_THRESHOLD) facilityMoraleEffectDesc = "사기 부정적 영향↓";

  let scoutingEffectDesc = "스카우팅 보통";
  if (allocations.scouting >= SCOUTING_HIGH_ALLOCATION_THRESHOLD) scoutingEffectDesc = "유망주 발굴 확률↑";

  let medicalEffectDesc = "선수 컨디션/사기 보통";
  if (allocations.medical >= MEDICAL_HIGH_ALLOCATION_THRESHOLD) {
    medicalEffectDesc = `사기 회복력↑ (승리 시 사기↑, 패배 시 사기↓ 완화 확률 ${MEDICAL_MORALE_RESILIENCE_EFFECT_CHANCE*100}%)`;
  } else {
    medicalEffectDesc = "선수 컨디션/사기 보통";
  }


  const ticketPriceInfo = TICKET_PRICE_LEVELS[ticketPrice];
  const ticketEffectDesc = `수입 x${ticketPriceInfo.incomeModifier.toFixed(2)}, 만족도 ${ticketPriceInfo.happinessImpact > 0 ? '+' : ''}${ticketPriceInfo.happinessImpact}점`;

  const commonDisabledProps = {
    disabled: seasonEnded || hasActiveSponsorshipOffer || isCpuDelegated,
    title: isCpuDelegated ? "CPU 위임 중에는 수동 조작 불가"
           : (seasonEnded ? "시즌이 종료되어 사용할 수 없습니다."
           : (hasActiveSponsorshipOffer ? "스폰서십 제안에 먼저 응답해주세요." : undefined))
  };
  const actionButtonCommonDisabledProps = {
    disabled: seasonEnded || hasActiveSponsorshipOffer || isCpuDelegated,
    title: isCpuDelegated ? "CPU 위임 중에는 수동 조작 불가"
           : (seasonEnded ? "시즌이 종료되어 사용할 수 없습니다."
           : (hasActiveSponsorshipOffer ? "스폰서십 제안에 먼저 응답해주세요." : undefined))
  };


  const allocationItems: {id: keyof BudgetAllocation, name: string, effect: string, defaultRate: number}[] = [
    { id: 'trainingBatting', name: "타격 훈련", effect: `타격 ${battingTrainingPointEffect >= 0 ? '+' : ''}${battingTrainingPointEffect}`, defaultRate: DEFAULT_TRAINING_BATTING_ALLOCATION },
    { id: 'trainingPitching', name: "투구 훈련", effect: `투구 ${pitchingTrainingPointEffect >= 0 ? '+' : ''}${pitchingTrainingPointEffect}`, defaultRate: DEFAULT_TRAINING_PITCHING_ALLOCATION },
    { id: 'trainingDefense', name: "수비 훈련", effect: `수비 ${defenseTrainingPointEffect >= 0 ? '+' : ''}${defenseTrainingPointEffect}`, defaultRate: DEFAULT_TRAINING_DEFENSE_ALLOCATION },
    { id: 'marketing', name: "마케팅", effect: `수입 ${incomeEffectPercent >= 0 ? '+' : ''}${incomeEffectPercent}%`, defaultRate: DEFAULT_BUDGET_ALLOCATION.marketing },
    { id: 'facilities', name: "시설 투자", effect: facilityMoraleEffectDesc, defaultRate: DEFAULT_BUDGET_ALLOCATION.facilities },
    { id: 'scouting', name: "선수 스카우팅", effect: scoutingEffectDesc, defaultRate: DEFAULT_BUDGET_ALLOCATION.scouting },
    { id: 'medical', name: "의료 지원", effect: medicalEffectDesc, defaultRate: DEFAULT_BUDGET_ALLOCATION.medical },
  ];

  return (
    <Card title="구단 관리">
      <div className="space-y-6">
        <section>
          <h3 className="text-lg font-semibold text-text-main mb-2">주간 운영 예산 배분</h3>
          <p className="text-sm text-text-secondary mb-4">
            주간 운영 예산을 각 항목에 배분하여 구단 운영 방향을 설정합니다. (항상 총합 100%)
            <br/>변경 사항은 즉시 저장되어 다음 주부터 효과가 적용됩니다. CPU 위임 중에는 변경할 수 없습니다.
          </p>
          <div className="space-y-4">
            {allocationItems.map(item => (
              <div key={item.id} className="space-y-1">
                <div className="flex justify-between items-center">
                    <label htmlFor={`alloc-${item.id}`} className="block text-sm font-medium text-text-main">
                    {item.name} ({allocations[item.id]}%) <span className="text-xs text-gray-400">(기본: {item.defaultRate}%)</span>
                    </label>
                    <span className="text-xs text-text-secondary truncate" title={item.effect}>({item.effect})</span>
                </div>
                <input
                  type="range"
                  id={`alloc-${item.id}`}
                  name={item.id}
                  value={allocations[item.id]}
                  onChange={(e) => handleSliderChange(item.id, e.target.value)}
                  className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  min="0"
                  max="100"
                  step="1"
                  {...commonDisabledProps}
                  aria-label={`${item.name} 예산 배분율 ${allocations[item.id]}%`}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-accent pt-6">
          <h3 className="text-lg font-semibold text-text-main mb-3">티켓 가격 설정</h3>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
                <label htmlFor="ticket-price" className="block text-sm font-medium text-text-main">
                티켓 가격 수준
                </label>
                <span className="text-xs text-text-secondary truncate" title={ticketEffectDesc}>({ticketEffectDesc})</span>
            </div>
            <select
              id="ticket-price"
              value={ticketPrice}
              onChange={handleTicketPriceChange}
              className="w-full p-2 bg-accent border border-gray-600 rounded-md text-text-main focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              {...actionButtonCommonDisabledProps}
              aria-label="티켓 가격 수준 설정"
            >
              {Object.entries(TICKET_PRICE_LEVELS).map(([key, value]) => (
                <option key={key} value={key}>{value.description}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="border-t border-accent pt-6">
          <h3 className="text-lg font-semibold text-text-main mb-2">팀 활동</h3>
           <div className="space-y-2">
            <p className="text-sm text-text-secondary">팀의 사기를 진작시켜 경기력을 즉시 향상시킬 수 있습니다.</p>
            <Button
                onClick={handleBoostMorale}
                variant="secondary"
                disabled={!canBoostMorale || actionButtonCommonDisabledProps.disabled}
                aria-disabled={!canBoostMorale || actionButtonCommonDisabledProps.disabled}
                aria-label={`팀 사기 진작, 비용 ${formatCurrencyMillions(MORALE_BOOST_COST)}`}
                title={!canBoostMorale ? boostMoraleDisabledReason : actionButtonCommonDisabledProps.title || `팀 사기 진작 (비용: ${formatCurrencyMillions(MORALE_BOOST_COST)})`}
            >
                팀 사기 진작 (비용: {formatCurrencyMillions(MORALE_BOOST_COST)})
            </Button>
            {(!canBoostMorale && !actionButtonCommonDisabledProps.disabled) && <p className="text-sm text-red-400 mt-1">{boostMoraleDisabledReason}</p>}
          </div>
        </section>
      </div>
    </Card>
  );
};

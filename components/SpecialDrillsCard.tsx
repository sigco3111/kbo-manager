
import React from 'react';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { SpecialDrillTemplate, ActiveSpecialDrill, GameActionType } from '../types';

interface SpecialDrillsCardProps {
  availableDrills: SpecialDrillTemplate[];
  activeDrill: ActiveSpecialDrill | null;
  dispatch: React.Dispatch<any>;
  userBudget: number;
  hasActiveSponsorshipOffer: boolean;
  isCpuDelegated: boolean; 
}

const formatCurrencyMillions = (amount: number) => `${(amount / 1000000).toLocaleString()}M KRW`;

export const SpecialDrillsCard: React.FC<SpecialDrillsCardProps> = ({ 
    availableDrills, activeDrill, dispatch, userBudget, hasActiveSponsorshipOffer, isCpuDelegated
}) => {
  
  const handleSelectDrill = (drillId: string) => {
    dispatch({ type: GameActionType.SELECT_SPECIAL_DRILL, payload: drillId });
  };

  const handleSkipDrills = () => {
    dispatch({ type: GameActionType.SKIP_SPECIAL_DRILLS });
  };

  if (!activeDrill && availableDrills.length === 0) {
    return null; 
  }

  const commonButtonDisabled = hasActiveSponsorshipOffer || isCpuDelegated;
  let commonButtonTitle = "";
  if (isCpuDelegated) commonButtonTitle = "CPU 위임 중에는 수동 조작 불가";
  else if (hasActiveSponsorshipOffer) commonButtonTitle = "스폰서십 제안에 먼저 응답해주세요.";


  return (
    <Card title={activeDrill ? "진행 중인 특별 훈련" : "금주의 특별 훈련 제안"} className="border-2 border-purple-500">
      {activeDrill ? (
        <div>
          <h3 className="text-xl font-semibold text-purple-300">{activeDrill.koreanName}</h3>
          <p className="text-text-secondary my-1">{activeDrill.koreanDescription}</p>
          <p className="text-sm text-gray-400">
            효과: {activeDrill.statBoosted === 'all' ? '모든 주 능력치' : activeDrill.statBoosted === 'batting' ? '타격' : activeDrill.statBoosted === 'pitching' ? '투구' : '수비'} +{activeDrill.boostAmount}
          </p>
          <p className="text-lg text-white font-bold mt-2">남은 기간: {activeDrill.remainingWeeks} 주</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-text-secondary">다음 주 경기력 향상을 위해 특별 훈련을 선택할 수 있습니다. 하나를 선택하면 즉시 비용이 차감되고 훈련이 시작됩니다. 원치 않으시면 건너뛸 수 있습니다.</p>
          {availableDrills.map(drill => {
            const canAfford = userBudget >= drill.cost;
            const buttonDisabled = !canAfford || commonButtonDisabled;
            let buttonTitle = `선택 (비용: ${formatCurrencyMillions(drill.cost)})`;
            if (commonButtonDisabled) buttonTitle = commonButtonTitle;
            else if (!canAfford) buttonTitle = `예산 부족 (필요: ${formatCurrencyMillions(drill.cost)})`;

            return (
              <div key={drill.id} className="p-3 bg-secondary rounded-md shadow-md">
                <h4 className="text-lg font-semibold text-purple-400">{drill.koreanName}</h4>
                <p className="text-sm text-text-secondary my-1">{drill.koreanDescription}</p>
                <p className="text-xs text-gray-400">
                  효과: {drill.statBoosted === 'all' ? '모든 주 능력치' : drill.statBoosted === 'batting' ? '타격' : drill.statBoosted === 'pitching' ? '투구' : '수비'} +{drill.boostAmount} ({drill.durationWeeks}주 지속)
                </p>
                <p className="text-sm text-gray-300">비용: {formatCurrencyMillions(drill.cost)}</p>
                <Button 
                  onClick={() => handleSelectDrill(drill.id)} 
                  variant="primary" 
                  size="sm" 
                  className="mt-2"
                  disabled={buttonDisabled}
                  title={buttonTitle}
                  aria-label={`특별 훈련 선택: ${drill.koreanName}, 비용 ${formatCurrencyMillions(drill.cost)}`}
                >
                  {isCpuDelegated ? "CPU 위임 중" : (hasActiveSponsorshipOffer ? "제안 응답 필요" : (canAfford ? "선택" : "예산 부족"))}
                </Button>
              </div>
            );
          })}
          <div className="mt-4 pt-4 border-t border-accent">
            <Button
                onClick={handleSkipDrills}
                variant="secondary"
                size="md"
                disabled={commonButtonDisabled}
                title={commonButtonDisabled ? commonButtonTitle : "이번 주 특별 훈련을 실시하지 않고 다음 주로 넘어갑니다."}
                aria-label="이번 주 특별 훈련 건너뛰기"
            >
                이번 주 훈련 건너뛰기
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

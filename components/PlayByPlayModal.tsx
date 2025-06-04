
import React, { useRef, useEffect, useState } from 'react';
import { Button } from './common/Button';
import { Card } from './common/Card';
import { Team, GameAction, GameActionType } from '../types';

interface PlayByPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllLogsDisplayed?: () => void; // New prop
  log: string[] | null;
  teams: Team[];
  userTeamId: string | null;
  currentWeek: number; 
  isCpuDelegated: boolean; 
  dispatch: React.Dispatch<GameAction>; 
}

export const PlayByPlayModal: React.FC<PlayByPlayModalProps> = ({ 
    isOpen, 
    onClose, 
    onAllLogsDisplayed, // Destructure new prop
    log: fullLog, 
    teams, 
    userTeamId, 
    currentWeek,
    isCpuDelegated, 
    dispatch 
}) => {
  const logEndRef = useRef<null | HTMLDivElement>(null);
  const [displayedLog, setDisplayedLog] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<number | null>(null); 

  useEffect(() => {
    if (isOpen && fullLog) {
      setDisplayedLog([]);
      setCurrentIndex(0);
    } else {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    }
  }, [isOpen, fullLog]);

  useEffect(() => {
    if (isOpen && fullLog && currentIndex < fullLog.length) {
      timerRef.current = window.setTimeout(() => {
        setDisplayedLog(prevLog => [...prevLog, fullLog[currentIndex]]);
        setCurrentIndex(prevIndex => prevIndex + 1);
      }, 1000); 
    } else if (isOpen && fullLog && currentIndex >= fullLog.length) {
      // All logs are now displayed
      onAllLogsDisplayed?.(); // Call the callback
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isOpen, fullLog, currentIndex, onAllLogsDisplayed]); // Added onAllLogsDisplayed


  useEffect(() => {
    if (isOpen) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayedLog, isOpen]); 

  if (!isOpen || !fullLog || !userTeamId) return null;

  const userTeam = teams.find(t => t.id === userTeamId);
  const gameWeek = currentWeek -1; 

  const handleClose = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    onClose();
  };

  const handleCancelDelegation = () => {
    dispatch({ type: GameActionType.TOGGLE_CPU_DELEGATION });
  };
  
  const allLogsDisplayed = fullLog ? currentIndex >= fullLog.length : true;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-85 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out" role="dialog" aria-modal="true" aria-labelledby="playbyplay-title">
      <Card className="w-full max-w-xl bg-primary" title={`${userTeam?.koreanName || '우리 팀'} - ${gameWeek}주차 경기 중계`}>
        <div id="playbyplay-title" className="sr-only">{userTeam?.koreanName} {gameWeek}주차 경기 중계 로그</div>
        <div className="h-[60vh] overflow-y-auto p-3 bg-secondary rounded-md shadow-inner space-y-1 text-sm mb-4">
          {displayedLog.map((entry, index) => {
            let textColor = 'text-text-secondary';
            if (entry.includes('득점!') || entry.includes('홈런!!!')) {
              textColor = 'text-green-400';
            } else if (entry.includes('아웃')) {
              textColor = 'text-red-400';
            } else if (entry.startsWith('---')) {
                textColor = 'text-indigo-400 font-semibold';
            }

            return (
              <p key={index} className={`${textColor} leading-relaxed`}>
                {entry}
              </p>
            );
          })}
          {!allLogsDisplayed && (
            <p className="text-indigo-300 animate-pulse">중계 진행 중...</p>
          )}
          <div ref={logEndRef} />
        </div>
        <div className="mt-6 text-center space-x-2">
          <Button onClick={handleClose} variant="primary" aria-label="경기 중계 확인">
            {allLogsDisplayed ? "확인" : "중계 건너뛰기"}
          </Button>
          {isCpuDelegated && (
            <Button 
                onClick={handleCancelDelegation} 
                variant="secondary" 
                aria-label="CPU 위임 해제"
            >
                위임 해제
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

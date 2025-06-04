
import React from 'react';
import { Game } from '../types';
import { Button } from './common/Button';
import { Card } from './common/Card';

interface GameResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  gamesPlayedThisWeek: { game: Game; homeTeamName: string, awayTeamName: string }[] | null;
  currentWeek: number;
}

export const GameResultModal: React.FC<GameResultModalProps> = ({ isOpen, onClose, gamesPlayedThisWeek, currentWeek }) => {
  if (!isOpen || !gamesPlayedThisWeek) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
      <Card className="w-full max-w-lg bg-primary" title={`Week ${currentWeek-1} 경기 결과`}>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {gamesPlayedThisWeek.map(({ game, homeTeamName, awayTeamName }) => (
            <div key={game.id} className="p-3 bg-secondary rounded-md shadow">
              <p className="text-sm text-center text-text-secondary mb-1">
                {game.week}주차 경기
              </p>
              <div className="flex justify-between items-center">
                <span className={`font-semibold ${game.homeScore! > game.awayScore! ? 'text-green-400' : (game.homeScore! < game.awayScore! ? 'text-red-400' : 'text-yellow-400')}`}>
                  {homeTeamName}
                </span>
                <span className="text-xl font-bold mx-2">
                  {game.homeScore} : {game.awayScore}
                </span>
                <span className={`font-semibold ${game.awayScore! > game.homeScore! ? 'text-green-400' : (game.awayScore! < game.homeScore! ? 'text-red-400' : 'text-yellow-400')}`}>
                  {awayTeamName}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Button onClick={onClose} variant="primary">
            확인
          </Button>
        </div>
      </Card>
    </div>
  );
};
    
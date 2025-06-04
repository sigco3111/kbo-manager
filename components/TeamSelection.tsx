
import React from 'react';
import { Team } from '../types';
import { Card } from './common/Card';
import { Button } from './common/Button';

interface TeamSelectionProps {
  teams: Team[];
  onSelectTeam: (teamId: string) => void;
}

export const TeamSelection: React.FC<TeamSelectionProps> = ({ teams, onSelectTeam }) => {
  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-4xl"> {/* Increased max-width for more stat details */}
        <h1 className="text-3xl font-bold text-center text-indigo-400 mb-8">KBO 리그 매니저</h1>
        <p className="text-center text-text-secondary mb-8">관리할 KBO 팀을 선택하세요.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => onSelectTeam(team.id)}
              className={`p-4 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 ${team.logoColor} ${team.textColor} flex flex-col justify-between`}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 ${team.logoColor} rounded-full flex items-center justify-center mb-3 border-2 border-current`}>
                  <span className="text-2xl font-bold">{team.name.substring(0,1)}</span>
                </div>
                <h2 className="text-lg font-semibold">{team.name}</h2>
                <p className="text-sm opacity-90">{team.koreanName}</p>
              </div>
              <div className="mt-3 text-xs opacity-80 text-left space-y-0.5">
                <p>타격: {team.batting}</p>
                <p>투구: {team.pitching}</p>
                <p>수비: {team.defense}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>
      <footer className="mt-8 text-center text-text-secondary text-sm">
        <p>&copy; 2024 KBO League Manager. All rights reserved (not really).</p>
      </footer>
    </div>
  );
};
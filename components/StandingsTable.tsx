
import React from 'react';
import { StandingsEntry, Team } from '../types';
import { Card }from './common/Card';

interface StandingsTableProps {
  standings: StandingsEntry[];
  teams: Team[];
  userTeamId?: string | null;
}

export const StandingsTable: React.FC<StandingsTableProps> = ({ standings, teams, userTeamId }) => {
  const getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.koreanName || teamId;

  return (
    <Card title="KBO 리그 순위">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm text-left text-text-secondary">
          <thead className="text-xs text-text-main uppercase bg-accent">
            <tr>
              <th scope="col" className="px-4 py-3">#</th>
              <th scope="col" className="px-4 py-3">팀</th>
              <th scope="col" className="px-4 py-3 text-center">경기수</th>
              <th scope="col" className="px-4 py-3 text-center">승</th>
              <th scope="col" className="px-4 py-3 text-center">패</th>
              <th scope="col" className="px-4 py-3 text-center">무</th>
              <th scope="col" className="px-4 py-3 text-center">승률</th>
              <th scope="col" className="px-4 py-3 text-center">승점</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((entry, index) => (
              <tr 
                key={entry.teamId} 
                className={`border-b border-accent hover:bg-gray-700 ${entry.teamId === userTeamId ? 'bg-indigo-900 font-semibold text-white' : 'bg-secondary'}`}
              >
                <td className="px-4 py-3">{index + 1}</td>
                <th scope="row" className="px-4 py-3 font-medium whitespace-nowrap">
                  {getTeamName(entry.teamId)}
                </th>
                <td className="px-4 py-3 text-center">{entry.gamesPlayed}</td>
                <td className="px-4 py-3 text-center">{entry.wins}</td>
                <td className="px-4 py-3 text-center">{entry.losses}</td>
                <td className="px-4 py-3 text-center">{entry.draws}</td>
                <td className="px-4 py-3 text-center">{entry.winPercentage.toFixed(3)}</td>
                <td className="px-4 py-3 text-center">{entry.points.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
    
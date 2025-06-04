
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { StandingsEntry, ChartDataItem } from '../types';
import { Card } from './common/Card';

interface PerformanceChartProps {
  standingsHistory: StandingsEntry[][]; // Array of standings per week
  userTeamId: string;
  currentWeek: number;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ standingsHistory, userTeamId, currentWeek }) => {
  const performanceData: ChartDataItem[] = [];

  if (standingsHistory && userTeamId) {
    for(let i = 0; i < currentWeek -1 ; i++) { // Iterate up to games played
        const weeklyStandings = standingsHistory[i];
        if (weeklyStandings) {
            const teamStanding = weeklyStandings.find(s => s.teamId === userTeamId);
            if (teamStanding) {
                performanceData.push({
                name: `W${i + 1}`,
                Wins: teamStanding.wins,
                Losses: teamStanding.losses,
                Draws: teamStanding.draws,
                });
            }
        }
    }
  }
  
  return (
    <Card title="팀 성적 변화">
      {performanceData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={performanceData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
            <XAxis dataKey="name" stroke="#a0aec0"/>
            <YAxis allowDecimals={false} stroke="#a0aec0"/>
            <Tooltip 
              contentStyle={{ backgroundColor: '#2d3748', border: 'none', borderRadius: '0.5rem' }}
              labelStyle={{ color: '#e2e8f0' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Legend />
            <Bar dataKey="Wins" stackId="a" fill="#48bb78" name="승" />
            <Bar dataKey="Losses" stackId="a" fill="#f56565" name="패" />
            <Bar dataKey="Draws" stackId="a" fill="#a0aec0" name="무" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-text-secondary text-center py-10">시즌 시작 후 팀 성적 데이터가 표시됩니다.</p>
      )}
    </Card>
  );
};
    

import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { EffectiveStatsDataPoint, ChartDataItem } from '../types'; // Assuming ChartDataItem can be adapted or a new one made
import { Card } from './common/Card';

interface EffectiveStatsChartProps {
  statsHistory: EffectiveStatsDataPoint[];
}

export const EffectiveStatsChart: React.FC<EffectiveStatsChartProps> = ({ statsHistory }) => {
  
  const chartData: ChartDataItem[] = statsHistory.map(entry => ({
    name: `W${entry.week}`, // Week number for X-axis
    타격: entry.batting,
    투구: entry.pitching,
    수비: entry.defense,
  }));

  return (
    <Card title="팀 적용 능력치 변화">
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
            <XAxis dataKey="name" stroke="#a0aec0"/>
            <YAxis stroke="#a0aec0" domain={['auto', 'auto']} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#2d3748', border: 'none', borderRadius: '0.5rem' }}
              labelStyle={{ color: '#e2e8f0' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Legend />
            <Line type="monotone" dataKey="타격" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="투구" stroke="#82ca9d" strokeWidth={2} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="수비" stroke="#ffc658" strokeWidth={2} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-text-secondary text-center py-10">시즌 시작 후 능력치 변화 데이터가 표시됩니다.</p>
      )}
    </Card>
  );
};
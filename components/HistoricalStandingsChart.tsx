
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Label } from 'recharts';
import { HistoricalSeasonRecord } from '../types';
import { Card } from './common/Card';

interface HistoricalStandingsChartProps {
  history: HistoricalSeasonRecord[];
}

export const HistoricalStandingsChart: React.FC<HistoricalStandingsChartProps> = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <Card title="역대 시즌 성적">
        <p className="text-text-secondary text-center py-10">아직 완료된 시즌이 없습니다.</p>
      </Card>
    );
  }

  const chartData = history.map(record => ({
    name: `${record.year} (S${record.seasonNumber})`,
    Rank: record.rank,
    teamName: record.teamKoreanName, 
    score: `${record.wins}승 ${record.losses}패 ${record.draws}무`
  }));

  return (
    <Card title="역대 시즌 성적">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
          <XAxis dataKey="name" stroke="#a0aec0" tick={{ fontSize: 12 }}>
             <Label value="시즌" offset={-15} position="insideBottom" fill="#a0aec0"/>
          </XAxis>
          <YAxis 
            stroke="#a0aec0" 
            reversed={true} 
            domain={[1, (dataMax: number) => Math.max(10, dataMax)]} // Ensure Y-axis shows at least up to 10th rank or actual max
            tickFormatter={(value) => `${value}위`}
            allowDecimals={false}
          >
             <Label value="순위" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} fill="#a0aec0"/>
          </YAxis>
          <Tooltip
            contentStyle={{ backgroundColor: '#2d3748', border: 'none', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
            itemStyle={{ color: '#e2e8f0' }}
            formatter={(value: number, name: string, props: any) => [`${value}위 (${props.payload.teamName}, ${props.payload.score})`, "최종 순위"]}
          />
          <Legend verticalAlign="top" wrapperStyle={{paddingBottom: "10px"}}/>
          <Line type="monotone" dataKey="Rank" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 6 }} name="시즌별 최종 순위" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

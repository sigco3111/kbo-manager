
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { FinancialData, ChartDataItem } from '../types';
import { Card } from './common/Card';

interface FinancialChartProps {
  financialData: FinancialData;
}

const formatCurrency = (value: number) => `${(value / 1000000).toFixed(0)}M KRW`;

export const FinancialChart: React.FC<FinancialChartProps> = ({ financialData }) => {
  const budgetData: ChartDataItem[] = financialData.incomeHistory.map((item, index) => {
    // This is a simplification: assumes expenses and incomes are paired per week
    // For a true historical budget, we'd need to sum up to that week.
    // Let's make data for income and expenses per week instead
    const income = item.amount;
    const expense = financialData.expenseHistory[index]?.amount || 0;
    return {
      name: `W${item.week}`,
      Income: income,
      Expenses: expense,
    };
  });
  
  // If no data, show placeholder for weekly income/expenses if season hasn't started
  if (financialData.incomeHistory.length === 0 && financialData.expenseHistory.length === 0) {
     // budgetData remains empty, specific message handled in JSX
  }
  
  // Initialize currentBudgetData with the starting budget
  const currentBudgetData: ChartDataItem[] = [{ name: "Start", Budget: financialData.budget }];
  
  // Calculate budget evolution week by week
  let cumulativeBudget = financialData.budget; // Start with the initial budget passed (which is current final budget)
  
  // To reconstruct historical budget, we need to work backwards or store budget snapshots.
  // For this chart, let's calculate budget week by week from an initial point.
  // Assuming INITIAL_BUDGET from constants is the true starting point.
  // Let's reconstruct:
  const reconstructedBudgetData: ChartDataItem[] = [];
  let runningBudget = financialData.budget; // This is the *final* budget. We need to reconstruct.

  // If we want to show the trend from the *actual* initial budget:
  // The passed `financialData.budget` is the *current* budget after all transactions.
  // So `currentBudgetData` should reflect the progression to this current budget.

  // Let's make `currentBudgetData` show budget at the END of each week.
  // The `financialData.budget` is the LATEST budget.
  // IncomeHistory and ExpenseHistory are arrays.
  // We assume they are ordered by week.
  
  // Corrected logic for currentBudgetData:
  const historicalBudgets: ChartDataItem[] = [];
  let tempBudget = financialData.budget; // This is the final budget.

  // To show progression, we need to iterate through history.
  // The current financialData.budget is the *end* budget.
  // The chart should show how it got there.
  // Let's use the income/expense history to build the budget progression.

  // Start with initial budget (before any transactions)
  const actualInitialBudget = financialData.budget - 
                             financialData.incomeHistory.reduce((sum, item) => sum + item.amount, 0) +
                             financialData.expenseHistory.reduce((sum, item) => sum + item.amount, 0);

  historicalBudgets.push({ name: 'Start', Budget: actualInitialBudget });
  
  let evolvingBudget = actualInitialBudget;
  const allWeeks = new Set([...financialData.incomeHistory.map(i => i.week), ...financialData.expenseHistory.map(e => e.week)]);
  const sortedWeeks = Array.from(allWeeks).sort((a,b) => a-b);

  sortedWeeks.forEach(week => {
    const weeklyIncome = financialData.incomeHistory.filter(i => i.week === week).reduce((sum, i) => sum + i.amount, 0);
    const weeklyExpenses = financialData.expenseHistory.filter(e => e.week === week).reduce((sum, e) => sum + e.amount, 0);
    evolvingBudget += weeklyIncome;
    evolvingBudget -= weeklyExpenses;
    historicalBudgets.push({ name: `W${week}`, Budget: evolvingBudget });
  });
  
  // If no history, just show current budget
  if (historicalBudgets.length === 1 && financialData.incomeHistory.length === 0 && financialData.expenseHistory.length === 0) {
    // This means only 'Start' with initial budget, which is same as current.
    // No change to display, handled by JSX check.
  }


  return (
    <Card title="팀 재정 현황">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text-main">현재 예산: {formatCurrency(financialData.budget)}</h3>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-md font-semibold text-text-secondary mb-2">주간 수입 및 지출</h4>
           {budgetData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                <XAxis dataKey="name" stroke="#a0aec0" />
                <YAxis tickFormatter={formatCurrency} stroke="#a0aec0" domain={[0, 'auto']}/>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#2d3748', border: 'none', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="Income" fill="#48bb78" name="수입" />
                <Bar dataKey="Expenses" fill="#f56565" name="지출" />
              </BarChart>
            </ResponsiveContainer>
           ) : (
            <p className="text-text-secondary text-center py-10">시즌 시작 후 재정 데이터가 표시됩니다.</p>
           )}
        </div>
        <div>
          <h4 className="text-md font-semibold text-text-secondary mb-2">예산 변화 추이</h4>
          {historicalBudgets.length > 1 ? ( // Show chart if there's more than just the starting point
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historicalBudgets} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
              <XAxis dataKey="name" stroke="#a0aec0"/>
              <YAxis tickFormatter={formatCurrency} stroke="#a0aec0" domain={['auto', 'auto']}/>
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#2d3748', border: 'none', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#e2e8f0' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              <Line type="monotone" dataKey="Budget" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 6 }} name="예산"/>
            </LineChart>
          </ResponsiveContainer>
          ) : (
             <p className="text-text-secondary text-center py-10">시즌 시작 후 예산 변화가 표시됩니다.</p>
          )}
        </div>
      </div>
    </Card>
  );
};

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { MetricsSection } from './dashboard/MetricsSection';
import { ChartsSection } from './dashboard/ChartsSection';
import { DataTable } from './dashboard/DataTable';
import { TaskBoard } from './dashboard/TaskBoard';
import { GanttChart } from './dashboard/GanttChart';

interface FinancialData {
  bank_transactions: any[];
  matches: any[];
  monthly_stats: any[];
}

async function fetchFinancialData(supabase: any) {
  const { data: bank_transactions, error: bankError } = await supabase
    .from('bank_transactions')
    .select('*');
  if (bankError) throw bankError;

  const { data: matches, error: matchesError } = await supabase
    .rpc('get_match_details');
  if (matchesError) throw matchesError;

  // חישוב סטטיסטיקות חודשיות
  const monthly_stats = calculateMonthlyStats(bank_transactions, matches);

  return { bank_transactions, matches, monthly_stats };
}

export function Dashboard() {
  const { supabase } = useAuth();
  const { data, isLoading, error } = useQuery<FinancialData>(
    ['financialData'],
    () => fetchFinancialData(supabase)
  );

  if (isLoading) return <div>טוען...</div>;
  if (error) return <div>שגיאה: {(error as Error).message}</div>;
  if (!data) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">דשבורד פיננסי</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <MetricsSection data={data} />
        <ChartsSection data={data} />
      </div>

      <div className="mb-8">
        <TaskBoard />
      </div>

      <div className="mb-8">
        <GanttChart />
      </div>

      <div>
        <DataTable data={data} />
      </div>
    </div>
  );
}

function calculateMonthlyStats(bank_transactions: any[], matches: any[]) {
  // הלוגיקה הקיימת מהקוד הקודם
  return [];
} 
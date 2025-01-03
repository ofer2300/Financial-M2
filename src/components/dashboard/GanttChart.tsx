import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface Task {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  progress: number;
  dependencies: string[];
}

export function GanttChart() {
  const { supabase } = useAuth();

  const { data: tasks = [], isLoading } = useQuery<Task[]>(
    ['tasks'],
    async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  );

  const formatData = (tasks: Task[]) => {
    return tasks.map(task => ({
      name: task.title,
      start: new Date(task.start_date).getTime(),
      duration: new Date(task.end_date).getTime() - new Date(task.start_date).getTime(),
      progress: task.progress
    }));
  };

  if (isLoading) return <div>טוען תרשים גאנט...</div>;

  const data = formatData(tasks);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">תרשים גאנט</h2>
      
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            barSize={20}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis
              type="category"
              dataKey="name"
            />
            <Tooltip
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value: any) => [
                `משך: ${Math.round(value / (1000 * 60 * 60 * 24))} ימים`,
                'זמן'
              ]}
            />
            <Bar
              dataKey="duration"
              fill="#3b82f6"
              background={{ fill: '#eee' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 
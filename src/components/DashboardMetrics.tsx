import React from 'react';
import { MetricCard } from './MetricCard';
import { CalendarIcon, ClockIcon, ChartBarIcon } from '@heroicons/react/24/solid';
import { useDataLoader } from '@/lib/errorHandling';

interface DashboardData {
  todayMeetings: number;
  avgDuration: number;
  completionRate: number;
}

export function DashboardMetrics() {
  const { data, error, loading } = useDataLoader<DashboardData>(async () => {
    const response = await fetch('/api/dashboard/metrics');
    if (!response.ok) {
      throw new Error('נכשלה טעינת נתוני לוח המחוונים');
    }
    return response.json();
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900 rounded-lg">
        <p className="text-red-700 dark:text-red-300">{error.message}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard
        title="פגישות היום"
        value={data.todayMeetings}
        trend={15}
        icon={<CalendarIcon className="w-6 h-6" />}
      />
      <MetricCard
        title="זמן ממוצע"
        value={data.avgDuration}
        unit="דקות"
        trend={-5}
        icon={<ClockIcon className="w-6 h-6" />}
      />
      <MetricCard
        title="אחוז השלמה"
        value={data.completionRate}
        unit="%"
        trend={3}
        icon={<ChartBarIcon className="w-6 h-6" />}
      />
    </div>
  );
} 
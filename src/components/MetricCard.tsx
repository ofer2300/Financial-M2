import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface MetricCardProps {
  title: string;
  value: number;
  unit?: string;
  trend?: number;
  icon?: React.ReactNode;
}

export function MetricCard({ title, value, unit = '', trend = 0, icon }: MetricCardProps) {
  const trendColor = trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-gray-500';
  const TrendIcon = trend > 0 ? ArrowUpIcon : ArrowDownIcon;

  return (
    <div className="metric-card" role="region" aria-label={title}>
      <div className="flex items-center justify-between mb-2">
        <span className="metric-label text-gray-600 dark:text-gray-400">{title}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      
      <div className="flex items-baseline">
        <span className="metric-value text-gray-900 dark:text-gray-100">
          {value.toLocaleString('he-IL')}
          {unit && <span className="text-sm mr-1">{unit}</span>}
        </span>
        
        {trend !== 0 && (
          <div className={`flex items-center mr-2 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      
      <div className="metric-description mt-2">
        {trend > 0 ? 'עלייה' : trend < 0 ? 'ירידה' : 'ללא שינוי'} מהתקופה הקודמת
      </div>
    </div>
  );
} 
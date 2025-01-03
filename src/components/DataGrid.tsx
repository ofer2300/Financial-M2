import React, { useState } from 'react';
import { useDataLoader } from '@/lib/errorHandling';

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  participants: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface DataGridProps {
  pageSize?: number;
}

export function DataGrid({ pageSize = 25 }: DataGridProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const { data, error, loading } = useDataLoader<Meeting[]>(async () => {
    const response = await fetch(`/api/meetings?page=${currentPage}&pageSize=${pageSize}`);
    if (!response.ok) {
      throw new Error('נכשלה טעינת נתוני הפגישות');
    }
    return response.json();
  });

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-900 rounded mb-2"></div>
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

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        לא נמצאו פגישות
      </div>
    );
  }

  const statusColors = {
    scheduled: 'text-blue-600 dark:text-blue-400',
    completed: 'text-green-600 dark:text-green-400',
    cancelled: 'text-red-600 dark:text-red-400'
  };

  const statusLabels = {
    scheduled: 'מתוכננת',
    completed: 'הושלמה',
    cancelled: 'בוטלה'
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              כותרת
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              תאריך
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              שעה
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              משך (דקות)
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              משתתפים
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              סטטוס
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
          {data.map((meeting) => (
            <tr key={meeting.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {meeting.title}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {new Date(meeting.date).toLocaleDateString('he-IL')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {meeting.time}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {meeting.duration}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {meeting.participants.join(', ')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`${statusColors[meeting.status]} font-medium`}>
                  {statusLabels[meeting.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          הקודם
        </button>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          עמוד {currentPage}
        </span>
        <button
          onClick={() => setCurrentPage(prev => prev + 1)}
          disabled={data.length < pageSize}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          הבא
        </button>
      </div>
    </div>
  );
} 
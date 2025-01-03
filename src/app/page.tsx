import React from 'react';
import { useDataLoader, withErrorHandling, LoadingFallback } from '@/lib/errorHandling';

function HomePage() {
  const { data, error, loading } = useDataLoader(async () => {
    // טעינת נתונים ראשונית
    const response = await fetch('/api/initial-data');
    if (!response.ok) {
      throw new Error('נכשלה טעינת הנתונים הראשונית');
    }
    return response.json();
  }, {
    dataLoading: {
      skeleton: true,
      timeout: 5000,
      retry: 3
    }
  });

  if (loading) {
    return <LoadingFallback />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900 rounded-lg">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
          שגיאה בטעינת הנתונים
        </h2>
        <p className="mt-2 text-red-700 dark:text-red-300">
          {error.message}
        </p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">מערכת תיאום פגישות</h1>
      {/* תוכן הדף */}
    </main>
  );
}

export default withErrorHandling(HomePage); 
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { Dashboard } from './components/Dashboard';
import { Loader } from './components/ui/Loader';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Suspense fallback={<Loader />}>
          <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <Dashboard />
          </div>
        </Suspense>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App; 
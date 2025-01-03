import React, { useState, useEffect } from 'react';

export interface ErrorHandlingConfig {
  dataLoading: {
    skeleton: boolean;
    timeout: number;
    retry: number;
  };
  errorStates: {
    visualFeedback: boolean;
    gracefulDegradation: boolean;
    fallbackUI: boolean;
  };
}

export const defaultConfig: ErrorHandlingConfig = {
  dataLoading: {
    skeleton: true,
    timeout: 5000,
    retry: 3
  },
  errorStates: {
    visualFeedback: true,
    gracefulDegradation: true,
    fallbackUI: true
  }
};

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public severity: 'low' | 'medium' | 'high' = 'medium',
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function useDataLoader<T>(
  loadFn: () => Promise<T>,
  config: Partial<ErrorHandlingConfig> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const mergedConfig = { ...defaultConfig, ...config };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new AppError('בקשת הנתונים נכשלה עקב תפוגת זמן', 'TIMEOUT'));
        }, mergedConfig.dataLoading.timeout);
      });

      const dataPromise = loadFn();
      const result = await Promise.race([dataPromise, timeoutPromise]);
      setData(result as T);
      
    } catch (err) {
      const appError = err instanceof AppError ? err : new AppError(
        'אירעה שגיאה בטעינת הנתונים',
        'LOAD_ERROR'
      );
      
      if (retryCount < mergedConfig.dataLoading.retry) {
        setRetryCount(prev => prev + 1);
        setTimeout(load, 1000 * (retryCount + 1)); // ניסיון חוזר עם השהייה גדלה
      } else {
        setError(appError);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { data, error, loading, retry: load };
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      setError(error.error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="error-boundary p-4 bg-red-50 dark:bg-red-900 rounded-lg">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
          אירעה שגיאה בלתי צפויה
        </h2>
        <p className="mt-2 text-red-700 dark:text-red-300">
          {error?.message || 'נא לרענן את הדף ולנסות שוב'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          רענן דף
        </button>
      </div>
    );
  }

  return children;
}

export function LoadingFallback() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
    </div>
  );
}

interface ErrorFallbackProps {
  error: AppError;
  resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="p-4 bg-red-50 dark:bg-red-900 rounded-lg">
      <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
        {error.severity === 'high' ? 'שגיאה קריטית' : 'שגיאה'}
      </h2>
      <p className="mt-2 text-red-700 dark:text-red-300">{error.message}</p>
      {error.recoverable && (
        <button
          onClick={resetError}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          נסה שוב
        </button>
      )}
    </div>
  );
}

export function withErrorHandling<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  config: Partial<ErrorHandlingConfig> = {}
): React.FC<P> {
  return function WithErrorHandling(props: P) {
    return (
      <ErrorBoundary>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
} 
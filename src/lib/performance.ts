import React, { useEffect } from 'react';
import type { ComponentType } from 'react';

export const performanceConfig = {
  metrics: {
    FCP: 1500, // 1.5s
    LCP: 2500, // 2.5s
    TTI: 3500, // 3.5s
  },
  optimization: {
    bundleSize: 307200, // 300KB
    imageOptimization: true,
    codeMinification: true,
  },
  caching: {
    strategy: 'stale-while-revalidate',
    duration: 3600, // 1h
  },
};

export function usePerformanceMonitoring() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // מדידת FCP
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            console.log(`FCP: ${entry.startTime}ms`);
            if (entry.startTime > performanceConfig.metrics.FCP) {
              console.warn('FCP exceeds target threshold');
            }
          }
        }
      });
      observer.observe({ entryTypes: ['paint'] });

      // מדידת LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log(`LCP: ${lastEntry.startTime}ms`);
        if (lastEntry.startTime > performanceConfig.metrics.LCP) {
          console.warn('LCP exceeds target threshold');
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // מדידת TTI
      const ttiObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log(`TTI: ${entry.startTime}ms`);
          if (entry.startTime > performanceConfig.metrics.TTI) {
            console.warn('TTI exceeds target threshold');
          }
        }
      });
      ttiObserver.observe({ entryTypes: ['time-to-interactive'] });

      return () => {
        observer.disconnect();
        lcpObserver.disconnect();
        ttiObserver.disconnect();
      };
    }
  }, []);
}

export function measureComponentPerformance(componentName: string) {
  return function HOC<P extends object>(WrappedComponent: ComponentType<P>): ComponentType<P> {
    const PerformanceWrapper: React.FC<P> = (props) => {
      useEffect(() => {
        const startTime = performance.now();
        
        return () => {
          const endTime = performance.now();
          const renderTime = endTime - startTime;
          console.log(`${componentName} render time: ${renderTime}ms`);
        };
      }, []);

      return <WrappedComponent {...props} />;
    };

    PerformanceWrapper.displayName = `withPerformance(${componentName})`;
    return PerformanceWrapper;
  };
} 
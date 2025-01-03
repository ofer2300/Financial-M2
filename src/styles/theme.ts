export const dataVizTheme = {
  colors: {
    primary: ['#2E3440', '#3B4252', '#434C5E', '#4C566A'],
    accent: ['#88C0D0', '#81A1C1', '#5E81AC'],
    alerts: ['#BF616A', '#D08770', '#EBCB8B']
  },
  typography: {
    primary: 'Inter',
    monospace: 'JetBrains Mono',
    sizes: {
      data: '14px',
      labels: '12px',
      headers: '16px'
    }
  },
  chartRules: {
    maxDataPoints: 100,
    aspectRatio: '16:9',
    gridlines: 'minimal',
    tooltips: 'interactive'
  },
  interactions: {
    clickDepth: {
      maxToData: 2,
      maxToAction: 3
    },
    responsiveness: {
      touchTarget: '44px',
      hoverStates: true,
      feedback: 'immediate'
    },
    animations: {
      duration: '200ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      types: ['fade', 'slide', 'scale']
    }
  }
} as const;

export const chartDefaults = {
  margin: { top: 5, right: 20, bottom: 5, left: 20 },
  animationDuration: 300,
  style: {
    fontFamily: dataVizTheme.typography.primary,
    fontSize: dataVizTheme.typography.sizes.data,
  },
  grid: {
    horizontal: true,
    vertical: false,
    strokeDasharray: '3 3',
    stroke: dataVizTheme.colors.primary[1],
    opacity: 0.1,
  },
  tooltip: {
    contentStyle: {
      background: 'rgba(255, 255, 255, 0.95)',
      border: 'none',
      borderRadius: '4px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      fontFamily: dataVizTheme.typography.primary,
      fontSize: dataVizTheme.typography.sizes.labels,
    }
  }
}; 
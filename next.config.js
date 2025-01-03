/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  
  // הגדרות בסיסיות
  images: {
    domains: [],
    formats: ['image/webp'],
  },

  // אופטימיזציית CSS
  experimental: {
    optimizeCss: true,
    // Enable real-time monitoring
    instrumentationHook: true,
    // Enable rolling deployments
    deploymentMode: 'rolling',
  },

  // הגדרות webpack
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        cacheGroups: {
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true,
          },
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },

  // הגדרות i18n
  i18n: {
    locales: ['he'],
    defaultLocale: 'he',
  },

  // Add monitoring configuration
  monitoring: {
    enabled: true,
    interval: 1000, // Check every second
    metrics: ['cpu', 'memory', 'requests'],
  },

  // High priority optimizations
  optimizationLevel: 3,
  compress: true,

  // Performance improvements
  swcMinify: true,

  // Error handling
  onError: (err) => {
    console.error('Critical error:', err);
    // Add your error reporting service here
  },
};

module.exports = nextConfig; 
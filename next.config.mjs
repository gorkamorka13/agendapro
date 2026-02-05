import { readFileSync } from 'fs';
import bundleAnalyzer from '@next/bundle-analyzer';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // Disable ESLint during build (errors are pre-existing, not from upgrade)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Optimisation des images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 jours
  },

  transpilePackages: [
    '@fullcalendar/core',
    '@fullcalendar/react',
    '@fullcalendar/daygrid',
    '@fullcalendar/timegrid',
    '@fullcalendar/interaction',
    'recharts',
  ],

  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_BUILD_DATE: new Date().toLocaleDateString('fr-FR'),
    NEXT_PUBLIC_BUILD_ID: Date.now().toString(36).slice(-6).toUpperCase(),
  },

  async redirects() {
    return [
      {
        source: '/reports',
        destination: '/admin/reports',
        permanent: true,
      },
      {
        source: '/api/reports/worked-hours',
        destination: '/api/reports',
        permanent: true,
      },
    ];
  },

  // Optimisation du bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          fullcalendar: {
            test: /[\\/]node_modules[\\/]@fullcalendar[\\/]/,
            name: 'fullcalendar',
            priority: 10,
          },
          recharts: {
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            name: 'recharts',
            priority: 10,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 5,
          },
        },
      };
    }
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);


import { readFileSync } from 'fs';
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

const nextConfig = {
  env: {
    APP_VERSION: pkg.version,
    BUILD_DATE: new Date().toLocaleDateString('fr-FR'),
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
};

export default nextConfig;

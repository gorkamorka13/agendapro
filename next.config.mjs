const nextConfig = {
  env: {
    APP_VERSION: '0.1.0',
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

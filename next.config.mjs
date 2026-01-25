const nextConfig = {
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

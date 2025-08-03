import type { NextConfig } from 'next';

// Bundle analyzer configuration
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */

  // 本番環境でテストAPIルートを除外
  ...(process.env.NODE_ENV === 'production' && {
    webpack: (config: any) => {
      config.externals = config.externals || [];
      // テストデータクリーンアップAPIを本番ビルドから除外
      config.resolve.alias = {
        ...config.resolve.alias,
        '/pages/api/posts/cleanup-test-data': false,
      };
      return config;
    },
  }),
};

export default nextConfig;

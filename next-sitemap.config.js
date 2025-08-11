/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.APP_URL || 'https://yourdomain.com',
  generateRobotsTxt: true,
  sitemapSize: 5000,

  // 除外するパス
  exclude: [
    '/api/*',
    '/auth/*',
    '/admin/*',
    '/profile/change-credentials',
    '/posts/*/edit',
    '/server-sitemap-index.xml',
  ],

  // robots.txt設定
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/admin/',
          '/profile/change-credentials',
          '/posts/*/edit',
          '/_next/',
          '/static/',
        ],
      },
    ],
    additionalSitemaps: [
      `${process.env.APP_URL || 'https://yourdomain.com'}/server-sitemap-index.xml`,
    ],
  },

  // 変更頻度設定
  changefreq: 'daily',
  priority: 0.7,

  // 追加設定
  autoLastmod: true,

  transform: async (config, path) => {
    // パス別の設定
    const customPaths = {
      '/': {
        priority: 1.0,
        changefreq: 'daily',
      },
      '/board': {
        priority: 0.9,
        changefreq: 'hourly',
      },
      '/auth/signin': {
        priority: 0.8,
        changefreq: 'monthly',
      },
      '/auth/register': {
        priority: 0.8,
        changefreq: 'monthly',
      },
    };

    return {
      loc: path,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      changefreq: customPaths[path]?.changefreq || config.changefreq,
      priority: customPaths[path]?.priority || config.priority,
      alternateRefs: config.alternateRefs ?? [],
    };
  },
};

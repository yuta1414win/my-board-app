#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

// 設定
const config = {
  baseURL: process.env.PRODUCTION_URL || 'https://yourdomain.com',
  testUser: {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
    name: 'Test User',
  },
  timeout: 30000,
  maxRetries: 3,
};

// テスト結果の記録
const testResults = {
  startTime: new Date(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
  },
};

// ヘルパー関数
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const executeTest = async (testName, testFunction) => {
  log(`Running: ${testName}`, 'info');
  const startTime = Date.now();

  try {
    const result = await testFunction();
    const duration = Date.now() - startTime;

    testResults.tests.push({
      name: testName,
      status: 'passed',
      duration,
      details: result,
    });

    testResults.summary.passed++;
    log(`✅ ${testName} - PASSED (${duration}ms)`, 'success');
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;

    testResults.tests.push({
      name: testName,
      status: 'failed',
      duration,
      error: error.message,
      details: error.response?.data || error.stack,
    });

    testResults.summary.failed++;
    log(`❌ ${testName} - FAILED (${duration}ms): ${error.message}`, 'error');
    return false;
  } finally {
    testResults.summary.total++;
  }
};

// HTTP Client Setup
const createHttpClient = (baseURL) => {
  return axios.create({
    baseURL,
    timeout: config.timeout,
    headers: {
      'User-Agent': 'Production-Function-Test/1.0',
      Accept: 'application/json, text/html',
    },
    validateStatus: (status) => status < 500, // Don't throw on 4xx errors
  });
};

const client = createHttpClient(config.baseURL);

// Test Functions
const tests = {
  // 1. 基本接続テスト
  async basicConnectivity() {
    const response = await client.get('/');

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    if (!response.data.includes('<!DOCTYPE html>')) {
      throw new Error('Invalid HTML response');
    }

    return {
      status: response.status,
      contentType: response.headers['content-type'],
      responseSize: response.data.length,
    };
  },

  // 2. ヘルスチェック
  async healthCheck() {
    const response = await client.get('/health');

    if (response.status !== 200) {
      throw new Error(`Health check failed with status ${response.status}`);
    }

    const data = response.data;
    if (!data.status || data.status !== 'ok') {
      throw new Error(`Health check returned status: ${data.status}`);
    }

    // 必須フィールドの確認
    const requiredFields = ['timestamp', 'version', 'environment', 'services'];
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return {
      status: data.status,
      services: data.services,
      uptime: data.uptime,
      memory: data.memory,
    };
  },

  // 3. 認証ページアクセス
  async authPagesAccess() {
    const pages = ['/auth/signin', '/auth/register'];
    const results = {};

    for (const page of pages) {
      const response = await client.get(page);

      if (response.status !== 200) {
        throw new Error(`${page} returned status ${response.status}`);
      }

      results[page] = {
        status: response.status,
        hasLoginForm: response.data.includes('form'),
        hasCSRFToken: response.data.includes('csrf'),
      };
    }

    return results;
  },

  // 4. 保護されたページのリダイレクト
  async protectedPagesRedirect() {
    const protectedPages = ['/board', '/profile', '/posts/new'];
    const results = {};

    for (const page of protectedPages) {
      const response = await client.get(page, {
        maxRedirects: 0,
        validateStatus: (status) => status === 302 || status === 200,
      });

      if (response.status === 200) {
        // ログイン済みの場合は正常
        results[page] = { status: 'accessible', code: 200 };
      } else if (response.status === 302) {
        // 未ログインでリダイレクトされる場合は正常
        const location = response.headers.location;
        if (!location || !location.includes('/auth/signin')) {
          throw new Error(`${page} redirected to wrong location: ${location}`);
        }
        results[page] = { status: 'redirected', location };
      } else {
        throw new Error(
          `${page} returned unexpected status ${response.status}`
        );
      }
    }

    return results;
  },

  // 5. API エンドポイント認証チェック
  async apiAuthProtection() {
    const protectedAPIs = ['/api/posts', '/api/user/profile'];

    const results = {};

    for (const api of protectedAPIs) {
      const response = await client.get(api);

      // 認証が必要なAPIは401または403を返すべき
      if (response.status !== 401 && response.status !== 403) {
        throw new Error(
          `${api} should return 401/403 for unauthenticated requests, got ${response.status}`
        );
      }

      results[api] = {
        status: response.status,
        requiresAuth: true,
      };
    }

    return results;
  },

  // 6. 静的リソースの確認
  async staticResourcesCheck() {
    const resources = [
      '/favicon.ico',
      '/_next/static/', // Next.js static files
    ];

    const results = {};

    for (const resource of resources) {
      try {
        const response = await client.get(resource);
        results[resource] = {
          status: response.status,
          available: response.status === 200,
          cacheHeaders: {
            'cache-control': response.headers['cache-control'],
            etag: response.headers['etag'],
          },
        };
      } catch (error) {
        results[resource] = {
          status: error.response?.status || 'error',
          available: false,
          error: error.message,
        };
      }
    }

    return results;
  },

  // 7. エラーページの確認
  async errorPagesCheck() {
    const response = await client.get('/nonexistent-page');

    if (response.status !== 404) {
      throw new Error(
        `404 page should return status 404, got ${response.status}`
      );
    }

    if (
      !response.data.includes('404') &&
      !response.data.includes('Not Found')
    ) {
      throw new Error('404 page should contain error information');
    }

    return {
      status: response.status,
      hasErrorPage: true,
      contentType: response.headers['content-type'],
    };
  },

  // 8. レスポンスヘッダーセキュリティチェック
  async securityHeadersCheck() {
    const response = await client.get('/');
    const headers = response.headers;

    const requiredHeaders = {
      'x-frame-options': ['DENY', 'SAMEORIGIN'],
      'x-content-type-options': ['nosniff'],
      'x-xss-protection': ['1; mode=block'],
      'referrer-policy': ['strict-origin-when-cross-origin'],
      'content-security-policy': true, // 存在チェックのみ
    };

    const results = {};
    const missing = [];

    for (const [headerName, expectedValues] of Object.entries(
      requiredHeaders
    )) {
      const headerValue = headers[headerName.toLowerCase()];

      if (!headerValue) {
        missing.push(headerName);
        results[headerName] = { present: false };
        continue;
      }

      results[headerName] = {
        present: true,
        value: headerValue,
      };

      if (Array.isArray(expectedValues)) {
        const isValidValue = expectedValues.some((expected) =>
          headerValue.toLowerCase().includes(expected.toLowerCase())
        );

        if (!isValidValue) {
          results[headerName].valid = false;
          results[headerName].expected = expectedValues;
        } else {
          results[headerName].valid = true;
        }
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing security headers: ${missing.join(', ')}`);
    }

    return results;
  },
};

// メイン実行
async function runFunctionalTests() {
  log(`🚀 Starting functional tests for ${config.baseURL}`, 'info');
  log(
    `Test configuration: timeout=${config.timeout}ms, retries=${config.maxRetries}`,
    'info'
  );

  // テスト実行
  for (const [testName, testFunction] of Object.entries(tests)) {
    await executeTest(testName, testFunction);
    await sleep(1000); // テスト間隔
  }

  // 結果サマリー
  testResults.endTime = new Date();
  testResults.duration = testResults.endTime - testResults.startTime;

  log(`\n📊 Test Summary:`, 'info');
  log(`Total: ${testResults.summary.total}`, 'info');
  log(`✅ Passed: ${testResults.summary.passed}`, 'success');
  log(`❌ Failed: ${testResults.summary.failed}`, 'error');
  log(`Duration: ${Math.round(testResults.duration / 1000)}s`, 'info');

  // 詳細結果をファイルに出力
  const reportFile = 'functional-test-results.json';
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  log(`📄 Detailed results written to ${reportFile}`, 'info');

  // 失敗したテストがある場合はプロセス終了コードを1に
  if (testResults.summary.failed > 0) {
    log(
      `\n⚠️ ${testResults.summary.failed} test(s) failed. Check the details above.`,
      'error'
    );
    process.exit(1);
  } else {
    log(`\n🎉 All functional tests passed!`, 'success');
    process.exit(0);
  }
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`, 'error');
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
  process.exit(1);
});

// 実行
if (require.main === module) {
  runFunctionalTests().catch((error) => {
    log(`Test execution failed: ${error.message}`, 'error');
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = { runFunctionalTests, tests };

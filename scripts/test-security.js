#!/usr/bin/env node

const axios = require('axios');
const https = require('https');
const tls = require('tls');
const fs = require('fs');

// 設定
const config = {
  baseURL: process.env.PRODUCTION_URL || 'https://yourdomain.com',
  timeout: 30000,
  userAgent: 'Security-Test-Scanner/1.0',
};

// テスト結果の記録
const testResults = {
  startTime: new Date(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
  },
};

// ヘルパー関数
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix =
    type === 'error'
      ? '❌'
      : type === 'success'
        ? '✅'
        : type === 'warning'
          ? '⚠️'
          : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
};

const executeTest = async (testName, testFunction) => {
  log(`Running: ${testName}`, 'info');
  const startTime = Date.now();

  try {
    const result = await testFunction();
    const duration = Date.now() - startTime;

    // 警告レベルのチェック
    const hasWarnings = result.warnings && result.warnings.length > 0;
    const status = hasWarnings ? 'warning' : 'passed';

    testResults.tests.push({
      name: testName,
      status,
      duration,
      details: result,
    });

    if (hasWarnings) {
      testResults.summary.warnings++;
      log(`⚠️ ${testName} - WARNING (${duration}ms)`, 'warning');
    } else {
      testResults.summary.passed++;
      log(`✅ ${testName} - PASSED (${duration}ms)`, 'success');
    }

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
const client = axios.create({
  timeout: config.timeout,
  headers: {
    'User-Agent': config.userAgent,
  },
  validateStatus: () => true, // すべてのステータスコードを許可
});

// Security Tests
const securityTests = {
  // 1. SSL証明書とTLS設定の検証
  async sslCertificateValidation() {
    const url = new URL(config.baseURL);
    const hostname = url.hostname;
    const port = url.port || 443;

    return new Promise((resolve, reject) => {
      const socket = tls.connect(
        port,
        hostname,
        {
          servername: hostname,
        },
        () => {
          const cert = socket.getPeerCertificate(true);
          const cipher = socket.getCipher();
          const protocol = socket.getProtocol();

          socket.end();

          const now = new Date();
          const validFrom = new Date(cert.valid_from);
          const validTo = new Date(cert.valid_to);

          const results = {
            certificate: {
              subject: cert.subject,
              issuer: cert.issuer.CN,
              validFrom: cert.valid_from,
              validTo: cert.valid_to,
              daysUntilExpiry: Math.ceil(
                (validTo - now) / (1000 * 60 * 60 * 24)
              ),
              serialNumber: cert.serialNumber,
              fingerprint: cert.fingerprint,
            },
            tls: {
              version: protocol,
              cipher: cipher.name,
              keyLength: cipher.version,
            },
            warnings: [],
          };

          // 証明書期限チェック
          if (results.certificate.daysUntilExpiry < 30) {
            results.warnings.push(
              `Certificate expires in ${results.certificate.daysUntilExpiry} days`
            );
          }

          // TLSバージョンチェック
          if (protocol < 'TLSv1.2') {
            results.warnings.push(`Outdated TLS version: ${protocol}`);
          }

          resolve(results);
        }
      );

      socket.on('error', (error) => {
        reject(new Error(`SSL connection failed: ${error.message}`));
      });

      socket.setTimeout(10000, () => {
        socket.destroy();
        reject(new Error('SSL connection timeout'));
      });
    });
  },

  // 2. セキュリティヘッダーの詳細検証
  async securityHeadersValidation() {
    const response = await client.get(config.baseURL);
    const headers = response.headers;

    const securityHeaders = {
      'strict-transport-security': {
        required: true,
        validate: (value) => {
          if (!value) return { valid: false, message: 'HSTS header missing' };
          if (!value.includes('max-age='))
            return { valid: false, message: 'max-age directive missing' };

          const maxAge = value.match(/max-age=(\d+)/);
          if (!maxAge || parseInt(maxAge[1]) < 31536000) {
            return {
              valid: false,
              message: 'max-age should be at least 1 year (31536000 seconds)',
            };
          }

          return { valid: true };
        },
      },
      'content-security-policy': {
        required: true,
        validate: (value) => {
          if (!value) return { valid: false, message: 'CSP header missing' };
          if (value.includes('unsafe-inline') && value.includes('script-src')) {
            return {
              valid: false,
              message: 'CSP allows unsafe-inline scripts',
            };
          }
          return { valid: true };
        },
      },
      'x-frame-options': {
        required: true,
        validate: (value) => {
          if (!value)
            return { valid: false, message: 'X-Frame-Options header missing' };
          const validValues = ['DENY', 'SAMEORIGIN'];
          if (!validValues.some((v) => value.toUpperCase().includes(v))) {
            return {
              valid: false,
              message: 'X-Frame-Options should be DENY or SAMEORIGIN',
            };
          }
          return { valid: true };
        },
      },
      'x-content-type-options': {
        required: true,
        validate: (value) => {
          if (!value || !value.includes('nosniff')) {
            return {
              valid: false,
              message: 'X-Content-Type-Options should be nosniff',
            };
          }
          return { valid: true };
        },
      },
      'referrer-policy': {
        required: true,
        validate: (value) => {
          if (!value)
            return { valid: false, message: 'Referrer-Policy header missing' };
          return { valid: true };
        },
      },
      'permissions-policy': {
        required: false,
        validate: (value) => {
          return { valid: true, message: 'Optional header' };
        },
      },
    };

    const results = {
      headers: {},
      score: 0,
      maxScore: 0,
      warnings: [],
    };

    for (const [headerName, config] of Object.entries(securityHeaders)) {
      const headerValue = headers[headerName.toLowerCase()];
      const validation = config.validate(headerValue);

      results.headers[headerName] = {
        present: !!headerValue,
        value: headerValue,
        required: config.required,
        valid: validation.valid,
        message: validation.message,
      };

      if (config.required) {
        results.maxScore++;
        if (validation.valid) {
          results.score++;
        } else {
          results.warnings.push(`${headerName}: ${validation.message}`);
        }
      }
    }

    results.percentage = Math.round((results.score / results.maxScore) * 100);

    if (results.percentage < 80) {
      throw new Error(`Security headers score too low: ${results.percentage}%`);
    }

    return results;
  },

  // 3. SQLインジェクション試行テスト
  async sqlInjectionTests() {
    const injectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' OR 1=1#",
      "admin'--",
      "' OR 1=1 /*",
    ];

    const testEndpoints = ['/api/posts', '/auth/signin', '/api/user/profile'];

    const results = {
      endpointsTested: testEndpoints.length,
      payloadsTested: injectionPayloads.length,
      vulnerableEndpoints: [],
      totalTests: 0,
      warnings: [],
    };

    for (const endpoint of testEndpoints) {
      for (const payload of injectionPayloads) {
        results.totalTests++;

        try {
          // GETパラメータでのテスト
          const getResponse = await client.get(endpoint, {
            params: { q: payload },
            timeout: 5000,
          });

          // POSTボディでのテスト
          const postResponse = await client.post(
            endpoint,
            {
              email: payload,
              password: 'test',
              content: payload,
            },
            {
              timeout: 5000,
              headers: { 'Content-Type': 'application/json' },
            }
          );

          // エラーメッセージでのSQLエラー検出
          const responses = [getResponse, postResponse];
          for (const response of responses) {
            const responseText = JSON.stringify(response.data).toLowerCase();
            const sqlErrorPatterns = [
              'sql syntax',
              'mysql_fetch',
              'ora-',
              'microsoft jet database',
              'odbc drivers error',
            ];

            for (const pattern of sqlErrorPatterns) {
              if (responseText.includes(pattern)) {
                results.vulnerableEndpoints.push({
                  endpoint,
                  payload,
                  pattern,
                  status: response.status,
                });
                break;
              }
            }
          }
        } catch (error) {
          // 接続エラーは無視（レート制限など）
          if (error.code !== 'ECONNRESET' && error.code !== 'ETIMEDOUT') {
            continue;
          }
        }

        // レート制限を避けるため少し待機
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    if (results.vulnerableEndpoints.length > 0) {
      throw new Error(
        `Potential SQL injection vulnerabilities found: ${results.vulnerableEndpoints.length}`
      );
    }

    return results;
  },

  // 4. XSS (クロスサイトスクリプティング) テスト
  async xssTests() {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      "';alert('XSS');//",
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
    ];

    const testEndpoints = ['/auth/signin', '/auth/register'];

    const results = {
      endpointsTested: testEndpoints.length,
      payloadsTested: xssPayloads.length,
      vulnerableEndpoints: [],
      totalTests: 0,
      warnings: [],
    };

    for (const endpoint of testEndpoints) {
      for (const payload of xssPayloads) {
        results.totalTests++;

        try {
          const response = await client.get(endpoint, {
            params: { error: payload },
            timeout: 5000,
          });

          // レスポンスにエスケープされていないペイロードが含まれているかチェック
          if (response.data && typeof response.data === 'string') {
            if (response.data.includes(payload)) {
              results.vulnerableEndpoints.push({
                endpoint,
                payload,
                status: response.status,
              });
            }
          }
        } catch (error) {
          // 接続エラーは無視
          continue;
        }

        // レート制限を避けるため少し待機
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    if (results.vulnerableEndpoints.length > 0) {
      results.warnings.push(
        `Potential XSS vulnerabilities found: ${results.vulnerableEndpoints.length}`
      );
    }

    return results;
  },

  // 5. レート制限テスト
  async rateLimitingTests() {
    const endpoints = [
      { path: '/api/auth/signin', method: 'POST', limit: 5 },
      { path: '/api/auth/register', method: 'POST', limit: 3 },
    ];

    const results = {
      endpoints: {},
      warnings: [],
    };

    for (const endpoint of endpoints) {
      const endpointResults = {
        path: endpoint.path,
        expectedLimit: endpoint.limit,
        actualLimit: null,
        rateLimited: false,
        responses: [],
      };

      // 制限回数の1.5倍リクエストを送信
      const testCount = Math.ceil(endpoint.limit * 1.5);

      for (let i = 0; i < testCount; i++) {
        try {
          const response = await client.request({
            method: endpoint.method,
            url: endpoint.path,
            data: {
              email: `test${i}@example.com`,
              password: 'testpassword',
            },
            timeout: 5000,
          });

          endpointResults.responses.push({
            attempt: i + 1,
            status: response.status,
            rateLimited: response.status === 429,
          });

          if (response.status === 429) {
            endpointResults.rateLimited = true;
            endpointResults.actualLimit = i;
            break;
          }
        } catch (error) {
          if (error.response?.status === 429) {
            endpointResults.rateLimited = true;
            endpointResults.actualLimit = i;
            break;
          }
        }

        // リクエスト間隔
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      results.endpoints[endpoint.path] = endpointResults;

      if (!endpointResults.rateLimited) {
        results.warnings.push(
          `${endpoint.path} does not appear to have rate limiting`
        );
      }
    }

    return results;
  },

  // 6. 情報漏洩テスト
  async informationDisclosureTests() {
    const sensitiveEndpoints = [
      '/.env',
      '/.env.local',
      '/.env.production',
      '/package.json',
      '/config.json',
      '/.git/config',
      '/admin',
      '/debug',
      '/phpinfo.php',
      '/server-status',
      '/.well-known/security.txt',
    ];

    const results = {
      endpointsTested: sensitiveEndpoints.length,
      exposedEndpoints: [],
      warnings: [],
    };

    for (const endpoint of sensitiveEndpoints) {
      try {
        const response = await client.get(endpoint, { timeout: 5000 });

        if (response.status === 200) {
          results.exposedEndpoints.push({
            endpoint,
            status: response.status,
            contentType: response.headers['content-type'],
            size: response.data.length,
          });
        }
      } catch (error) {
        // エラーは期待される動作
        continue;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (results.exposedEndpoints.length > 0) {
      results.warnings.push(
        `Potentially exposed sensitive endpoints: ${results.exposedEndpoints.length}`
      );
    }

    return results;
  },

  // 7. HTTPセキュリティ設定テスト
  async httpSecurityTests() {
    const results = {
      httpsRedirect: false,
      httpMethods: {},
      serverHeader: null,
      poweredBy: null,
      warnings: [],
    };

    // HTTPS リダイレクトテスト
    try {
      const httpUrl = config.baseURL.replace('https://', 'http://');
      const response = await client.get(httpUrl, {
        maxRedirects: 0,
        validateStatus: (status) =>
          status === 301 || status === 302 || status === 200,
      });

      if (response.status === 301 || response.status === 302) {
        const location = response.headers.location;
        if (location && location.startsWith('https://')) {
          results.httpsRedirect = true;
        }
      }
    } catch (error) {
      // HTTPアクセスができない場合は正常
      results.httpsRedirect = true;
    }

    // サーバーヘッダー確認
    const response = await client.get(config.baseURL);
    results.serverHeader = response.headers.server;
    results.poweredBy = response.headers['x-powered-by'];

    // 不要な情報の露出チェック
    if (results.serverHeader) {
      results.warnings.push(`Server header exposed: ${results.serverHeader}`);
    }

    if (results.poweredBy) {
      results.warnings.push(
        `X-Powered-By header exposed: ${results.poweredBy}`
      );
    }

    if (!results.httpsRedirect) {
      results.warnings.push('HTTP to HTTPS redirect not configured');
    }

    return results;
  },
};

// メイン実行関数
async function runSecurityTests() {
  log(`🔒 Starting security tests for ${config.baseURL}`, 'info');

  // 各テストを実行
  for (const [testName, testFunction] of Object.entries(securityTests)) {
    await executeTest(testName, testFunction);

    // テスト間の間隔
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // 結果サマリー
  testResults.endTime = new Date();
  testResults.duration = testResults.endTime - testResults.startTime;

  log(`\n🔒 Security Test Summary:`, 'info');
  log(`Total: ${testResults.summary.total}`, 'info');
  log(`✅ Passed: ${testResults.summary.passed}`, 'success');
  log(`⚠️ Warnings: ${testResults.summary.warnings}`, 'warning');
  log(`❌ Failed: ${testResults.summary.failed}`, 'error');
  log(`Duration: ${Math.round(testResults.duration / 1000)}s`, 'info');

  // 詳細結果をファイルに出力
  const reportFile = 'security-test-results.json';
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  log(`📄 Detailed results written to ${reportFile}`, 'info');

  // セキュリティスコア計算
  const securityScore = Math.round(
    ((testResults.summary.passed + testResults.summary.warnings * 0.5) /
      testResults.summary.total) *
      100
  );

  log(
    `\n🛡️ Security Score: ${securityScore}%`,
    securityScore >= 80 ? 'success' : 'warning'
  );

  if (testResults.summary.failed > 0) {
    log(
      `\n⚠️ Critical security issues found. Immediate attention required!`,
      'error'
    );
    process.exit(1);
  } else if (testResults.summary.warnings > 0) {
    log(`\n⚠️ Security warnings detected. Review recommended.`, 'warning');
    process.exit(0);
  } else {
    log(`\n🎉 All security tests passed!`, 'success');
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
  runSecurityTests().catch((error) => {
    log(`Security test execution failed: ${error.message}`, 'error');
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = { runSecurityTests, securityTests };

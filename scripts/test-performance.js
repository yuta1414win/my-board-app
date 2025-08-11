#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');
const { performance } = require('perf_hooks');

// 設定
const config = {
  baseURL: process.env.PRODUCTION_URL || 'https://yourdomain.com',
  timeout: 60000,
  userAgent: 'Performance-Test-Agent/1.0',
  lighthouse: {
    enabled: true,
    device: 'desktop', // desktop or mobile
    categories: ['performance', 'accessibility', 'best-practices', 'seo'],
  },
  loadTest: {
    concurrency: 10,
    duration: 60000, // 60秒
    rampUpTime: 10000, // 10秒
  },
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
  lighthouse: null,
  loadTest: null,
};

// パフォーマンス基準
const performanceThresholds = {
  responseTime: {
    homepage: 2000, // 2秒以下
    api: 500, // 500ms以下
    static: 200, // 200ms以下
  },
  lighthouse: {
    performance: 90,
    accessibility: 90,
    bestPractices: 80,
    seo: 80,
  },
  loadTest: {
    maxResponseTime: 3000,
    errorRate: 0.01, // 1%以下
    throughput: 50, // 50 req/sec
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
});

// Performance Tests
const performanceTests = {
  // 1. 基本レスポンス時間テスト
  async basicResponseTimeTest() {
    const endpoints = [
      {
        path: '/',
        name: 'Homepage',
        threshold: performanceThresholds.responseTime.homepage,
      },
      {
        path: '/health',
        name: 'Health Check',
        threshold: performanceThresholds.responseTime.api,
      },
      {
        path: '/auth/signin',
        name: 'Auth Page',
        threshold: performanceThresholds.responseTime.homepage,
      },
      {
        path: '/favicon.ico',
        name: 'Static Resource',
        threshold: performanceThresholds.responseTime.static,
      },
    ];

    const results = {
      endpoints: {},
      averageResponseTime: 0,
      warnings: [],
    };

    let totalResponseTime = 0;
    let validTests = 0;

    for (const endpoint of endpoints) {
      const measurements = [];

      // 各エンドポイントを5回測定
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();

        try {
          const response = await client.get(endpoint.path);
          const endTime = performance.now();
          const responseTime = endTime - startTime;

          measurements.push({
            responseTime,
            status: response.status,
            size: response.data.length || 0,
          });

          if (response.status === 200) {
            totalResponseTime += responseTime;
            validTests++;
          }
        } catch (error) {
          measurements.push({
            responseTime: null,
            status: error.response?.status || 'error',
            error: error.message,
          });
        }

        // 測定間隔
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // 統計計算
      const validMeasurements = measurements.filter(
        (m) => m.responseTime !== null
      );
      const responseTimes = validMeasurements.map((m) => m.responseTime);

      if (responseTimes.length > 0) {
        const avgResponseTime =
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const minResponseTime = Math.min(...responseTimes);
        const maxResponseTime = Math.max(...responseTimes);

        results.endpoints[endpoint.path] = {
          name: endpoint.name,
          average: Math.round(avgResponseTime),
          min: Math.round(minResponseTime),
          max: Math.round(maxResponseTime),
          threshold: endpoint.threshold,
          passed: avgResponseTime <= endpoint.threshold,
          measurements: validMeasurements.length,
        };

        if (avgResponseTime > endpoint.threshold) {
          results.warnings.push(
            `${endpoint.name} response time (${Math.round(avgResponseTime)}ms) exceeds threshold (${endpoint.threshold}ms)`
          );
        }
      } else {
        results.endpoints[endpoint.path] = {
          name: endpoint.name,
          error: 'All measurements failed',
          measurements: 0,
        };
        results.warnings.push(`${endpoint.name} - All measurements failed`);
      }
    }

    results.averageResponseTime =
      validTests > 0 ? Math.round(totalResponseTime / validTests) : 0;

    return results;
  },

  // 2. 同時接続テスト
  async concurrencyTest() {
    const concurrentRequests = [1, 5, 10, 20];
    const testEndpoint = '/health';

    const results = {
      endpoint: testEndpoint,
      concurrencyLevels: {},
      warnings: [],
    };

    for (const concurrency of concurrentRequests) {
      log(`Testing concurrency level: ${concurrency}`, 'info');

      const requests = [];
      const startTime = performance.now();

      // 同時リクエスト生成
      for (let i = 0; i < concurrency; i++) {
        requests.push(
          client
            .get(testEndpoint)
            .then((response) => ({
              status: response.status,
              responseTime: performance.now() - startTime,
              success: response.status === 200,
            }))
            .catch((error) => ({
              status: error.response?.status || 'error',
              responseTime: performance.now() - startTime,
              success: false,
              error: error.message,
            }))
        );
      }

      const responses = await Promise.all(requests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 統計計算
      const successfulRequests = responses.filter((r) => r.success).length;
      const errorRate = (concurrency - successfulRequests) / concurrency;
      const avgResponseTime =
        responses.reduce((sum, r) => sum + r.responseTime, 0) /
        responses.length;
      const throughput = (successfulRequests / totalTime) * 1000; // requests per second

      results.concurrencyLevels[concurrency] = {
        totalRequests: concurrency,
        successfulRequests,
        errorRate: Math.round(errorRate * 100 * 100) / 100, // percentage with 2 decimal places
        averageResponseTime: Math.round(avgResponseTime),
        throughput: Math.round(throughput * 100) / 100,
        totalTime: Math.round(totalTime),
      };

      // 警告チェック
      if (errorRate > 0.05) {
        // 5%以上のエラー率
        results.warnings.push(
          `High error rate at concurrency ${concurrency}: ${Math.round(errorRate * 100)}%`
        );
      }

      if (avgResponseTime > performanceThresholds.responseTime.api * 2) {
        results.warnings.push(
          `Slow response time at concurrency ${concurrency}: ${Math.round(avgResponseTime)}ms`
        );
      }

      // 次のテスト前に少し待機
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return results;
  },

  // 3. メモリリークテスト
  async memoryLeakTest() {
    const testEndpoint = '/health';
    const iterations = 100;
    const measurements = [];

    const results = {
      iterations,
      memoryGrowth: null,
      memoryStable: true,
      warnings: [],
    };

    log(`Testing for memory leaks with ${iterations} iterations`, 'info');

    // 初期メモリ測定
    let initialMemory = null;

    for (let i = 0; i < iterations; i++) {
      try {
        const response = await client.get(testEndpoint);

        // 10回ごとにメモリ使用量をチェック（模擬）
        if (i % 10 === 0) {
          const memoryUsage = process.memoryUsage();
          measurements.push({
            iteration: i,
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            rss: memoryUsage.rss,
            timestamp: Date.now(),
          });

          if (initialMemory === null) {
            initialMemory = memoryUsage;
          }
        }

        if (response.status !== 200) {
          results.warnings.push(
            `Non-200 response at iteration ${i}: ${response.status}`
          );
        }
      } catch (error) {
        results.warnings.push(
          `Request failed at iteration ${i}: ${error.message}`
        );
      }

      // 短い間隔でリクエスト
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // メモリ成長率計算
    if (measurements.length >= 2) {
      const firstMeasurement = measurements[0];
      const lastMeasurement = measurements[measurements.length - 1];

      const heapGrowth = lastMeasurement.heapUsed - firstMeasurement.heapUsed;
      const heapGrowthPercent = (heapGrowth / firstMeasurement.heapUsed) * 100;

      results.memoryGrowth = {
        heapGrowthBytes: heapGrowth,
        heapGrowthPercent: Math.round(heapGrowthPercent * 100) / 100,
        measurements: measurements.length,
      };

      // 10%以上のメモリ増加は警告
      if (heapGrowthPercent > 10) {
        results.memoryStable = false;
        results.warnings.push(
          `Significant memory growth detected: ${Math.round(heapGrowthPercent)}%`
        );
      }
    } else {
      results.warnings.push('Insufficient measurements for memory analysis');
    }

    return results;
  },

  // 4. Lighthouse パフォーマンステスト
  async lighthouseTest() {
    if (!config.lighthouse.enabled) {
      return { skipped: true, reason: 'Lighthouse testing disabled' };
    }

    const results = {
      url: config.baseURL,
      device: config.lighthouse.device,
      scores: {},
      metrics: {},
      warnings: [],
    };

    return new Promise((resolve) => {
      const lighthouseCmd =
        `npx lighthouse ${config.baseURL} ` +
        `--only-categories=${config.lighthouse.categories.join(',')} ` +
        `--preset=${config.lighthouse.device} ` +
        `--output=json ` +
        `--output-path=./lighthouse-results.json ` +
        `--chrome-flags="--headless --no-sandbox" ` +
        `--max-wait-for-fcp=15000 ` +
        `--max-wait-for-load=35000`;

      log('Running Lighthouse audit...', 'info');

      exec(lighthouseCmd, (error, stdout, stderr) => {
        if (error) {
          results.error = error.message;
          results.warnings.push(
            `Lighthouse execution failed: ${error.message}`
          );
          resolve(results);
          return;
        }

        try {
          // Lighthouseの結果を読み取り
          if (fs.existsSync('./lighthouse-results.json')) {
            const lighthouseData = JSON.parse(
              fs.readFileSync('./lighthouse-results.json', 'utf8')
            );

            // スコアの抽出
            if (lighthouseData.categories) {
              for (const [category, data] of Object.entries(
                lighthouseData.categories
              )) {
                const score = Math.round(data.score * 100);
                results.scores[category] = score;

                const threshold = performanceThresholds.lighthouse[category];
                if (threshold && score < threshold) {
                  results.warnings.push(
                    `${category} score (${score}) below threshold (${threshold})`
                  );
                }
              }
            }

            // パフォーマンスメトリクスの抽出
            if (lighthouseData.audits) {
              const metrics = {
                'first-contentful-paint': 'firstContentfulPaint',
                'largest-contentful-paint': 'largestContentfulPaint',
                'cumulative-layout-shift': 'cumulativeLayoutShift',
                'total-blocking-time': 'totalBlockingTime',
                'speed-index': 'speedIndex',
              };

              for (const [auditId, metricName] of Object.entries(metrics)) {
                const audit = lighthouseData.audits[auditId];
                if (audit && audit.numericValue !== undefined) {
                  results.metrics[metricName] = Math.round(audit.numericValue);
                }
              }
            }

            // 結果ファイルをクリーンアップ
            fs.unlinkSync('./lighthouse-results.json');
          } else {
            results.warnings.push('Lighthouse results file not found');
          }
        } catch (parseError) {
          results.error = parseError.message;
          results.warnings.push(
            `Failed to parse Lighthouse results: ${parseError.message}`
          );
        }

        resolve(results);
      });
    });
  },

  // 5. リソース使用量テスト
  async resourceUsageTest() {
    const testDuration = 30000; // 30秒
    const testEndpoint = '/health';
    const measurements = [];
    let requestCount = 0;
    let errorCount = 0;

    const results = {
      duration: testDuration,
      requests: {
        total: 0,
        successful: 0,
        errors: 0,
        rate: 0,
      },
      response: {
        min: Infinity,
        max: 0,
        average: 0,
      },
      warnings: [],
    };

    log(
      `Running resource usage test for ${testDuration / 1000} seconds`,
      'info'
    );

    const startTime = Date.now();

    // 継続的にリクエストを送信
    const makeRequest = async () => {
      const requestStart = performance.now();

      try {
        const response = await client.get(testEndpoint, { timeout: 5000 });
        const requestEnd = performance.now();
        const responseTime = requestEnd - requestStart;

        measurements.push({
          responseTime,
          status: response.status,
          timestamp: Date.now(),
          success: response.status === 200,
        });

        requestCount++;

        if (response.status !== 200) {
          errorCount++;
        }
      } catch (error) {
        const requestEnd = performance.now();
        const responseTime = requestEnd - requestStart;

        measurements.push({
          responseTime,
          status: 'error',
          timestamp: Date.now(),
          success: false,
          error: error.message,
        });

        requestCount++;
        errorCount++;
      }
    };

    // 並行してリクエストを送信
    const interval = setInterval(makeRequest, 1000); // 1秒ごと

    // 指定時間待機
    await new Promise((resolve) => setTimeout(resolve, testDuration));
    clearInterval(interval);

    const endTime = Date.now();
    const actualDuration = endTime - startTime;

    // 結果計算
    const successfulRequests = measurements.filter((m) => m.success);
    const responseTimes = successfulRequests.map((m) => m.responseTime);

    results.requests = {
      total: requestCount,
      successful: successfulRequests.length,
      errors: errorCount,
      rate: Math.round((requestCount / actualDuration) * 1000 * 100) / 100, // requests per second
    };

    if (responseTimes.length > 0) {
      results.response = {
        min: Math.round(Math.min(...responseTimes)),
        max: Math.round(Math.max(...responseTimes)),
        average: Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        ),
      };
    }

    // 警告チェック
    const errorRate = errorCount / requestCount;
    if (errorRate > 0.05) {
      results.warnings.push(`High error rate: ${Math.round(errorRate * 100)}%`);
    }

    if (results.response.average > performanceThresholds.responseTime.api) {
      results.warnings.push(
        `Average response time (${results.response.average}ms) exceeds threshold`
      );
    }

    return results;
  },
};

// メイン実行関数
async function runPerformanceTests() {
  log(`⚡ Starting performance tests for ${config.baseURL}`, 'info');

  // 各テストを実行
  for (const [testName, testFunction] of Object.entries(performanceTests)) {
    await executeTest(testName, testFunction);

    // テスト間の間隔
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  // 結果サマリー
  testResults.endTime = new Date();
  testResults.duration = testResults.endTime - testResults.startTime;

  log(`\n⚡ Performance Test Summary:`, 'info');
  log(`Total: ${testResults.summary.total}`, 'info');
  log(`✅ Passed: ${testResults.summary.passed}`, 'success');
  log(`⚠️ Warnings: ${testResults.summary.warnings}`, 'warning');
  log(`❌ Failed: ${testResults.summary.failed}`, 'error');
  log(`Duration: ${Math.round(testResults.duration / 1000)}s`, 'info');

  // 詳細結果をファイルに出力
  const reportFile = 'performance-test-results.json';
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  log(`📄 Detailed results written to ${reportFile}`, 'info');

  // パフォーマンススコア計算
  const performanceScore = Math.round(
    ((testResults.summary.passed + testResults.summary.warnings * 0.7) /
      testResults.summary.total) *
      100
  );

  log(
    `\n🚀 Performance Score: ${performanceScore}%`,
    performanceScore >= 80 ? 'success' : 'warning'
  );

  if (testResults.summary.failed > 0) {
    log(`\n⚠️ Critical performance issues found!`, 'error');
    process.exit(1);
  } else if (testResults.summary.warnings > 0) {
    log(`\n⚠️ Performance warnings detected. Review recommended.`, 'warning');
    process.exit(0);
  } else {
    log(`\n🎉 All performance tests passed!`, 'success');
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
  runPerformanceTests().catch((error) => {
    log(`Performance test execution failed: ${error.message}`, 'error');
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = { runPerformanceTests, performanceTests };

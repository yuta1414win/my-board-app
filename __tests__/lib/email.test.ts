/**
 * メール送信機能のJestテスト
 */

import {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  verifyToken,
  testEmailConnection,
} from '../../lib/email';

// Nodemailerをモック化
jest.mock('nodemailer');
const nodemailer = require('nodemailer');

describe('メール送信機能テスト', () => {
  let mockTransporter: any;

  beforeEach(() => {
    // モック環境変数を設定
    process.env.EMAIL_SERVER_HOST = 'smtp.gmail.com';
    process.env.EMAIL_SERVER_PORT = '587';
    process.env.EMAIL_SERVER_USER = 'test@gmail.com';
    process.env.EMAIL_SERVER_PASSWORD = 'test-password';
    process.env.EMAIL_FROM = 'test@gmail.com';
    process.env.EMAIL_FROM_NAME = 'Test App';
    process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters';
    process.env.NEXTAUTH_URL = 'http://localhost:3001';

    // トランスポーターのモックを作成
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn(),
      close: jest.fn(),
    };

    // nodemailerのcreateTransportをモック化
    nodemailer.createTransport = jest.fn().mockReturnValue(mockTransporter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('成功時にメールが送信されること', async () => {
      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'テストメール',
        html: '<p>テスト内容</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: {
          name: 'Test App',
          address: 'test@gmail.com',
        },
        to: 'test@example.com',
        subject: 'テストメール',
        html: '<p>テスト内容</p>',
        text: 'テスト内容',
        attachments: undefined,
      });
    });

    it('接続失敗時にエラーが返されること', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('接続失敗'));

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'テストメール',
        html: '<p>テスト内容</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(mockTransporter.close).toHaveBeenCalled();
    });

    it('送信失敗時にエラーが返されること', async () => {
      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockRejectedValue(new Error('送信失敗'));

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'テストメール',
        html: '<p>テスト内容</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(mockTransporter.close).toHaveBeenCalled();
    });

    it('添付ファイル付きメールが送信されること', async () => {
      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      const attachments = [
        {
          filename: 'test.txt',
          content: 'テスト内容',
        },
      ];

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'テストメール',
        html: '<p>テスト内容</p>',
        attachments,
      });

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments,
        })
      );
    });
  });

  describe('トークン生成・検証', () => {
    it('メール確認トークンが正しく生成されること', () => {
      const token = generateEmailVerificationToken('test-user-id');

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('パスワードリセットトークンが正しく生成されること', () => {
      const token = generatePasswordResetToken('test-user-id');

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('有効なトークンが正しく検証されること', () => {
      const token = generateEmailVerificationToken('test-user-id');
      const decoded = verifyToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded.userId).toBe('test-user-id');
      expect(decoded.type).toBe('email-verification');
    });

    it('無効なトークンでnullが返されること', () => {
      const decoded = verifyToken('invalid-token');
      expect(decoded).toBeNull();
    });

    it('異なるタイプのトークンが区別されること', () => {
      const verificationToken = generateEmailVerificationToken('test-user-id');
      const resetToken = generatePasswordResetToken('test-user-id');

      const decodedVerification = verifyToken(verificationToken);
      const decodedReset = verifyToken(resetToken);

      expect(decodedVerification.type).toBe('email-verification');
      expect(decodedReset.type).toBe('password-reset');
    });
  });

  describe('メールテンプレート送信', () => {
    beforeEach(() => {
      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });
    });

    it('確認メールが正しく送信されること', async () => {
      const token = generateEmailVerificationToken('test-user-id');
      const result = await sendVerificationEmail('test@example.com', token);

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: '【My Board App】メールアドレスの確認',
        })
      );

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain('メールアドレスの確認');
      expect(sendMailCall.html).toContain(token);
    });

    it('パスワードリセットメールが正しく送信されること', async () => {
      const token = generatePasswordResetToken('test-user-id');
      const result = await sendPasswordResetEmail('test@example.com', token);

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: '【My Board App】パスワードリセットのお知らせ',
        })
      );

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain('パスワードリセット');
      expect(sendMailCall.html).toContain(token);
    });

    it('ウェルカムメールが正しく送信されること', async () => {
      const result = await sendWelcomeEmail(
        'test@example.com',
        'テストユーザー'
      );

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: '【My Board App】ようこそ！アカウント作成完了のお知らせ',
        })
      );

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain('ようこそ');
      expect(sendMailCall.html).toContain('テストユーザー');
      expect(sendMailCall.html).toContain('/board');
    });

    it('ウェルカムメールでユーザー名未指定時にデフォルト名が使用されること', async () => {
      const result = await sendWelcomeEmail('test@example.com');

      expect(result.success).toBe(true);

      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain('ユーザー様');
    });
  });

  describe('testEmailConnection', () => {
    it('接続テスト成功時にsuccessがtrueになること', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await testEmailConnection();

      expect(result.success).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(mockTransporter.close).toHaveBeenCalled();
    });

    it('接続テスト失敗時にsuccessがfalseになること', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('接続失敗'));

      const result = await testEmailConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(mockTransporter.close).toHaveBeenCalled();
    });
  });

  describe('環境変数テスト', () => {
    it('必要な環境変数が設定されていること', () => {
      expect(process.env.EMAIL_SERVER_HOST).toBeTruthy();
      expect(process.env.EMAIL_SERVER_USER).toBeTruthy();
      expect(process.env.EMAIL_SERVER_PASSWORD).toBeTruthy();
      expect(process.env.JWT_SECRET).toBeTruthy();
    });

    it('JWT_SECRETが十分な長さであること', () => {
      expect(process.env.JWT_SECRET!.length).toBeGreaterThanOrEqual(32);
    });
  });

  describe('エラーハンドリング', () => {
    it('メール送信時のネットワークエラーが適切に処理されること', async () => {
      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockRejectedValue(
        new Error('ECONNREFUSED: Connection refused')
      );

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'テストメール',
        html: '<p>テスト内容</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('ECONNREFUSED');
    });

    it('認証エラーが適切に処理されること', async () => {
      mockTransporter.verify.mockRejectedValue(
        new Error('Invalid login: 535 Authentication failed')
      );

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'テストメール',
        html: '<p>テスト内容</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Authentication failed');
    });

    it('無効なメールアドレス形式でもエラーが適切に処理されること', async () => {
      mockTransporter.verify.mockResolvedValue(true);
      mockTransporter.sendMail.mockRejectedValue(
        new Error('Invalid recipient')
      );

      const result = await sendEmail({
        to: 'invalid-email',
        subject: 'テストメール',
        html: '<p>テスト内容</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Invalid recipient');
    });
  });
});

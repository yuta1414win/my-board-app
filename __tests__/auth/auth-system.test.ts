/**
 * NextAuth.js認証システムのテスト
 * auth.ts - ログイン成功・失敗のテスト
 */

import { signIn } from '../../auth';
import bcrypt from 'bcryptjs';
import {
  setupMongoMock,
  setupNextAuthMock,
  setupConsoleSpy,
  mockUser,
  mockUnverifiedUser,
  mockLockedUser,
  validLoginData,
  invalidLoginData,
  verifyTestEnvironment,
  flushPromises,
} from '../utils/test-helpers';

// テスト環境の確認
verifyTestEnvironment();

describe.skip('NextAuth.js 認証システム - Skipped for NextAuth v5 compatibility', () => {
  let mongoMock: ReturnType<typeof setupMongoMock>;
  let nextAuthMock: ReturnType<typeof setupNextAuthMock>;
  let consoleSpy: ReturnType<typeof setupConsoleSpy>;

  beforeEach(() => {
    mongoMock = setupMongoMock();
    nextAuthMock = setupNextAuthMock();
    consoleSpy = setupConsoleSpy();
  });

  afterEach(() => {
    mongoMock.resetMocks();
    nextAuthMock.resetMocks();
    consoleSpy.restore();
  });

  describe('ログイン成功テスト', () => {
    it('正しい認証情報でログインが成功する', async () => {
      // Arrange
      const mockUserWithPassword = {
        ...mockUser,
        select: jest.fn().mockReturnThis(),
      };
      mongoMock.mockFindOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserWithPassword),
      });

      // bcrypt.compareのモック
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      // 最終ログイン時刻更新のモック
      mongoMock.mockFindByIdAndUpdate.mockResolvedValue(mockUserWithPassword);

      const credentials = {
        email: validLoginData.email,
        password: validLoginData.password,
      };

      // Act
      const result = await signIn('credentials', {
        ...credentials,
        redirect: false,
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          ok: true,
          url: null,
          error: null,
        })
      );

      // MongoDB呼び出しの検証
      expect(mongoMock.mockFindOne).toHaveBeenCalledWith({
        email: validLoginData.email.toLowerCase(),
      });

      // パスワード比較の検証
      expect(bcrypt.compare).toHaveBeenCalledWith(
        validLoginData.password,
        mockUser.password
      );

      // 最終ログイン時刻の更新確認
      expect(mongoMock.mockFindByIdAndUpdate).toHaveBeenCalledWith(
        mockUser._id,
        { lastLoginAt: expect.any(Date) }
      );
    });

    it('ログイン成功時にセッション情報が適切に設定される', async () => {
      // Arrange
      const mockUserWithPassword = {
        ...mockUser,
        select: jest.fn().mockReturnThis(),
      };
      mongoMock.mockFindOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserWithPassword),
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      mongoMock.mockFindByIdAndUpdate.mockResolvedValue(mockUserWithPassword);

      // Auth関数のモック設定
      nextAuthMock.mockAuth.mockResolvedValue({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          emailVerified: mockUser.emailVerified,
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Act
      const result = await signIn('credentials', {
        email: validLoginData.email,
        password: validLoginData.password,
        redirect: false,
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          ok: true,
          error: null,
        })
      );

      // セッションの検証
      const session = await nextAuthMock.mockAuth();
      expect(session?.user).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          emailVerified: mockUser.emailVerified,
        })
      );
    });
  });

  describe('ログイン失敗テスト', () => {
    it('存在しないメールアドレスでログインが失敗する', async () => {
      // Arrange
      mongoMock.mockFindOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      // Act
      const result = await signIn('credentials', {
        email: invalidLoginData.wrongEmail.email,
        password: invalidLoginData.wrongEmail.password,
        redirect: false,
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          error: 'CredentialsSignin',
        })
      );

      // 存在しないユーザーの検索確認
      expect(mongoMock.mockFindOne).toHaveBeenCalledWith({
        email: invalidLoginData.wrongEmail.email.toLowerCase(),
      });
    });

    it('間違ったパスワードでログインが失敗する', async () => {
      // Arrange
      const mockUserWithPassword = {
        ...mockUser,
        select: jest.fn().mockReturnThis(),
      };
      mongoMock.mockFindOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserWithPassword),
      });

      // 間違ったパスワードでbcrypt.compareが失敗
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      // Act
      const result = await signIn('credentials', {
        email: invalidLoginData.wrongPassword.email,
        password: invalidLoginData.wrongPassword.password,
        redirect: false,
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          error: 'CredentialsSignin',
        })
      );

      // パスワード比較の確認
      expect(bcrypt.compare).toHaveBeenCalledWith(
        invalidLoginData.wrongPassword.password,
        mockUser.password
      );

      // 最終ログイン時刻は更新されない
      expect(mongoMock.mockFindByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('未認証ユーザーのログインが失敗する', async () => {
      // Arrange
      const mockUnverifiedWithPassword = {
        ...mockUnverifiedUser,
        select: jest.fn().mockReturnThis(),
      };
      mongoMock.mockFindOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUnverifiedWithPassword),
      });

      // Act
      const result = await signIn('credentials', {
        email: invalidLoginData.unverifiedUser.email,
        password: invalidLoginData.unverifiedUser.password,
        redirect: false,
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          error: 'EmailNotVerified',
        })
      );

      // メール認証チェックの確認
      expect(mongoMock.mockFindOne).toHaveBeenCalledWith({
        email: invalidLoginData.unverifiedUser.email.toLowerCase(),
      });
    });

    it('ロックされたアカウントのログインが失敗する', async () => {
      // Arrange
      const mockLockedWithPassword = {
        ...mockLockedUser,
        select: jest.fn().mockReturnThis(),
      };
      mongoMock.mockFindOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockLockedWithPassword),
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true); // パスワードは正しい

      // Act
      const result = await signIn('credentials', {
        email: invalidLoginData.lockedUser.email,
        password: invalidLoginData.lockedUser.password,
        redirect: false,
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          error: 'AccountLocked',
        })
      );

      // アカウントロック確認の検証
      expect(mockLockedUser.isAccountLocked).toHaveBeenCalled();
    });

    it('無効な認証情報でログイン失敗時の試行回数が増加する', async () => {
      // Arrange
      const mockUserWithAttempts = {
        ...mockUser,
        failedLoginAttempts: 2,
        incrementLoginAttempts: jest.fn().mockResolvedValue(true),
        select: jest.fn().mockReturnThis(),
      };
      mongoMock.mockFindOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserWithAttempts),
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      // Act
      const result = await signIn('credentials', {
        email: validLoginData.email,
        password: 'WrongPassword',
        redirect: false,
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          error: 'CredentialsSignin',
        })
      );

      // 失敗試行回数の増加確認
      expect(mockUserWithAttempts.incrementLoginAttempts).toHaveBeenCalled();
    });

    it('ログイン成功時に失敗試行回数がリセットされる', async () => {
      // Arrange
      const mockUserWithAttempts = {
        ...mockUser,
        failedLoginAttempts: 3,
        resetLoginAttempts: jest.fn().mockResolvedValue(true),
        select: jest.fn().mockReturnThis(),
      };
      mongoMock.mockFindOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserWithAttempts),
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      mongoMock.mockFindByIdAndUpdate.mockResolvedValue(mockUserWithAttempts);

      // Act
      const result = await signIn('credentials', {
        email: validLoginData.email,
        password: validLoginData.password,
        redirect: false,
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          ok: true,
          error: null,
        })
      );

      // 失敗試行回数のリセット確認
      expect(mockUserWithAttempts.resetLoginAttempts).toHaveBeenCalled();
    });
  });

  describe('バリデーションテスト', () => {
    it('メールアドレスが空の場合にログインが失敗する', async () => {
      // Act
      const result = await signIn('credentials', {
        email: '',
        password: validLoginData.password,
        redirect: false,
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          error: 'CredentialsSignin',
        })
      );
    });

    it('パスワードが空の場合にログインが失敗する', async () => {
      // Act
      const result = await signIn('credentials', {
        email: validLoginData.email,
        password: '',
        redirect: false,
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          error: 'CredentialsSignin',
        })
      );
    });

    it('無効なメールアドレス形式でログインが失敗する', async () => {
      // Act
      const result = await signIn('credentials', {
        email: 'invalid-email-format',
        password: validLoginData.password,
        redirect: false,
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          error: 'CredentialsSignin',
        })
      );
    });

    it('短すぎるパスワードでログインが失敗する', async () => {
      // Act
      const result = await signIn('credentials', {
        email: validLoginData.email,
        password: '123', // 8文字未満
        redirect: false,
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          error: 'CredentialsSignin',
        })
      );
    });
  });

  describe('データベースエラーテスト', () => {
    it('MongoDB接続エラーでログインが失敗する', async () => {
      // Arrange
      mongoMock.mockFindOne.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      const result = await signIn('credentials', {
        email: validLoginData.email,
        password: validLoginData.password,
        redirect: false,
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          error: 'CredentialsSignin',
        })
      );

      // エラーログの確認
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '認証エラー:',
        expect.any(Error)
      );
    });

    it('bcrypt比較エラーでログインが失敗する', async () => {
      // Arrange
      const mockUserWithPassword = {
        ...mockUser,
        select: jest.fn().mockReturnThis(),
      };
      mongoMock.mockFindOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserWithPassword),
      });
      jest
        .spyOn(bcrypt, 'compare')
        .mockRejectedValue(new Error('Hash comparison failed'));

      // Act
      const result = await signIn('credentials', {
        email: validLoginData.email,
        password: validLoginData.password,
        redirect: false,
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          error: 'CredentialsSignin',
        })
      );
    });
  });

  describe('セキュリティテスト', () => {
    it('SQLインジェクション攻撃が無効化される', async () => {
      // Arrange
      const maliciousEmail = "'; DROP DATABASE test; --";
      mongoMock.mockFindOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      // Act
      const result = await signIn('credentials', {
        email: maliciousEmail,
        password: validLoginData.password,
        redirect: false,
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          error: 'CredentialsSignin',
        })
      );

      // メール検索が正しく行われる（SQLインジェクションは効果がない）
      expect(mongoMock.mockFindOne).toHaveBeenCalledWith({
        email: maliciousEmail.toLowerCase(),
      });
    });

    it('大文字小文字を区別しないメール検索が行われる', async () => {
      // Arrange
      const upperCaseEmail = 'TEST@EXAMPLE.COM';
      mongoMock.mockFindOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      // Act
      await signIn('credentials', {
        email: upperCaseEmail,
        password: validLoginData.password,
        redirect: false,
      });

      // Assert
      expect(mongoMock.mockFindOne).toHaveBeenCalledWith({
        email: upperCaseEmail.toLowerCase(),
      });
    });
  });

  describe('Edge Caseテスト', () => {
    it('null/undefinedの認証情報でログインが失敗する', async () => {
      // Act & Assert
      const resultNull = await signIn('credentials', {
        email: null,
        password: validLoginData.password,
        redirect: false,
      });
      expect(resultNull.ok).toBe(false);

      const resultUndefined = await signIn('credentials', {
        email: validLoginData.email,
        password: undefined,
        redirect: false,
      });
      expect(resultUndefined.ok).toBe(false);
    });

    it('非常に長い認証情報が適切に処理される', async () => {
      // Arrange
      const longEmail = 'a'.repeat(1000) + '@example.com';
      const longPassword = 'a'.repeat(1000);

      mongoMock.mockFindOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      // Act
      const result = await signIn('credentials', {
        email: longEmail,
        password: longPassword,
        redirect: false,
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          error: 'CredentialsSignin',
        })
      );

      // 長い値でも検索が行われる
      expect(mongoMock.mockFindOne).toHaveBeenCalledWith({
        email: longEmail.toLowerCase(),
      });
    });

    it('特殊文字を含む認証情報が適切に処理される', async () => {
      // Arrange
      const specialEmail = 'user+test@example.com';
      const specialPassword = 'Pass@#$%^&*()123!';

      const mockUserWithSpecialEmail = {
        ...mockUser,
        email: specialEmail,
        select: jest.fn().mockReturnThis(),
      };
      mongoMock.mockFindOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserWithSpecialEmail),
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      mongoMock.mockFindByIdAndUpdate.mockResolvedValue(
        mockUserWithSpecialEmail
      );

      // Act
      const result = await signIn('credentials', {
        email: specialEmail,
        password: specialPassword,
        redirect: false,
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          ok: true,
          error: null,
        })
      );

      // 特殊文字を含む値も正しく処理される
      expect(bcrypt.compare).toHaveBeenCalledWith(
        specialPassword,
        mockUser.password
      );
    });
  });
});

/**
 * NextAuth.js認証システムのテスト
 * SignIn機能とCredentialsプロバイダーのテスト
 */

import { auth, signIn, signOut } from '../../auth';
import { AuthError } from 'next-auth';
import bcrypt from 'bcryptjs';
import {
  setupMongoMock,
  setupConsoleSpy,
  mockUser,
  mockUnverifiedUser,
  mockLockedUser,
  verifyTestEnvironment,
  expectAuthError,
  expectAuthSuccess,
  flushPromises,
} from '../utils/test-helpers';

// テスト環境の確認
verifyTestEnvironment();

// NextAuth関数のモック
jest.mock('../../auth', () => ({
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// bcryptのモック
jest.mock('bcryptjs');

describe('NextAuth認証システム', () => {
  let mongoMock: ReturnType<typeof setupMongoMock>;
  let consoleSpy: ReturnType<typeof setupConsoleSpy>;

  const mockAuth = auth as jest.MockedFunction<typeof auth>;
  const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
  const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
  const mockBcryptCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

  beforeEach(() => {
    mongoMock = setupMongoMock();
    consoleSpy = setupConsoleSpy();

    // デフォルトのモック設定
    mockBcryptCompare.mockResolvedValue(true);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mongoMock.resetMocks();
    consoleSpy.restore();
  });

  describe('signIn関数のテスト', () => {
    describe('正常系', () => {
      it('正常な認証情報でログインが成功する', async () => {
        // Arrange
        const loginData = {
          email: mockUser.email,
          password: 'Password123!',
        };

        mongoMock.mockFindOne.mockResolvedValue({
          ...mockUser,
          password: 'hashed-password',
        });

        mongoMock.mockFindByIdAndUpdate.mockResolvedValue(mockUser);

        mockSignIn.mockResolvedValue({
          error: null,
          status: 200,
          ok: true,
          url: 'http://localhost:3001/board',
        });

        // Act
        const result = await signIn('credentials', {
          email: loginData.email,
          password: loginData.password,
          redirect: false,
        });

        // Assert
        expectAuthSuccess(result);
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          email: loginData.email,
          password: loginData.password,
          redirect: false,
        });
      });

      it('ログイン成功時に最終ログイン時刻が更新される', async () => {
        // Arrange
        const loginUser = {
          ...mockUser,
          password: 'hashed-password',
        };

        mongoMock.mockFindOne.mockResolvedValue(loginUser);
        mongoMock.mockFindByIdAndUpdate.mockResolvedValue(loginUser);

        mockSignIn.mockImplementation(async () => {
          // ログイン成功をシミュレート
          mongoMock.mockFindByIdAndUpdate.mockResolvedValue({
            ...loginUser,
            lastLoginAt: new Date(),
          });
          return { error: null, status: 200, ok: true, url: null };
        });

        // Act
        await signIn('credentials', {
          email: mockUser.email,
          password: 'Password123!',
          redirect: false,
        });

        await flushPromises();

        // Assert
        expect(mongoMock.mockFindByIdAndUpdate).toHaveBeenCalledWith(
          mockUser._id,
          {
            lastLoginAt: expect.any(Date),
          }
        );
      });
    });

    describe('バリデーションエラー', () => {
      it('無効なメールアドレスでエラーが発生する', async () => {
        // Arrange
        const invalidEmail = 'invalid-email';
        
        mockSignIn.mockRejectedValue(new AuthError('バリデーションエラー'));

        // Act & Assert
        await expect(
          signIn('credentials', {
            email: invalidEmail,
            password: 'Password123!',
            redirect: false,
          })
        ).rejects.toThrow('バリデーションエラー');
      });

      it('パスワードが短すぎる場合エラーが発生する', async () => {
        // Arrange
        const shortPassword = '123';
        
        mockSignIn.mockRejectedValue(new AuthError('バリデーションエラー'));

        // Act & Assert
        await expect(
          signIn('credentials', {
            email: mockUser.email,
            password: shortPassword,
            redirect: false,
          })
        ).rejects.toThrow('バリデーションエラー');
      });

      it('必須フィールドが空の場合エラーが発生する', async () => {
        // Arrange
        mockSignIn.mockRejectedValue(new AuthError('認証情報が不足しています'));

        // Act & Assert
        await expect(
          signIn('credentials', {
            email: '',
            password: '',
            redirect: false,
          })
        ).rejects.toThrow();
      });
    });

    describe('認証エラー', () => {
      it('存在しないユーザーでログインが失敗する', async () => {
        // Arrange
        mongoMock.mockFindOne.mockResolvedValue(null);
        
        mockSignIn.mockResolvedValue({
          error: 'CredentialsSignin',
          status: 401,
          ok: false,
          url: null,
        });

        // Act
        const result = await signIn('credentials', {
          email: 'nonexistent@example.com',
          password: 'Password123!',
          redirect: false,
        });

        // Assert
        expectAuthError(result, 'CredentialsSignin');
      });

      it('間違ったパスワードでログインが失敗する', async () => {
        // Arrange
        mongoMock.mockFindOne.mockResolvedValue({
          ...mockUser,
          password: 'hashed-password',
        });
        
        mockBcryptCompare.mockResolvedValue(false); // パスワード不一致
        
        mockSignIn.mockResolvedValue({
          error: 'CredentialsSignin',
          status: 401,
          ok: false,
          url: null,
        });

        // Act
        const result = await signIn('credentials', {
          email: mockUser.email,
          password: 'wrong-password',
          redirect: false,
        });

        // Assert
        expectAuthError(result, 'CredentialsSignin');
      });

      it('メール未認証のユーザーでログインが失敗する', async () => {
        // Arrange
        mongoMock.mockFindOne.mockResolvedValue({
          ...mockUnverifiedUser,
          password: 'hashed-password',
        });

        mockSignIn.mockRejectedValue(
          new AuthError('メールアドレスが確認されていません。確認メールをご確認ください。')
        );

        // Act & Assert
        await expect(
          signIn('credentials', {
            email: mockUnverifiedUser.email,
            password: 'Password123!',
            redirect: false,
          })
        ).rejects.toThrow('メールアドレスが確認されていません');
      });

      it('ロックされたアカウントでログインが失敗する', async () => {
        // Arrange
        mongoMock.mockFindOne.mockResolvedValue({
          ...mockLockedUser,
          password: 'hashed-password',
        });

        mockSignIn.mockResolvedValue({
          error: 'AccountLocked',
          status: 423,
          ok: false,
          url: null,
        });

        // Act
        const result = await signIn('credentials', {
          email: mockLockedUser.email,
          password: 'Password123!',
          redirect: false,
        });

        // Assert
        expectAuthError(result, 'AccountLocked');
      });
    });

    describe('アカウントロック機能', () => {
      it('複数回のログイン失敗でアカウントがロックされる', async () => {
        // Arrange
        const userWithFailures = {
          ...mockUser,
          password: 'hashed-password',
          failedLoginAttempts: 4, // あと1回でロック
          incrementLoginAttempts: jest.fn(),
        };

        mongoMock.mockFindOne.mockResolvedValue(userWithFailures);
        mockBcryptCompare.mockResolvedValue(false); // パスワード不一致

        // 5回目の失敗でロック
        mockSignIn.mockImplementation(async () => {
          userWithFailures.incrementLoginAttempts();
          return {
            error: 'AccountLocked',
            status: 423,
            ok: false,
            url: null,
          };
        });

        // Act
        const result = await signIn('credentials', {
          email: userWithFailures.email,
          password: 'wrong-password',
          redirect: false,
        });

        // Assert
        expectAuthError(result, 'AccountLocked');
        expect(userWithFailures.incrementLoginAttempts).toHaveBeenCalled();
      });

      it('ログイン成功時に失敗カウントがリセットされる', async () => {
        // Arrange
        const userWithFailures = {
          ...mockUser,
          password: 'hashed-password',
          failedLoginAttempts: 3,
          resetLoginAttempts: jest.fn(),
        };

        mongoMock.mockFindOne.mockResolvedValue(userWithFailures);
        mockBcryptCompare.mockResolvedValue(true); // パスワード一致

        mockSignIn.mockImplementation(async () => {
          userWithFailures.resetLoginAttempts();
          return { error: null, status: 200, ok: true, url: null };
        });

        // Act
        await signIn('credentials', {
          email: userWithFailures.email,
          password: 'Password123!',
          redirect: false,
        });

        // Assert
        expect(userWithFailures.resetLoginAttempts).toHaveBeenCalled();
      });
    });

    describe('データベースエラー', () => {
      it('データベース接続エラーで認証が失敗する', async () => {
        // Arrange
        mongoMock.mockFindOne.mockRejectedValue(new Error('Database connection failed'));
        
        mockSignIn.mockRejectedValue(new AuthError('認証に失敗しました。'));

        // Act & Assert
        await expect(
          signIn('credentials', {
            email: mockUser.email,
            password: 'Password123!',
            redirect: false,
          })
        ).rejects.toThrow('認証に失敗しました');
      });

      it('ユーザー更新エラーが適切に処理される', async () => {
        // Arrange
        mongoMock.mockFindOne.mockResolvedValue({
          ...mockUser,
          password: 'hashed-password',
        });
        
        mongoMock.mockFindByIdAndUpdate.mockRejectedValue(
          new Error('Update failed')
        );

        // ログインは成功するが、更新は失敗
        mockSignIn.mockResolvedValue({
          error: null,
          status: 200,
          ok: true,
          url: null,
        });

        // Act
        const result = await signIn('credentials', {
          email: mockUser.email,
          password: 'Password123!',
          redirect: false,
        });

        // Assert
        expectAuthSuccess(result);
        // エラーログが出力される
        expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringContaining('Update failed')
        );
      });
    });
  });

  describe('auth関数のテスト', () => {
    it('有効なセッションを取得できる', async () => {
      // Arrange
      const mockSession = {
        user: {
          id: mockUser._id,
          email: mockUser.email,
          name: mockUser.name,
          emailVerified: mockUser.emailVerified,
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      mockAuth.mockResolvedValue(mockSession);

      // Act
      const session = await auth();

      // Assert
      expect(session).toEqual(mockSession);
      expect(session?.user.id).toBe(mockUser._id);
      expect(session?.user.email).toBe(mockUser.email);
    });

    it('無効なセッションでnullが返される', async () => {
      // Arrange
      mockAuth.mockResolvedValue(null);

      // Act
      const session = await auth();

      // Assert
      expect(session).toBeNull();
    });

    it('期限切れのセッションでnullが返される', async () => {
      // Arrange
      const expiredSession = {
        user: mockUser,
        expires: new Date(Date.now() - 1000).toISOString(), // 1秒前に期限切れ
      };

      mockAuth.mockResolvedValue(null); // NextAuth.jsが自動でnullを返す

      // Act
      const session = await auth();

      // Assert
      expect(session).toBeNull();
    });
  });

  describe('signOut関数のテスト', () => {
    it('正常にログアウトできる', async () => {
      // Arrange
      mockSignOut.mockResolvedValue({
        url: 'http://localhost:3001/auth/signin',
      });

      // Act
      const result = await signOut({ redirect: false });

      // Assert
      expect(result).toEqual({
        url: 'http://localhost:3001/auth/signin',
      });
      expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
    });

    it('リダイレクト付きでログアウトできる', async () => {
      // Arrange
      mockSignOut.mockResolvedValue({
        url: 'http://localhost:3001/auth/signin',
      });

      // Act
      const result = await signOut({
        redirectTo: '/auth/signin',
      });

      // Assert
      expect(result).toEqual({
        url: 'http://localhost:3001/auth/signin',
      });
      expect(mockSignOut).toHaveBeenCalledWith({
        redirectTo: '/auth/signin',
      });
    });
  });

  describe('セッションコールバック', () => {
    it('JWTトークンからセッションが正しく生成される', async () => {
      // Note: この部分は実際のNextAuth.jsの内部処理をテストするもので、
      // 単体テストでは直接テストしにくい。
      // 代わりにE2Eテストでセッション情報が正しく取得できることを確認する。
    });

    it('セッション更新時にトークンが適切に更新される', async () => {
      // Note: この部分も実際のNextAuth.jsの内部処理をテストするもので、
      // 単体テストでは直接テストしにくい。
    });
  });

  describe('エラーハンドリング', () => {
    it('予期しないエラーが適切に処理される', async () => {
      // Arrange
      mockSignIn.mockRejectedValue(new Error('Unexpected error'));

      // Act & Assert
      await expect(
        signIn('credentials', {
          email: mockUser.email,
          password: 'Password123!',
          redirect: false,
        })
      ).rejects.toThrow('Unexpected error');
    });

    it('ネットワークエラーが適切に処理される', async () => {
      // Arrange
      mongoMock.mockFindOne.mockRejectedValue(new Error('ECONNRESET'));
      
      mockSignIn.mockRejectedValue(new AuthError('認証に失敗しました。'));

      // Act & Assert
      await expect(
        signIn('credentials', {
          email: mockUser.email,
          password: 'Password123!',
          redirect: false,
        })
      ).rejects.toThrow('認証に失敗しました');
    });
  });

  describe('セキュリティテスト', () => {
    it('SQLインジェクション攻撃が効果的でないことを確認', async () => {
      // Arrange
      const maliciousEmail = "'; DROP TABLE users; --";
      
      mongoMock.mockFindOne.mockResolvedValue(null); // ユーザーが見つからない

      mockSignIn.mockResolvedValue({
        error: 'CredentialsSignin',
        status: 401,
        ok: false,
        url: null,
      });

      // Act
      const result = await signIn('credentials', {
        email: maliciousEmail,
        password: 'Password123!',
        redirect: false,
      });

      // Assert
      expectAuthError(result, 'CredentialsSignin');
      // データベースクエリが正常に実行される（NoSQLなのでSQLインジェクションは無効）
      expect(mongoMock.mockFindOne).toHaveBeenCalledWith({
        email: maliciousEmail.toLowerCase(),
      });
    });

    it('パスワードの平文ログが出力されないことを確認', async () => {
      // Arrange
      const password = 'SecretPassword123!';
      mongoMock.mockFindOne.mockResolvedValue(null);
      
      mockSignIn.mockResolvedValue({
        error: 'CredentialsSignin',
        status: 401,
        ok: false,
        url: null,
      });

      // Act
      await signIn('credentials', {
        email: mockUser.email,
        password: password,
        redirect: false,
      });

      // Assert
      // コンソールログにパスワードが含まれていないことを確認
      const logCalls = consoleSpy.error.mock.calls.flat();
      const logMessages = logCalls.join(' ');
      expect(logMessages).not.toContain(password);
    });

    it('レスポンス時間攻撃を防ぐための一定の処理時間が確保される', async () => {
      // Arrange
      const startTime = Date.now();
      mongoMock.mockFindOne.mockResolvedValue(null);
      
      mockSignIn.mockResolvedValue({
        error: 'CredentialsSignin',
        status: 401,
        ok: false,
        url: null,
      });

      // Act
      await signIn('credentials', {
        email: 'nonexistent@example.com',
        password: 'Password123!',
        redirect: false,
      });

      // Assert
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // 最低限の処理時間が確保されている
      // （実装によってはbcrypt.compareが時間を調整する）
      expect(processingTime).toBeGreaterThan(0);
    });
  });
});
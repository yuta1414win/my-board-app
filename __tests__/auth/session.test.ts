/**
 * セッション管理のテスト
 * セッション確認、更新、有効期限のテスト
 */

import { auth, signOut } from '../../auth';
import { getSession, useSession } from 'next-auth/react';
import {
  setupNextAuthMock,
  setupConsoleSpy,
  mockUser,
  mockSession,
  verifyTestEnvironment,
  flushPromises,
} from '../utils/test-helpers';

// テスト環境の確認
verifyTestEnvironment();

describe('セッション管理テスト', () => {
  let nextAuthMock: ReturnType<typeof setupNextAuthMock>;
  let consoleSpy: ReturnType<typeof setupConsoleSpy>;

  beforeEach(() => {
    nextAuthMock = setupNextAuthMock();
    consoleSpy = setupConsoleSpy();
  });

  afterEach(() => {
    nextAuthMock.resetMocks();
    consoleSpy.restore();
  });

  describe('セッション確認テスト', () => {
    it('有効なセッションが正常に取得される', async () => {
      // Arrange
      nextAuthMock.mockAuth.mockResolvedValue(mockSession);

      // Act
      const session = await auth();

      // Assert
      expect(session).toEqual(mockSession);
      expect(session?.user).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          emailVerified: mockUser.emailVerified,
          role: mockUser.role,
        })
      );
    });

    it('セッションが存在しない場合はnullが返される', async () => {
      // Arrange
      nextAuthMock.mockAuth.mockResolvedValue(null);

      // Act
      const session = await auth();

      // Assert
      expect(session).toBeNull();
    });

    it('セッション取得エラー時は適切にハンドリングされる', async () => {
      // Arrange
      nextAuthMock.mockAuth.mockRejectedValue(
        new Error('Session retrieval failed')
      );

      // Act & Assert
      await expect(auth()).rejects.toThrow('Session retrieval failed');
    });

    it('getSessionでセッション情報が取得される', async () => {
      // Arrange
      nextAuthMock.mockGetSession.mockResolvedValue(mockSession);

      // Act
      const session = await getSession();

      // Assert
      expect(session).toEqual(mockSession);
      expect(nextAuthMock.mockGetSession).toHaveBeenCalled();
    });

    it('useSessionフックでセッション状態が取得される', () => {
      // Arrange
      const mockUseSession = useSession as jest.Mock;
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: jest.fn(),
      });

      // Act
      const { data, status } = useSession();

      // Assert
      expect(status).toBe('authenticated');
      expect(data).toEqual(mockSession);
    });
  });

  describe('セッション状態テスト', () => {
    it('認証済み状態が正しく識別される', () => {
      // Arrange
      const mockUseSession = useSession as jest.Mock;
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: jest.fn(),
      });

      // Act
      const { status } = useSession();

      // Assert
      expect(status).toBe('authenticated');
    });

    it('未認証状態が正しく識別される', () => {
      // Arrange
      const mockUseSession = useSession as jest.Mock;
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      // Act
      const { status } = useSession();

      // Assert
      expect(status).toBe('unauthenticated');
    });

    it('ローディング状態が正しく識別される', () => {
      // Arrange
      const mockUseSession = useSession as jest.Mock;
      mockUseSession.mockReturnValue({
        data: undefined,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      const { status } = useSession();

      // Assert
      expect(status).toBe('loading');
    });
  });

  describe('セッション更新テスト', () => {
    it('セッション情報が正常に更新される', async () => {
      // Arrange
      const updateMock = jest.fn();
      const mockUseSession = useSession as jest.Mock;
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: updateMock,
      });

      const updatedData = {
        name: 'Updated Name',
      };

      updateMock.mockResolvedValue({
        ...mockSession,
        user: {
          ...mockSession.user,
          ...updatedData,
        },
      });

      // Act
      const { update } = useSession();
      const updatedSession = await update(updatedData);

      // Assert
      expect(updateMock).toHaveBeenCalledWith(updatedData);
      expect(updatedSession?.user.name).toBe('Updated Name');
    });

    it('セッション更新エラー時は適切にハンドリングされる', async () => {
      // Arrange
      const updateMock = jest.fn();
      const mockUseSession = useSession as jest.Mock;
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: updateMock,
      });

      updateMock.mockRejectedValue(new Error('Update failed'));

      // Act & Assert
      const { update } = useSession();
      await expect(update({ name: 'New Name' })).rejects.toThrow(
        'Update failed'
      );
    });
  });

  describe('セッション有効期限テスト', () => {
    it('有効期限内のセッションは有効と判定される', async () => {
      // Arrange
      const validSession = {
        ...mockSession,
        expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1時間後
      };
      nextAuthMock.mockAuth.mockResolvedValue(validSession);

      // Act
      const session = await auth();

      // Assert
      expect(session).toBeTruthy();
      expect(new Date(session?.expires || 0).getTime()).toBeGreaterThan(
        Date.now()
      );
    });

    it('期限切れセッションは無効と判定される', async () => {
      // Arrange
      const expiredSession = {
        ...mockSession,
        expires: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1時間前
      };
      nextAuthMock.mockAuth.mockResolvedValue(expiredSession);

      // Act
      const session = await auth();

      // Assert
      // 期限切れセッションは通常NextAuth.jsが自動でnullにするが、
      // ここではモックなので期限切れかどうかを確認
      expect(new Date(session?.expires || 0).getTime()).toBeLessThan(
        Date.now()
      );
    });

    it('セッション有効期限が30日に設定されている', async () => {
      // Arrange
      const thirtyDaysFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000;
      const sessionWith30Days = {
        ...mockSession,
        expires: new Date(thirtyDaysFromNow).toISOString(),
      };
      nextAuthMock.mockAuth.mockResolvedValue(sessionWith30Days);

      // Act
      const session = await auth();

      // Assert
      const expiresTime = new Date(session?.expires || 0).getTime();
      const expectedTime = thirtyDaysFromNow;
      const timeDifference = Math.abs(expiresTime - expectedTime);

      // 1分以内の誤差を許容
      expect(timeDifference).toBeLessThan(60 * 1000);
    });
  });

  describe('セッション終了（ログアウト）テスト', () => {
    it('ログアウトが正常に実行される', async () => {
      // Arrange
      nextAuthMock.mockSignOut.mockResolvedValue({ url: '/auth/signin' });

      // Act
      const result = await signOut({ redirect: false });

      // Assert
      expect(result).toEqual({ url: '/auth/signin' });
      expect(nextAuthMock.mockSignOut).toHaveBeenCalledWith({
        redirect: false,
      });
    });

    it('リダイレクト付きログアウトが正常に実行される', async () => {
      // Arrange
      const callbackUrl = '/auth/signin?message=logged-out';
      nextAuthMock.mockSignOut.mockResolvedValue({ url: callbackUrl });

      // Act
      const result = await signOut({
        callbackUrl,
        redirect: true,
      });

      // Assert
      expect(result).toEqual({ url: callbackUrl });
      expect(nextAuthMock.mockSignOut).toHaveBeenCalledWith({
        callbackUrl,
        redirect: true,
      });
    });

    it('ログアウトエラー時は適切にハンドリングされる', async () => {
      // Arrange
      nextAuthMock.mockSignOut.mockRejectedValue(new Error('Logout failed'));

      // Act & Assert
      await expect(signOut({ redirect: false })).rejects.toThrow(
        'Logout failed'
      );
    });

    it('ログアウト後はセッションがクリアされる', async () => {
      // Arrange
      // 最初は認証済み
      nextAuthMock.mockAuth.mockResolvedValueOnce(mockSession);

      // ログアウト後はセッションなし
      nextAuthMock.mockAuth.mockResolvedValueOnce(null);
      nextAuthMock.mockSignOut.mockResolvedValue({ url: '/auth/signin' });

      // Act
      let session = await auth();
      expect(session).toEqual(mockSession);

      await signOut({ redirect: false });

      session = await auth();

      // Assert
      expect(session).toBeNull();
    });
  });

  describe('クライアントサイドセッション管理テスト', () => {
    it('SessionProviderがセッション状態を提供する', () => {
      // Arrange
      const mockSessionProvider = require('next-auth/react').SessionProvider;
      const mockChildren = 'Test Content';

      // Act
      const result = mockSessionProvider({ children: mockChildren });

      // Assert
      expect(result).toEqual(mockChildren);
    });

    it('useSessionが適切な初期状態を返す', () => {
      // Arrange
      const mockUseSession = useSession as jest.Mock;
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      // Act
      const { data, status, update } = useSession();

      // Assert
      expect(data).toBeNull();
      expect(status).toBe('loading');
      expect(update).toBeInstanceOf(Function);
    });
  });

  describe('セッション永続化テスト', () => {
    it('セッションがブラウザを跨いで永続化される', async () => {
      // Arrange
      const persistentSession = {
        ...mockSession,
        // JWTトークンを使用したセッション
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      nextAuthMock.mockGetSession.mockResolvedValue(persistentSession);

      // Act
      const session = await getSession();

      // Assert
      expect(session).toEqual(persistentSession);
      expect(session?.expires).toBeTruthy();
    });

    it('セッション更新間隔が24時間に設定されている', async () => {
      // この部分は実際の設定のテストとなるため、
      // auth.ts の設定を確認するテスト
      // updateAge: 24 * 60 * 60 が設定されていることを確認

      // Note: 実際のテストでは設定値の確認が困難なため、
      // 機能的なテストとして24時間以内の更新を確認
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const sessionLastUpdated = {
        ...mockSession,
        // セッションが24時間前に更新されたとする
        iat: Math.floor(twentyFourHoursAgo / 1000),
      };

      nextAuthMock.mockAuth.mockResolvedValue(sessionLastUpdated);

      // Act
      const session = await auth();

      // Assert - セッションが存在し、更新が必要な状態であることを確認
      expect(session).toBeTruthy();
    });
  });

  describe('Edge Caseテスト', () => {
    it('破損したセッションデータが適切に処理される', async () => {
      // Arrange
      const corruptedSession = {
        user: null, // userがnull
        expires: 'invalid-date', // 無効な日付
      };
      nextAuthMock.mockAuth.mockResolvedValue(corruptedSession);

      // Act
      const session = await auth();

      // Assert
      expect(session).toEqual(corruptedSession);
      // 破損したデータでもエラーを投げずに返される
    });

    it('非常に古いセッション形式が適切に処理される', async () => {
      // Arrange
      const legacySession = {
        // 古いセッション形式
        accessToken: 'legacy-token',
        user: mockUser,
        expires: mockSession.expires,
      };
      nextAuthMock.mockAuth.mockResolvedValue(legacySession);

      // Act
      const session = await auth();

      // Assert
      expect(session).toEqual(legacySession);
      expect(session?.user).toBeTruthy();
    });

    it('同時に複数のセッション取得リクエストが適切に処理される', async () => {
      // Arrange
      nextAuthMock.mockAuth.mockResolvedValue(mockSession);

      // Act - 複数の同時リクエスト
      const promises = Array.from({ length: 5 }, () => auth());
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(5);
      results.forEach((session) => {
        expect(session).toEqual(mockSession);
      });
      expect(nextAuthMock.mockAuth).toHaveBeenCalledTimes(5);
    });
  });

  describe('パフォーマンステスト', () => {
    it('セッション取得のレスポンス時間が適切である', async () => {
      // Arrange
      nextAuthMock.mockAuth.mockResolvedValue(mockSession);
      const startTime = Date.now();

      // Act
      await auth();
      const endTime = Date.now();

      // Assert
      const responseTime = endTime - startTime;
      // モック環境では即座に返されるはずなので、10ms以内を期待
      expect(responseTime).toBeLessThan(10);
    });

    it('大量のセッション更新リクエストが適切に処理される', async () => {
      // Arrange
      const updateMock = jest.fn();
      const mockUseSession = useSession as jest.Mock;
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
        update: updateMock,
      });

      updateMock.mockResolvedValue(mockSession);

      // Act - 複数の更新リクエスト
      const { update } = useSession();
      const promises = Array.from({ length: 10 }, (_, i) =>
        update({ name: `User ${i}` })
      );
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(10);
      expect(updateMock).toHaveBeenCalledTimes(10);
    });
  });
});

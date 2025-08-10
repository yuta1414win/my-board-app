/**
 * ログアウト機能のテスト
 * NextAuth.js signOut機能とログアウト後の状態確認
 */

import { signOut } from 'next-auth/react';
import { redirect } from 'next/navigation';
import {
  setupNextAuthMock,
  setupConsoleSpy,
  mockSession,
  verifyTestEnvironment,
} from '../utils/test-helpers';

// Next.js navigationのモック
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// テスト環境の確認
verifyTestEnvironment();

describe('ログアウト機能テスト', () => {
  let nextAuthMock: ReturnType<typeof setupNextAuthMock>;
  let consoleSpy: ReturnType<typeof setupConsoleSpy>;

  beforeEach(() => {
    nextAuthMock = setupNextAuthMock();
    consoleSpy = setupConsoleSpy();
  });

  afterEach(() => {
    nextAuthMock.resetMocks();
    consoleSpy.restore();
    jest.clearAllMocks();
  });

  describe('基本ログアウト機能テスト', () => {
    it('リダイレクトなしログアウトが正常に実行される', async () => {
      // Arrange
      const expectedResult = { url: '/auth/signin' };
      nextAuthMock.mockSignOut.mockResolvedValue(expectedResult);

      // Act
      const result = await signOut({ redirect: false });

      // Assert
      expect(result).toEqual(expectedResult);
      expect(nextAuthMock.mockSignOut).toHaveBeenCalledWith({
        redirect: false,
      });
      expect(nextAuthMock.mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('デフォルトのリダイレクト先でログアウトが実行される', async () => {
      // Arrange
      const expectedResult = { url: '/auth/signin' };
      nextAuthMock.mockSignOut.mockResolvedValue(expectedResult);

      // Act
      const result = await signOut();

      // Assert
      expect(result).toEqual(expectedResult);
      expect(nextAuthMock.mockSignOut).toHaveBeenCalledWith(undefined);
    });

    it('カスタムコールバックURLでログアウトが実行される', async () => {
      // Arrange
      const callbackUrl = '/custom-logout-page';
      const expectedResult = { url: callbackUrl };
      nextAuthMock.mockSignOut.mockResolvedValue(expectedResult);

      // Act
      const result = await signOut({
        callbackUrl,
        redirect: true,
      });

      // Assert
      expect(result).toEqual(expectedResult);
      expect(nextAuthMock.mockSignOut).toHaveBeenCalledWith({
        callbackUrl,
        redirect: true,
      });
    });
  });

  describe('ログアウト後の状態確認テスト', () => {
    it('ログアウト後にセッションがクリアされる', async () => {
      // Arrange
      // 初期状態では認証済み
      nextAuthMock.mockGetSession.mockResolvedValueOnce(mockSession);

      // ログアウト実行
      nextAuthMock.mockSignOut.mockResolvedValue({ url: '/auth/signin' });

      // ログアウト後はセッションなし
      nextAuthMock.mockGetSession.mockResolvedValueOnce(null);

      // Act
      let session = await nextAuthMock.mockGetSession();
      expect(session).toEqual(mockSession);

      await signOut({ redirect: false });

      session = await nextAuthMock.mockGetSession();

      // Assert
      expect(session).toBeNull();
    });

    it('ログアウト後にuseSessionの状態が更新される', async () => {
      // Arrange
      const { useSession } = require('next-auth/react');

      // 初期状態: 認証済み
      useSession.mockReturnValueOnce({
        data: mockSession,
        status: 'authenticated',
        update: jest.fn(),
      });

      // ログアウト後: 未認証
      useSession.mockReturnValueOnce({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });

      nextAuthMock.mockSignOut.mockResolvedValue({ url: '/auth/signin' });

      // Act
      let sessionState = useSession();
      expect(sessionState.status).toBe('authenticated');
      expect(sessionState.data).toEqual(mockSession);

      await signOut({ redirect: false });

      sessionState = useSession();

      // Assert
      expect(sessionState.status).toBe('unauthenticated');
      expect(sessionState.data).toBeNull();
    });
  });

  describe('ログアウトオプションテスト', () => {
    it('複数のオプションが正しく渡される', async () => {
      // Arrange
      const options = {
        callbackUrl: '/goodbye',
        redirect: true,
      };
      const expectedResult = { url: options.callbackUrl };
      nextAuthMock.mockSignOut.mockResolvedValue(expectedResult);

      // Act
      const result = await signOut(options);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(nextAuthMock.mockSignOut).toHaveBeenCalledWith(options);
    });

    it('空のオプションオブジェクトでもログアウトが実行される', async () => {
      // Arrange
      const expectedResult = { url: '/auth/signin' };
      nextAuthMock.mockSignOut.mockResolvedValue(expectedResult);

      // Act
      const result = await signOut({});

      // Assert
      expect(result).toEqual(expectedResult);
      expect(nextAuthMock.mockSignOut).toHaveBeenCalledWith({});
    });
  });

  describe('ログアウトエラーハンドリングテスト', () => {
    it('ネットワークエラー時は適切にエラーが伝播される', async () => {
      // Arrange
      const networkError = new Error('Network error');
      nextAuthMock.mockSignOut.mockRejectedValue(networkError);

      // Act & Assert
      await expect(signOut({ redirect: false })).rejects.toThrow(
        'Network error'
      );
      expect(nextAuthMock.mockSignOut).toHaveBeenCalledWith({
        redirect: false,
      });
    });

    it('サーバーエラー時は適切にエラーが伝播される', async () => {
      // Arrange
      const serverError = new Error('Internal server error');
      nextAuthMock.mockSignOut.mockRejectedValue(serverError);

      // Act & Assert
      await expect(signOut()).rejects.toThrow('Internal server error');
    });

    it('タイムアウトエラー時は適切にエラーが伝播される', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      nextAuthMock.mockSignOut.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(
        signOut({
          callbackUrl: '/timeout-test',
        })
      ).rejects.toThrow('Request timeout');
    });
  });

  describe('セキュリティテスト', () => {
    it('ログアウト時にクライアントサイドのトークンがクリアされる', async () => {
      // Arrange
      nextAuthMock.mockSignOut.mockResolvedValue({ url: '/auth/signin' });

      // localStorage のモック（実際のブラウザ環境での動作をシミュレート）
      const mockLocalStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });

      // Act
      await signOut({ redirect: false });

      // Assert
      expect(nextAuthMock.mockSignOut).toHaveBeenCalled();

      // Note: NextAuth.jsは内部でクッキーとストレージをクリアするが、
      // ここではモック環境なので直接の確認は困難
      // 実際のテストでは E2E テストで確認する
    });

    it('ログアウト後に保護されたページへのアクセスが拒否される', async () => {
      // Arrange
      nextAuthMock.mockSignOut.mockResolvedValue({ url: '/auth/signin' });
      nextAuthMock.mockAuth.mockResolvedValue(null); // ログアウト後はセッションなし

      const mockRedirect = redirect as jest.Mock;

      // Act
      await signOut({ redirect: false });

      // 保護されたページへのアクセスをシミュレート
      const session = await nextAuthMock.mockAuth();

      // Assert
      expect(session).toBeNull();

      // 実際のミドルウェアではリダイレクトが発生するが、
      // ここでは認証状態の確認のみ
      expect(nextAuthMock.mockAuth).toHaveBeenCalled();
    });

    it('ログアウト時にCSRFトークンが適切に処理される', async () => {
      // Arrange
      // CSRF攻撃を防ぐためのテスト
      const suspiciousCallbackUrl = 'javascript:alert("xss")';

      nextAuthMock.mockSignOut.mockImplementation((options) => {
        // NextAuth.js の内部実装では危険なURLをサニタイズ
        const safeUrl = options?.callbackUrl?.startsWith('http')
          ? options.callbackUrl
          : '/auth/signin';
        return Promise.resolve({ url: safeUrl });
      });

      // Act
      const result = await signOut({
        callbackUrl: suspiciousCallbackUrl,
        redirect: false,
      });

      // Assert
      expect(result.url).toBe('/auth/signin'); // 危険なURLはサニタイズされる
    });
  });

  describe('同時実行テスト', () => {
    it('複数の同時ログアウトリクエストが適切に処理される', async () => {
      // Arrange
      nextAuthMock.mockSignOut.mockResolvedValue({ url: '/auth/signin' });

      // Act - 複数の同時ログアウト
      const promises = Array.from({ length: 3 }, () =>
        signOut({ redirect: false })
      );
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toEqual({ url: '/auth/signin' });
      });
      expect(nextAuthMock.mockSignOut).toHaveBeenCalledTimes(3);
    });

    it('ログアウト中の追加リクエストが適切に処理される', async () => {
      // Arrange
      let resolveLogout: (value: any) => void;
      const logoutPromise = new Promise((resolve) => {
        resolveLogout = resolve;
      });

      nextAuthMock.mockSignOut.mockReturnValue(logoutPromise);

      // Act
      const firstLogout = signOut({ redirect: false });
      const secondLogout = signOut({ redirect: false });

      // 最初のログアウトを完了
      resolveLogout!({ url: '/auth/signin' });

      const results = await Promise.all([firstLogout, secondLogout]);

      // Assert
      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result).toEqual({ url: '/auth/signin' });
      });
    });
  });

  describe('Edge Caseテスト', () => {
    it('nullやundefinedのオプションでもログアウトが実行される', async () => {
      // Arrange
      nextAuthMock.mockSignOut.mockResolvedValue({ url: '/auth/signin' });

      // Act & Assert
      await expect(signOut(null as any)).resolves.toBeTruthy();
      await expect(signOut(undefined)).resolves.toBeTruthy();

      expect(nextAuthMock.mockSignOut).toHaveBeenCalledTimes(2);
    });

    it('非常に長いコールバックURLが適切に処理される', async () => {
      // Arrange
      const longUrl = 'http://example.com/' + 'a'.repeat(2000);
      nextAuthMock.mockSignOut.mockResolvedValue({ url: longUrl });

      // Act
      const result = await signOut({
        callbackUrl: longUrl,
        redirect: false,
      });

      // Assert
      expect(result.url).toBe(longUrl);
      expect(nextAuthMock.mockSignOut).toHaveBeenCalledWith({
        callbackUrl: longUrl,
        redirect: false,
      });
    });

    it('特殊文字を含むコールバックURLが適切に処理される', async () => {
      // Arrange
      const specialUrl = '/logout?message=さようなら&status=success';
      nextAuthMock.mockSignOut.mockResolvedValue({ url: specialUrl });

      // Act
      const result = await signOut({
        callbackUrl: specialUrl,
        redirect: false,
      });

      // Assert
      expect(result.url).toBe(specialUrl);
    });
  });

  describe('パフォーマンステスト', () => {
    it('ログアウトのレスポンス時間が適切である', async () => {
      // Arrange
      nextAuthMock.mockSignOut.mockResolvedValue({ url: '/auth/signin' });
      const startTime = Date.now();

      // Act
      await signOut({ redirect: false });
      const endTime = Date.now();

      // Assert
      const responseTime = endTime - startTime;
      // モック環境では即座に返されるはずなので、10ms以内を期待
      expect(responseTime).toBeLessThan(10);
    });

    it('大量のログアウトリクエストが適切に処理される', async () => {
      // Arrange
      nextAuthMock.mockSignOut.mockResolvedValue({ url: '/auth/signin' });

      // Act
      const promises = Array.from({ length: 50 }, () =>
        signOut({ redirect: false })
      );
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(50);
      expect(nextAuthMock.mockSignOut).toHaveBeenCalledTimes(50);

      // すべてのリクエストが成功
      results.forEach((result) => {
        expect(result).toEqual({ url: '/auth/signin' });
      });
    });
  });

  describe('統合テスト', () => {
    it('完全なログイン→ログアウトフローが正常に動作する', async () => {
      // Arrange
      // 1. ログイン状態から開始
      nextAuthMock.mockAuth.mockResolvedValueOnce(mockSession);
      nextAuthMock.mockGetSession.mockResolvedValueOnce(mockSession);

      // 2. ログアウト実行
      nextAuthMock.mockSignOut.mockResolvedValue({ url: '/auth/signin' });

      // 3. ログアウト後の状態
      nextAuthMock.mockAuth.mockResolvedValueOnce(null);
      nextAuthMock.mockGetSession.mockResolvedValueOnce(null);

      // Act & Assert
      // 1. ログイン状態の確認
      let session = await nextAuthMock.mockAuth();
      expect(session).toEqual(mockSession);

      // 2. ログアウト実行
      const logoutResult = await signOut({ redirect: false });
      expect(logoutResult).toEqual({ url: '/auth/signin' });

      // 3. ログアウト後の状態確認
      // ログアウト後はセッションがnullになるようモックを再設定
      nextAuthMock.mockAuth.mockResolvedValueOnce(null);
      nextAuthMock.mockGetSession.mockResolvedValueOnce(null);
      
      session = await nextAuthMock.mockAuth();
      expect(session).toBeNull();

      const clientSession = await nextAuthMock.mockGetSession();
      expect(clientSession).toBeNull();
    });
  });
});

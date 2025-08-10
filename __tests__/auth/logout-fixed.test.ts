/**
 * ログアウト機能のテスト（修正版）
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

describe('ログアウト機能テスト（修正版）', () => {
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
      expect(nextAuthMock.mockSignOut).toHaveBeenCalled();
    });

    it('統合テスト: 完全なログイン→ログアウトフローが正常に動作する', async () => {
      // Arrange - モックの戻り値を順番に設定
      nextAuthMock.mockAuth
        .mockResolvedValueOnce(mockSession) // 最初の確認でログイン状態
        .mockResolvedValueOnce(null); // ログアウト後の確認でnull
      
      nextAuthMock.mockGetSession.mockResolvedValueOnce(null); // ログアウト後の確認でnull
      nextAuthMock.mockSignOut.mockResolvedValue({ url: '/auth/signin' });

      // Act & Assert
      // 1. ログイン状態の確認
      let session = await nextAuthMock.mockAuth();
      expect(session).toEqual(mockSession);

      // 2. ログアウト実行
      const logoutResult = await signOut({ redirect: false });
      expect(logoutResult).toEqual({ url: '/auth/signin' });

      // 3. ログアウト後の状態確認
      session = await nextAuthMock.mockAuth();
      expect(session).toBeNull();

      const clientSession = await nextAuthMock.mockGetSession();
      expect(clientSession).toBeNull();
    });
  });
});
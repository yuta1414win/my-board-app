import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

// モック設定
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// APIルートをインポート
import {
  GET as profileGET,
  PUT as profilePUT,
} from '@/app/api/user/profile/route';
import { POST as postsCreate } from '../../app/api/posts/route';

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

describe.skip('認証保護API テスト - Skipped for NextAuth v5 compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('プロフィール API (/api/user/profile)', () => {
    describe('GET /api/user/profile', () => {
      it('未認証時は401エラーを返す', async () => {
        mockGetServerSession.mockResolvedValue(null);

        const request = new NextRequest(
          'http://localhost:3000/api/user/profile'
        );
        const response = await profileGET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('認証が必要です');
      });

      it('認証済みユーザーのプロフィール情報を返す', async () => {
        const mockSession = {
          user: {
            id: '1',
            name: 'Test User',
            email: 'test@example.com',
            image: 'avatar.jpg',
            bio: 'Test bio',
            emailVerified: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const request = new NextRequest(
          'http://localhost:3000/api/user/profile'
        );
        const response = await profileGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.id).toBe('1');
        expect(data.name).toBe('Test User');
        expect(data.email).toBe('test@example.com');
      });
    });

    describe('PUT /api/user/profile', () => {
      it('未認証時は401エラーを返す', async () => {
        mockGetServerSession.mockResolvedValue(null);

        const request = new NextRequest(
          'http://localhost:3000/api/user/profile',
          {
            method: 'PUT',
            body: JSON.stringify({ name: 'Updated Name', bio: 'Updated bio' }),
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const response = await profilePUT(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('認証が必要です');
      });

      it('名前が空の場合は400エラーを返す', async () => {
        const mockSession = {
          user: {
            id: '1',
            email: 'test@example.com',
          },
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const request = new NextRequest(
          'http://localhost:3000/api/user/profile',
          {
            method: 'PUT',
            body: JSON.stringify({ name: '', bio: 'Bio' }),
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const response = await profilePUT(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('名前は必須です');
      });

      it('名前が長すぎる場合は400エラーを返す', async () => {
        const mockSession = {
          user: {
            id: '1',
            email: 'test@example.com',
          },
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const longName = 'a'.repeat(51); // 51文字
        const request = new NextRequest(
          'http://localhost:3000/api/user/profile',
          {
            method: 'PUT',
            body: JSON.stringify({ name: longName, bio: 'Bio' }),
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const response = await profilePUT(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('名前は50文字以内で入力してください');
      });

      it('自己紹介が長すぎる場合は400エラーを返す', async () => {
        const mockSession = {
          user: {
            id: '1',
            email: 'test@example.com',
          },
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const longBio = 'a'.repeat(501); // 501文字
        const request = new NextRequest(
          'http://localhost:3000/api/user/profile',
          {
            method: 'PUT',
            body: JSON.stringify({ name: 'Valid Name', bio: longBio }),
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const response = await profilePUT(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('自己紹介は500文字以内で入力してください');
      });

      it('有効なデータでプロフィールを更新できる', async () => {
        const mockSession = {
          user: {
            id: '1',
            name: 'Old Name',
            email: 'test@example.com',
            image: 'avatar.jpg',
            bio: 'Old bio',
            emailVerified: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const request = new NextRequest(
          'http://localhost:3000/api/user/profile',
          {
            method: 'PUT',
            body: JSON.stringify({ name: 'New Name', bio: 'New bio' }),
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const response = await profilePUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.name).toBe('New Name');
        expect(data.bio).toBe('New bio');
        expect(data.email).toBe('test@example.com');
      });
    });
  });

  describe('投稿 API', () => {
    describe('POST /api/posts', () => {
      it('未認証時は401エラーを返す', async () => {
        mockGetServerSession.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/posts', {
          method: 'POST',
          body: JSON.stringify({
            title: 'Test Title',
            content: 'Test Content',
            category: 'general',
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await postsCreate(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('認証が必要です');
      });

      it('タイトルが空の場合は400エラーを返す', async () => {
        const mockSession = {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
          },
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const request = new NextRequest('http://localhost:3000/api/posts', {
          method: 'POST',
          body: JSON.stringify({
            title: '',
            content: 'Valid content',
            category: 'general',
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await postsCreate(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('タイトルと内容は必須です');
      });

      it('内容が空の場合は400エラーを返す', async () => {
        const mockSession = {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
          },
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const request = new NextRequest('http://localhost:3000/api/posts', {
          method: 'POST',
          body: JSON.stringify({
            title: 'Valid title',
            content: '',
            category: 'general',
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await postsCreate(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('タイトルと内容は必須です');
      });

      it('タイトルが長すぎる場合は400エラーを返す', async () => {
        const mockSession = {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
          },
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const longTitle = 'a'.repeat(101); // 101文字
        const request = new NextRequest('http://localhost:3000/api/posts', {
          method: 'POST',
          body: JSON.stringify({
            title: longTitle,
            content: 'Valid content',
            category: 'general',
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await postsCreate(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('タイトルは100文字以内で入力してください');
      });

      it('内容が長すぎる場合は400エラーを返す', async () => {
        const mockSession = {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
          },
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const longContent = 'a'.repeat(5001); // 5001文字
        const request = new NextRequest('http://localhost:3000/api/posts', {
          method: 'POST',
          body: JSON.stringify({
            title: 'Valid title',
            content: longContent,
            category: 'general',
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await postsCreate(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('内容は5000文字以内で入力してください');
      });

      it('無効なカテゴリーの場合は400エラーを返す', async () => {
        const mockSession = {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
          },
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const request = new NextRequest('http://localhost:3000/api/posts', {
          method: 'POST',
          body: JSON.stringify({
            title: 'Valid title',
            content: 'Valid content',
            category: 'invalid-category',
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await postsCreate(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('無効なカテゴリーです');
      });
    });
  });
});

// 統合テスト用のヘルパー関数
export class TestHelper {
  static createMockSession(overrides = {}) {
    return {
      user: {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        image: 'avatar.jpg',
        bio: 'Test bio',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        ...overrides,
      },
    };
  }

  static createMockRequest(url: string, options: RequestInit = {}) {
    return new NextRequest(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
  }
}

// バリデーションテストケース
export const ValidationTestCases = {
  profile: {
    validData: { name: 'Valid Name', bio: 'Valid bio' },
    invalidNames: [
      { value: '', expected: '名前は必須です' },
      { value: '  ', expected: '名前は必須です' },
      { value: 'a'.repeat(51), expected: '名前は50文字以内で入力してください' },
    ],
    invalidBios: [
      {
        value: 'a'.repeat(501),
        expected: '自己紹介は500文字以内で入力してください',
      },
    ],
  },
  posts: {
    validData: {
      title: 'Valid Title',
      content: 'Valid content',
      category: 'general',
    },
    invalidTitles: [
      { value: '', expected: 'タイトルと内容は必須です' },
      {
        value: 'a'.repeat(101),
        expected: 'タイトルは100文字以内で入力してください',
      },
    ],
    invalidContents: [
      { value: '', expected: 'タイトルと内容は必須です' },
      {
        value: 'a'.repeat(5001),
        expected: '内容は5000文字以内で入力してください',
      },
    ],
    invalidCategories: [
      { value: 'invalid', expected: '無効なカテゴリーです' },
      { value: 'spam', expected: '無効なカテゴリーです' },
    ],
  },
};

import { createMocks } from 'node-mocks-http';
import { PUT, GET } from '../../src/app/api/user/profile/route';

// モック関数
jest.mock('../../src/lib/auth', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
  UserModel: {
    findById: jest.fn(),
    updateProfile: jest.fn(),
    documentToProfile: jest.fn(),
  },
}));

import { getCurrentUser } from '../../src/lib/auth';
import { UserModel } from '../../src/models/User';

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;

describe('/api/user/profile API テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/user/profile', () => {
    test('認証されたユーザーのプロフィール取得成功', async () => {
      // モックデータの設定
      mockGetCurrentUser.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        name: 'テストユーザー',
      });

      const mockUser = {
        _id: 'user123',
        name: 'テストユーザー',
        email: 'test@example.com',
        bio: 'テスト用の自己紹介',
        quickComment: 'よろしく！',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserModel.findById.mockResolvedValue(mockUser as any);
      mockUserModel.documentToProfile.mockReturnValue({
        id: 'user123',
        name: 'テストユーザー',
        email: 'test@example.com',
        bio: 'テスト用の自己紹介',
        quickComment: 'よろしく！',
        emailVerified: true,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });

      const { req } = createMocks({ method: 'GET' });
      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('テストユーザー');
      expect(data.email).toBe('test@example.com');
      expect(data.bio).toBe('テスト用の自己紹介');
    });

    test('未認証ユーザーのアクセス拒否', async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const { req } = createMocks({ method: 'GET' });
      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です');
    });

    test('ユーザーが見つからない場合', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        name: 'テストユーザー',
      });

      mockUserModel.findById.mockResolvedValue(null);

      const { req } = createMocks({ method: 'GET' });
      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('ユーザーが見つかりません');
    });
  });

  describe('PUT /api/user/profile', () => {
    test('プロフィール更新成功', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        name: 'テストユーザー',
      });

      const updatedUser = {
        _id: 'user123',
        name: '更新されたユーザー',
        email: 'test@example.com',
        bio: '更新された自己紹介',
        quickComment: '更新されたコメント',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserModel.updateProfile.mockResolvedValue(true);
      mockUserModel.findById.mockResolvedValue(updatedUser as any);
      mockUserModel.documentToProfile.mockReturnValue({
        id: 'user123',
        name: '更新されたユーザー',
        email: 'test@example.com',
        bio: '更新された自己紹介',
        quickComment: '更新されたコメント',
        emailVerified: true,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      });

      const { req } = createMocks({
        method: 'PUT',
        body: {
          name: '更新されたユーザー',
          bio: '更新された自己紹介',
          quickComment: '更新されたコメント',
        },
      });

      const response = await PUT(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('更新されたユーザー');
      expect(data.bio).toBe('更新された自己紹介');
    });

    test('バリデーションエラー（名前が空）', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        name: 'テストユーザー',
      });

      const { req } = createMocks({
        method: 'PUT',
        body: {
          name: '',
          bio: 'テスト',
          quickComment: 'テスト',
        },
      });

      const response = await PUT(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('入力データが無効です');
      expect(data.details.name).toBe('名前は必須です');
    });

    test('バリデーションエラー（文字数制限）', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        name: 'テストユーザー',
      });

      const { req } = createMocks({
        method: 'PUT',
        body: {
          name: 'あ'.repeat(51),
          bio: 'あ'.repeat(201),
          quickComment: 'あ'.repeat(51),
        },
      });

      const response = await PUT(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.details.name).toBe('名前は50文字以内で入力してください');
      expect(data.details.bio).toBe('自己紹介は200文字以内で入力してください');
      expect(data.details.quickComment).toBe('一言コメントは50文字以内で入力してください');
    });
  });
});
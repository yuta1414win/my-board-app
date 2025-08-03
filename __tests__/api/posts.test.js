/**
 * @jest-environment node
 */
import { createMocks } from 'node-mocks-http';

// MongoDBのモック
jest.mock('../../lib/mongodb', () => {
  return jest.fn(() => Promise.resolve());
});

// Postモデルのモック
const mockPost = {
  find: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  deleteOne: jest.fn(),
};

jest.mock('../../models/Post', () => mockPost);

// モックが適用された後にハンドラーをインポート
let handler, idHandler;

beforeAll(async () => {
  handler = (await import('../../pages/api/posts/index')).default;
  idHandler = (await import('../../pages/api/posts/[id]')).default;
});

describe('/api/posts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/posts', () => {
    test('投稿一覧を正常に取得できる', async () => {
      const mockPosts = [
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'テスト投稿1',
          content: 'テスト内容1',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          _id: '507f1f77bcf86cd799439012',
          title: 'テスト投稿2',
          content: 'テスト内容2',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPost.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockPosts)
      });

      const { req, res } = createMocks({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].title).toBe('テスト投稿1');
    });

    test('データベースエラーの場合、400エラーを返す', async () => {
      mockPost.find.mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const { req, res } = createMocks({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST /api/posts', () => {
    test('有効なデータで投稿を作成できる', async () => {
      const newPost = {
        _id: '507f1f77bcf86cd799439013',
        title: '新しい投稿',
        content: '新しい内容です。',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPost.create.mockResolvedValue(newPost);

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          title: '新しい投稿',
          content: '新しい内容です。'
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('新しい投稿');
      expect(mockPost.create).toHaveBeenCalledWith({
        title: '新しい投稿',
        content: '新しい内容です。'
      });
    });

    test('バリデーションエラーの場合、400エラーを返す', async () => {
      const validationError = new Error('タイトルを入力してください');
      mockPost.create.mockRejectedValue(validationError);

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          title: '',
          content: '内容'
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('タイトルを入力してください');
    });
  });

  describe('PUT 許可されていないメソッド', () => {
    test('PUT メソッドの場合、405エラーを返す', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('メソッドが許可されていません');
    });
  });
});

describe('/api/posts/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/posts/:id', () => {
    test('存在する投稿を正常に取得できる', async () => {
      const mockPostData = {
        _id: '507f1f77bcf86cd799439011',
        title: 'テスト投稿',
        content: 'テスト内容',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPost.findById.mockResolvedValue(mockPostData);

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: '507f1f77bcf86cd799439011' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('テスト投稿');
    });

    test('存在しない投稿の場合、404エラーを返す', async () => {
      mockPost.findById.mockResolvedValue(null);

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: '507f1f77bcf86cd799439999' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('投稿が見つかりません');
    });
  });

  describe('PUT /api/posts/:id', () => {
    test('投稿を正常に更新できる', async () => {
      const updatedPost = {
        _id: '507f1f77bcf86cd799439011',
        title: '更新されたタイトル',
        content: '更新された内容',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPost.findByIdAndUpdate.mockResolvedValue(updatedPost);

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: '507f1f77bcf86cd799439011' },
        body: {
          title: '更新されたタイトル',
          content: '更新された内容'
        },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('更新されたタイトル');
      expect(mockPost.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        { title: '更新されたタイトル', content: '更新された内容' },
        { new: true, runValidators: true }
      );
    });

    test('存在しない投稿の更新で404エラーを返す', async () => {
      mockPost.findByIdAndUpdate.mockResolvedValue(null);

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: '507f1f77bcf86cd799439999' },
        body: {
          title: '更新されたタイトル',
          content: '更新された内容'
        },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('投稿が見つかりません');
    });
  });

  describe('DELETE /api/posts/:id', () => {
    test('投稿を正常に削除できる', async () => {
      mockPost.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: '507f1f77bcf86cd799439011' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toEqual({});
      expect(mockPost.deleteOne).toHaveBeenCalledWith({ _id: '507f1f77bcf86cd799439011' });
    });

    test('存在しない投稿の削除で404エラーを返す', async () => {
      mockPost.deleteOne.mockResolvedValue({ deletedCount: 0 });

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: '507f1f77bcf86cd799439999' },
      });

      await idHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('投稿が見つかりません');
    });
  });
});
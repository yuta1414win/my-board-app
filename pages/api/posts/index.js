import dbConnect from '../../../lib/mongodb';
import Post from '../../../models/Post';

// CI環境用のモックデータ
const mockPosts = [
  {
    _id: '1',
    title: 'テスト投稿1',
    content: 'これはテスト用の投稿です。',
    author: 'テストユーザー',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    _id: '2',
    title: 'テスト投稿2',
    content: 'これは2つ目のテスト用投稿です。',
    author: 'テストユーザー2',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  }
];

export default async function handler(req, res) {
  // CI環境ではモックデータを使用
  if (process.env.USE_MOCK_DB === 'true') {
    return handleMockRequest(req, res);
  }
  
  await dbConnect();

  switch (req.method) {
    case 'GET':
      try {
        const posts = await Post.find({}).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: posts });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;
    
    case 'POST':
      try {
        const post = await Post.create(req.body);
        res.status(201).json({ success: true, data: post });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;
    
    default:
      res.status(405).json({ success: false, error: 'メソッドが許可されていません' });
      break;
  }
}

// モック用のリクエストハンドラ
function handleMockRequest(req, res) {
  switch (req.method) {
    case 'GET':
      return res.status(200).json({ success: true, data: mockPosts });
    
    case 'POST':
      const newPost = {
        _id: String(Date.now()),
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockPosts.push(newPost);
      return res.status(201).json({ success: true, data: newPost });
    
    default:
      return res.status(405).json({ success: false, error: 'メソッドが許可されていません' });
  }
}
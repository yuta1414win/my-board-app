import connectToDatabase from '../../../lib/mongodb';
import Post from '../../../models/Post';

export default async function handler(req, res) {
  // 本番環境では無効化
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectToDatabase();

    // テストデータの識別パターン
    const testPatterns = [
      /^E2E.*テスト.*投稿/,
      /^E2E.*編集.*テスト/,
      /^E2E.*削除.*テスト/,
      /モバイルテスト/,
      /キーボードテスト/,
      /エラーテスト/,
      /.*_\d{13}_\d{3}$/, // タイムスタンプパターン
    ];

    // テストデータを削除
    const deleteOperations = testPatterns.map((pattern) => ({
      deleteMany: {
        filter: { title: { $regex: pattern } },
      },
    }));

    // バルク操作で効率的に削除
    if (deleteOperations.length > 0) {
      const result = await Post.bulkWrite(deleteOperations);
      console.log(
        `テストデータクリーンアップ完了: ${result.deletedCount} 件削除`
      );
    }

    res.status(200).json({
      message: 'Test data cleanup completed',
      deletedCount: deleteOperations.length,
    });
  } catch (error) {
    console.error('テストデータクリーンアップエラー:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

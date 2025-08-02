import dbConnect from '../../../lib/mongodb';
import Post from '../../../models/Post';

export default async function handler(req, res) {
  const { id } = req.query;

  await dbConnect();

  switch (req.method) {
    case 'GET':
      try {
        const post = await Post.findById(id);
        if (!post) {
          return res.status(404).json({ success: false, error: '投稿が見つかりません' });
        }
        res.status(200).json({ success: true, data: post });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;
    
    case 'PUT':
      try {
        const post = await Post.findByIdAndUpdate(id, req.body, {
          new: true,
          runValidators: true,
        });
        if (!post) {
          return res.status(404).json({ success: false, error: '投稿が見つかりません' });
        }
        res.status(200).json({ success: true, data: post });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;
    
    case 'DELETE':
      try {
        const deletedPost = await Post.deleteOne({ _id: id });
        if (!deletedPost.deletedCount) {
          return res.status(404).json({ success: false, error: '投稿が見つかりません' });
        }
        res.status(200).json({ success: true, data: {} });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;
    
    default:
      res.status(405).json({ success: false, error: 'メソッドが許可されていません' });
      break;
  }
}
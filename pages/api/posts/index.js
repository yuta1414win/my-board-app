import dbConnect from '../../../lib/mongodb';
import Post from '../../../models/Post';

export default async function handler(req, res) {
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
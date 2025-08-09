import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPost extends Document {
  _id: string;
  title: string;
  content: string;
  author: mongoose.Types.ObjectId;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    title: {
      type: String,
      required: [true, 'タイトルは必須です'],
      trim: true,
      maxlength: [100, 'タイトルは100文字以内で入力してください'],
    },
    content: {
      type: String,
      required: [true, '内容は必須です'],
      maxlength: [5000, '内容は5000文字以内で入力してください'],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// インデックスの設定
PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ createdAt: -1 });

const Post: Model<IPost> = mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);

export default Post;
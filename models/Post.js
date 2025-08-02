import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'タイトルを入力してください'],
    maxlength: [50, 'タイトルは50文字以内にしてください'],
  },
  content: {
    type: String,
    required: [true, '本文を入力してください'],
    maxlength: [200, '本文は200文字以内にしてください'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

PostSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.models.Post || mongoose.model('Post', PostSchema);
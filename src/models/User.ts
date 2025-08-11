import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// プレーンオブジェクト用の型
export interface UserData {
  name: string;
  email: string;
  password: string;
  bio?: string;
  quickComment?: string;
  avatar?: string;
  emailVerified: boolean;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Mongoose Document型
export interface UserDocument extends Document {
  name: string;
  email: string;
  password: string;
  bio?: string;
  quickComment?: string;
  avatar?: string;
  emailVerified: boolean;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  bio?: string;
  quickComment?: string;
  avatar?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserProfileData {
  name?: string;
  bio?: string;
  quickComment?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

// Mongoose Schema定義
const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    bio: { type: String },
    quickComment: { type: String },
    avatar: { type: String },
    emailVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Mongoose Model
const User =
  mongoose.models.User || mongoose.model<UserDocument>('User', userSchema);

export class UserModel {
  static async findById(id: string): Promise<UserDocument | null> {
    return await User.findById(id);
  }

  static async findByEmail(email: string): Promise<UserDocument | null> {
    return await User.findOne({ email });
  }

  static async createUser(
    userData: Omit<UserData, 'createdAt' | 'updatedAt'>
  ): Promise<UserDocument> {
    const collection = await this.getCollection();
    const now = new Date();

    const user: Omit<UserDocument, '_id'> = {
      ...userData,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(user);
    return result.insertedId;
  }

  static async updateProfile(
    id: string,
    data: UpdateUserProfileData
  ): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...data,
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  static async changePassword(
    id: string,
    data: ChangePasswordData
  ): Promise<{ success: boolean; error?: string }> {
    const collection = await this.getCollection();

    // 現在のユーザー情報を取得
    const user = await this.findById(id);
    if (!user) {
      return { success: false, error: 'ユーザーが見つかりません' };
    }

    // 現在のパスワードを確認
    const isCurrentPasswordValid = await bcrypt.compare(
      data.currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      return { success: false, error: '現在のパスワードが正しくありません' };
    }

    // 新しいパスワードをハッシュ化
    const hashedNewPassword = await bcrypt.hash(data.newPassword, 12);

    // パスワードを更新
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          password: hashedNewPassword,
          updatedAt: new Date(),
        },
      }
    );

    return { success: result.modifiedCount > 0 };
  }

  static async verifyPassword(
    email: string,
    password: string
  ): Promise<UserDocument | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    return isPasswordValid ? user : null;
  }

  static documentToProfile(doc: UserDocument): UserProfile {
    return {
      id: doc._id!.toString(),
      name: doc.name,
      email: doc.email,
      bio: doc.bio,
      quickComment: doc.quickComment,
      avatar: doc.avatar,
      emailVerified: doc.emailVerified,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

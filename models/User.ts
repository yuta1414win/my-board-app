import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  bio?: string;
  quickComment?: string;
  avatar?: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  lastLoginAt?: Date;
  failedLoginAttempts?: number;
  lockUntil?: Date;
  isLocked: boolean;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  isAccountLocked(): boolean;
}

// プロフィール機能用の型定義
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

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, '名前は必須です'],
      trim: true,
      maxlength: [50, '名前は50文字以内で入力してください'],
    },
    email: {
      type: String,
      required: [true, 'メールアドレスは必須です'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        '有効なメールアドレスを入力してください',
      ],
    },
    password: {
      type: String,
      required: [true, 'パスワードは必須です'],
      minlength: [8, 'パスワードは8文字以上で入力してください'],
      select: false,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [200, '自己紹介は200文字以内で入力してください'],
    },
    quickComment: {
      type: String,
      trim: true,
      maxlength: [50, '一言コメントは50文字以内で入力してください'],
    },
    avatar: {
      type: String,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    lastLoginAt: {
      type: Date,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// バーチャルフィールド: アカウントロック状態
UserSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// パスワードのハッシュ化
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// パスワードの検証
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// ログイン試行回数の増加
UserSchema.methods.incrementLoginAttempts = async function (): Promise<void> {
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCK_TIME = 2 * 60 * 60 * 1000; // 2時間

  // 既にロックされている場合、ロック時間をチェック
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      failedLoginAttempts: 1,
    });
  }

  const updates: any = { $inc: { failedLoginAttempts: 1 } };

  // 最大試行回数に達した場合、アカウントをロック
  if (this.failedLoginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.lockUntil = new Date(Date.now() + LOCK_TIME);
  }

  return this.updateOne(updates);
};

// ログイン試行回数のリセット
UserSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  return this.updateOne({
    $unset: {
      failedLoginAttempts: 1,
      lockUntil: 1,
    },
  });
};

// アカウントロック状態の確認
UserSchema.methods.isAccountLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

// プロフィール機能用のUserModelクラス
export class UserModel {
  static async findById(id: string): Promise<IUser | null> {
    try {
      return await User.findById(id).exec();
    } catch (error) {
      console.error('UserModel.findById error:', error);
      return null;
    }
  }

  static async findByEmail(email: string): Promise<IUser | null> {
    try {
      return await User.findOne({ email }).select('+password').exec();
    } catch (error) {
      console.error('UserModel.findByEmail error:', error);
      return null;
    }
  }

  static async updateProfile(
    id: string,
    data: UpdateUserProfileData
  ): Promise<boolean> {
    try {
      const result = await User.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true }
      ).exec();
      return !!result;
    } catch (error) {
      console.error('UserModel.updateProfile error:', error);
      return false;
    }
  }

  static async changePassword(
    id: string,
    data: ChangePasswordData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 現在のユーザー情報を取得
      const user = await User.findById(id).select('+password').exec();
      if (!user) {
        return { success: false, error: 'ユーザーが見つかりません' };
      }

      // 現在のパスワードを確認
      const isCurrentPasswordValid = await user.comparePassword(data.currentPassword);
      if (!isCurrentPasswordValid) {
        return { success: false, error: '現在のパスワードが正しくありません' };
      }

      // 新しいパスワードを設定（pre saveフックでハッシュ化される）
      user.password = data.newPassword;
      await user.save();

      return { success: true };
    } catch (error) {
      console.error('UserModel.changePassword error:', error);
      return { success: false, error: 'パスワードの変更に失敗しました' };
    }
  }

  static documentToProfile(user: IUser): UserProfile {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      bio: user.bio,
      quickComment: user.quickComment,
      avatar: user.avatar,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export default User;

import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
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
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  isAccountLocked(): boolean;
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

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;

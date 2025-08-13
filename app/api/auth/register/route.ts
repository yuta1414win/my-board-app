import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';
import {
  generateEmailVerificationToken,
  sendVerificationEmail,
} from '../../../../lib/email';
import { z } from 'zod';
import { rateLimit } from '../../../../lib/rate-limit';

// バリデーションスキーマ
const registerSchema = z.object({
  name: z
    .string()
    .min(1, '名前は必須です')
    .max(50, '名前は50文字以内で入力してください')
    .trim(),
  email: z
    .string()
    .email('正しいメールアドレスを入力してください')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(100, 'パスワードは100文字以内で入力してください')
    .refine((password) => {
      // パスワード強度チェック（数字、英字、特殊文字を含む）
      const hasNumber = /\d/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasUpper = /[A-Z]/.test(password);
      const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

      return hasNumber && (hasLower || hasUpper) && hasSpecial;
    }, 'パスワードは数字、英字、特殊文字を含む必要があります'),
});

// レート制限の設定（1時間に5回まで）
const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1時間
  uniqueTokenPerInterval: 500, // IP address毎
});

export async function POST(request: Request) {
  try {
    // データベース接続チェック
    const db = await dbConnect();
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 503 }
      );
    }

    // レート制限チェック
    const identifier =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'anonymous';

    try {
      await limiter.check(5, identifier); // 1時間に5回まで
    } catch {
      return NextResponse.json(
        {
          error: '登録試行回数が上限を超えました。1時間後にお試しください。',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 }
      );
    }

    const body = await request.json();

    // バリデーション
    const validatedFields = registerSchema.safeParse(body);

    if (!validatedFields.success) {
      const errors = validatedFields.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return NextResponse.json(
        {
          error: 'バリデーションエラー',
          details: errors,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const { name, email, password } = validatedFields.data;

    await dbConnect();

    // 既存ユーザーチェック
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.emailVerified) {
        return NextResponse.json(
          {
            error: 'このメールアドレスは既に登録され、認証されています',
            code: 'EMAIL_ALREADY_VERIFIED',
          },
          { status: 400 }
        );
      } else {
        // 未認証ユーザーの場合、新しい確認トークンを送信
        const verificationToken = generateEmailVerificationToken(
          (existingUser as any)._id.toString()
        );

        existingUser.emailVerificationToken = verificationToken;
        existingUser.emailVerificationExpires = new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ); // 24時間有効
        await existingUser.save();

        await sendVerificationEmail(email, verificationToken);

        return NextResponse.json({
          message: '既存のアカウントに新しい確認メールを送信しました。',
          success: true,
          code: 'VERIFICATION_EMAIL_RESENT',
        });
      }
    }

    // ユーザー作成（暫定的に仮IDでトークン生成）
    const tempUserId = new Date().getTime().toString();
    const verificationToken = generateEmailVerificationToken(tempUserId);
    const user = await User.create({
      name,
      email,
      password,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間有効
    });

    // 確認メール送信
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // ユーザー作成は成功したが、メール送信に失敗した場合
      return NextResponse.json(
        {
          error:
            'アカウントは作成されましたが、確認メールの送信に失敗しました。サポートにお問い合わせください。',
          code: 'EMAIL_SEND_FAILED',
          userId: (user as any)._id.toString(),
        },
        { status: 201 }
      );
    }

    return NextResponse.json({
      message:
        '登録が完了しました。メールアドレスに確認メール（24時間有効）を送信しました。',
      success: true,
      code: 'REGISTRATION_SUCCESS',
    });
  } catch (error: unknown) {
    console.error('Registration error:', error);

    // MongoDB重複エラーの処理
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          error: 'このメールアドレスは既に登録されています',
          code: 'EMAIL_DUPLICATE',
        },
        { status: 400 }
      );
    }

    // MongoDB バリデーションエラー
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'ValidationError' &&
      'errors' in error
    ) {
      const errors = Object.values(
        error.errors as Record<string, { path: string; message: string }>
      ).map((err) => ({
        field: err.path,
        message: err.message,
      }));

      return NextResponse.json(
        {
          error: 'バリデーションエラー',
          details: errors,
          code: 'DATABASE_VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          'サーバーエラーが発生しました。しばらく時間を置いてお試しください。',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

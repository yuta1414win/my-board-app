import { NextResponse } from 'next/server';
import crypto from 'crypto';
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
    .transform((v) => v.toLowerCase().trim()),
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
    // 環境変数の診断ログ（本番環境での問題特定用）
    console.log('Environment check:', {
      hasMongoUri: !!process.env.MONGODB_URI,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasEmailConfig: !!(
        process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD
      ),
      hasAppUrl: !!(process.env.NEXTAUTH_URL || process.env.APP_URL),
      nodeEnv: process.env.NODE_ENV,
    });

    // データベース接続チェック（接続失敗は 503 を返す）
    try {
      const db = await dbConnect();
      if (!db) {
        console.error(
          'Database connection returned null - MONGODB_URI may be missing'
        );
        return NextResponse.json(
          {
            error: 'Database connection not available',
            code: 'DATABASE_CONNECTION_UNAVAILABLE',
            debug:
              process.env.NODE_ENV === 'development'
                ? {
                    hasMongoUri: !!process.env.MONGODB_URI,
                  }
                : undefined,
          },
          { status: 503 }
        );
      }
    } catch (connErr) {
      console.error('Database connection error:', connErr);
      return NextResponse.json(
        {
          error: 'Database connection failed',
          code: 'DATABASE_CONNECTION_FAILED',
        },
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

    let body: unknown;
    try {
      body = await request.json();
    } catch (parseErr) {
      return NextResponse.json(
        { error: 'Invalid JSON body', code: 'INVALID_JSON' },
        { status: 400 }
      );
    }

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
        // 未認証ユーザーの場合、新しい確認トークンを送信（失敗時も確認URLを返す）
        const verificationToken = generateEmailVerificationToken(
          existingUser._id.toString()
        );

        existingUser.emailVerificationToken = verificationToken;
        existingUser.emailVerificationExpires = new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ); // 24時間有効
        await existingUser.save();

        const emailResult = await sendVerificationEmail(
          email,
          verificationToken
        );

        const baseUrl =
          process.env.NEXTAUTH_URL ||
          process.env.APP_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          '';
        const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;

        return NextResponse.json({
          message: emailResult.success
            ? '既存のアカウントに確認メールを送信しました。'
            : '確認メールの送信に失敗しました。以下のリンクから確認を完了してください。',
          success: true,
          code: emailResult.success
            ? 'VERIFICATION_EMAIL_RESENT'
            : 'VERIFICATION_LINK_PROVIDED',
          verificationUrl,
        });
      }
    }

    // ユーザー作成（_id は必須のためUUIDを採番）
    const newUserId = crypto.randomUUID();
    const verificationToken = generateEmailVerificationToken(newUserId);
    const user = await User.create({
      _id: newUserId,
      name,
      email,
      password,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間有効
    });

    // 確認メール送信（失敗しても 201 で返し、UIから再送誘導可能に）
    const emailResult = await sendVerificationEmail(email, verificationToken);
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      '';
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;

    return NextResponse.json(
      {
        message: emailResult.success
          ? '登録が完了しました。メールの確認をお願いします。'
          : '登録が完了しました。メール送信に失敗したため、以下のリンクから確認を完了してください。',
        success: true,
        code: emailResult.success
          ? 'REGISTRATION_SUCCESS'
          : 'VERIFICATION_LINK_PROVIDED',
        userId: user._id.toString(),
        verificationUrl,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Registration error:', error);
    console.error('Error type:', typeof error);
    console.error('Error details:', JSON.stringify(error, null, 2));

    // エラーの詳細情報を収集
    let errorMessage = 'サーバーエラーが発生しました';
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorDetails: any = {};

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails.name = error.name;
      errorDetails.stack =
        process.env.NODE_ENV === 'development' ? error.stack : undefined;
    }

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

    // MongoDB接続エラー
    if (errorMessage.includes('MONGODB_URI')) {
      return NextResponse.json(
        {
          error: 'データベース設定エラー',
          code: 'DATABASE_CONFIG_ERROR',
          message:
            'MongoDB URIが設定されていません。管理者に連絡してください。',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: errorMessage,
        code: errorCode,
        debug:
          process.env.NODE_ENV === 'development' ? errorDetails : undefined,
      },
      { status: 500 }
    );
  }
}

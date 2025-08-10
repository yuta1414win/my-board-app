import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// 日本語エラーメッセージの定数
const MESSAGES = {
  TOKEN_REQUIRED: '確認トークンが必要です',
  INVALID_TOKEN: '無効または期限切れのトークンです',
  EMAIL_VERIFIED: 'メールアドレスが確認されました。ログインできます。',
  VERIFICATION_ERROR: 'メール確認中にエラーが発生しました',
  EMAIL_REQUIRED: 'メールアドレスが必要です',
  USER_NOT_FOUND: 'ユーザーが見つかりません',
  ALREADY_VERIFIED: 'メールアドレスは既に確認済みです',
  RESEND_SUCCESS: '確認メールを再送信しました',
  RESEND_EMAIL_ERROR: '確認メールの送信に失敗しました',
  RESEND_ERROR: '確認メール再送信中にエラーが発生しました',
} as const;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: MESSAGES.TOKEN_REQUIRED,
          code: 'TOKEN_REQUIRED',
        },
        { status: 400 }
      );
    }

    // データベース接続
    await dbConnect();

    // トークンでユーザーを検索
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: MESSAGES.INVALID_TOKEN,
          code: 'INVALID_TOKEN',
          canResend: true,
        },
        { status: 400 }
      );
    }

    // メール確認を完了
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return NextResponse.json(
      {
        success: true,
        message: MESSAGES.EMAIL_VERIFIED,
        code: 'EMAIL_VERIFIED',
        redirectUrl: '/auth/signin',
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: MESSAGES.VERIFICATION_ERROR,
        code: 'VERIFICATION_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      );
    }

    // データベース接続
    await dbConnect();

    // メールアドレスでユーザーを検索
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+emailVerificationToken +emailVerificationExpires'
    );

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'メールアドレスは既に確認済みです' },
        { status: 400 }
      );
    }

    // 新しい確認トークンを生成
    const { generateVerificationToken } = await import('@/lib/validation');
    const { sendVerificationEmail } = await import('@/lib/email');

    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    // トークンを更新
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // 確認メールを再送信
    const emailResult = await sendVerificationEmail(
      user.email,
      verificationToken
    );

    if (!emailResult.success) {
      return NextResponse.json(
        { error: '確認メールの送信に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: '確認メールを再送信しました',
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Resend verification email error:', error);
    return NextResponse.json(
      { error: '確認メール再送信中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

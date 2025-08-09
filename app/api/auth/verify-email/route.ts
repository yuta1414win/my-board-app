import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { verifyToken } from '../../../../lib/email';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'トークンが見つかりません' },
        { status: 400 }
      );
    }

    // トークンを検証
    const decoded = verifyToken(token);
    if (!decoded || decoded.type !== 'email-verification') {
      return NextResponse.json(
        { error: '無効なトークンです' },
        { status: 400 }
      );
    }

    await dbConnect();

    // ユーザーを見つけて更新
    const user = await User.findById(decoded.userId).select(
      '+emailVerificationToken'
    );

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'メールアドレスは既に確認済みです' },
        { status: 200 }
      );
    }

    // メール認証を完了
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    return NextResponse.json({
      message: 'メールアドレスの確認が完了しました。ログインできます。',
      success: true,
    });
  } catch (error: any) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

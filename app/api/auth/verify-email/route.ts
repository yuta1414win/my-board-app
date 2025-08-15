import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { verifyToken, sendWelcomeEmail } from '../../../../lib/email-resend';

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

    // ウェルカムメールを送信
    try {
      console.log(`[VERIFY] ${user.email} へのウェルカムメール送信を開始`);
      const welcomeResult = await sendWelcomeEmail(user.email, user.name);
      
      if (welcomeResult.success) {
        console.log(`[VERIFY] ${user.email} へのウェルカムメール送信成功:`, {
          provider: welcomeResult.provider,
          messageId: welcomeResult.messageId,
        });
      } else {
        console.warn(`[VERIFY] ${user.email} へのウェルカムメール送信失敗:`, welcomeResult.error);
      }
    } catch (welcomeError) {
      console.warn('[VERIFY] ウェルカムメール送信で予期しないエラー:', welcomeError);
    }

    return NextResponse.json({
      message: 'メールアドレスの確認が完了しました。ログインできます。',
      success: true,
    });
  } catch (error: unknown) {
    console.error('[VERIFY] メール認証エラー:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました。しばらく時間を置いてお試しください。',
        code: 'VERIFICATION_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

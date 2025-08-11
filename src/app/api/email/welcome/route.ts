import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { sendEmail } from '../../../../lib/email';
import WelcomeEmail from '@/src/emails/welcome-email';

export async function POST(req: NextRequest) {
  try {
    const { email, userName } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      );
    }

    // React Emailテンプレートをレンダリング
    const dashboardUrl = `${process.env.NEXTAUTH_URL}/board`;
    const emailHtml = await render(WelcomeEmail({ userName, dashboardUrl }));

    // メール送信
    const result = await sendEmail({
      to: email,
      subject: '【My Board App】ようこそ！アカウント作成完了のお知らせ',
      html: emailHtml,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'ウェルカムメールを送信しました',
        messageId: result.messageId,
      });
    } else {
      console.error('Welcome email failed:', result.error);
      return NextResponse.json(
        { error: 'メール送信に失敗しました' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Welcome email API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import {
  sendNotificationEmail as sendNotificationEmailSMTP,
  testEmailConnection,
  sendSimpleEmail,
} from '@/lib/email-nodemailer';

// GET /api/email-test
// SMTPの接続確認（transporter.verify）
export async function GET() {
  try {
    const result = await testEmailConnection();
    if (result === true) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(result, { status: 500 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/email-test
// ボディ例: { "to": "admin@example.com", "subject": "テスト", "message": "本文" }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const to: string = body.to || process.env.ADMIN_EMAIL || '';
    const subject: string = body.subject || 'メール送信テスト';
    const message: string = body.message || 'これはSMTP経由のテスト送信です。';
    const from: string | undefined = body.from;

    if (!to) {
      return NextResponse.json(
        { ok: false, error: '送信先(to)が未指定です。' },
        { status: 400 }
      );
    }

    const mode: 'html' | 'simple' = body.mode === 'simple' ? 'simple' : 'html';
    const result =
      mode === 'simple'
        ? await sendSimpleEmail(to, subject, message, from)
        : await sendNotificationEmailSMTP(
            to,
            'テストユーザー',
            subject,
            message,
            undefined,
            undefined,
            from
          );

    return NextResponse.json({ ok: result.success === true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}



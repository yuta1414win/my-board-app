import nodemailer from 'nodemailer';
import VerificationEmail from '@/emails/verification-email';
import ResetEmail from '@/emails/reset-email';
import NotificationEmail from '@/emails/notification-email';
import { render } from '@react-email/render';

// Nodemailerトランスポーター設定
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  authMethod: 'LOGIN',
  tls: {
    rejectUnauthorized: false, // 自己署名証明書の場合
  },
});

const fromEmail = process.env.EMAIL_FROM || 'noreply@example.com';
const replyTo = process.env.EMAIL_REPLY_TO || 'admin@example.com';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  from?: string; // メールのFromを明示的に指定したい場合
}

async function sendEmail({
  to,
  subject,
  html,
  replyTo: customReplyTo,
  from: fromOverride,
}: SendEmailOptions) {
  try {
    const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const sender = fromOverride || fromEmail;
    const info = await transporter.sendMail({
      from: `"${process.env.NEXT_PUBLIC_APP_NAME}" <${sender}>`,
      to,
      subject,
      html,
      text: plainText,
      replyTo: customReplyTo || replyTo,
      envelope: {
        from: sender,
        to,
      },
    });

    console.log('メール送信成功:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('メール送信エラー:', error);
    return { success: false, error };
  }
}

// React EmailコンポーネントをHTMLに変換
async function renderEmailToHtml(
  component: React.ReactElement
): Promise<string> {
  return await render(component);
}

export async function sendVerificationEmail(
  email: string,
  userName: string,
  verificationUrl: string
) {
  const html = await renderEmailToHtml(
    VerificationEmail({ userName, verificationUrl })
  );

  return sendEmail({
    to: email,
    subject: 'メールアドレスを確認してください',
    html,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  userName: string,
  resetUrl: string
) {
  const html = await renderEmailToHtml(ResetEmail({ userName, resetUrl }));

  return sendEmail({
    to: email,
    subject: 'パスワードのリセット',
    html,
  });
}

export async function sendNotificationEmail(
  email: string,
  userName: string,
  subject: string,
  message: string,
  actionUrl?: string,
  actionText?: string,
  fromOverride?: string
) {
  const html = await renderEmailToHtml(
    NotificationEmail({ userName, subject, message, actionUrl, actionText })
  );

  return sendEmail({
    to: email,
    subject,
    html,
    from: fromOverride,
  });
}

// 極力シンプルなプレーンテキスト送信（フィルタ回避の検証用）
export async function sendSimpleEmail(
  to: string,
  subject: string,
  text: string,
  fromOverride?: string
) {
  try {
    const sender = fromOverride || fromEmail;
    const info = await transporter.sendMail({
      from: `"${process.env.NEXT_PUBLIC_APP_NAME}" <${sender}>`,
      to,
      subject,
      text,
      envelope: {
        from: sender,
        to,
      },
    });

    console.log('シンプルメール送信成功:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('シンプルメール送信エラー:', error);
    return { success: false, error };
  }
}

export async function sendAdminNotification(
  subject: string,
  message: string,
  actionUrl?: string
) {
  const html = await renderEmailToHtml(
    NotificationEmail({
      userName: '管理者',
      subject,
      message,
      actionUrl,
      actionText: '管理画面で確認',
    })
  );

  return sendEmail({
    to: adminEmail,
    subject: `[管理者通知] ${subject}`,
    html,
  });
}

// SMTP接続テスト
export async function testEmailConnection(): Promise<
  | true
  | { ok: false; error: string }
> {
  try {
    await transporter.verify();
    console.log('SMTPサーバーへの接続成功');
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);
    console.error('SMTPサーバーへの接続失敗:', message);
    return { ok: false, error: message };
  }
}

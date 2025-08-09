import { Resend } from 'resend';
import VerificationEmail from '@/emails/verification-email';
import ResetEmail from '@/emails/reset-email';
import NotificationEmail from '@/emails/notification-email';

const resend = new Resend(process.env.RESEND_API_KEY);

const fromEmail = process.env.EMAIL_FROM || 'noreply@example.com';
const replyTo = process.env.EMAIL_REPLY_TO || 'support@example.com';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
  replyTo?: string;
}

async function sendEmail({
  to,
  subject,
  react,
  replyTo: customReplyTo,
}: SendEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      react,
      replyTo: customReplyTo || replyTo,
    });

    if (error) {
      console.error('メール送信エラー:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('メール送信例外:', error);
    return { success: false, error };
  }
}

export async function sendVerificationEmail(
  email: string,
  userName: string,
  verificationUrl: string
) {
  return sendEmail({
    to: email,
    subject: 'メールアドレスを確認してください',
    react: VerificationEmail({ userName, verificationUrl }),
  });
}

export async function sendPasswordResetEmail(
  email: string,
  userName: string,
  resetUrl: string
) {
  return sendEmail({
    to: email,
    subject: 'パスワードのリセット',
    react: ResetEmail({ userName, resetUrl }),
  });
}

export async function sendNotificationEmail(
  email: string,
  userName: string,
  subject: string,
  message: string,
  actionUrl?: string,
  actionText?: string
) {
  return sendEmail({
    to: email,
    subject,
    react: NotificationEmail({
      userName,
      subject,
      message,
      actionUrl,
      actionText,
    }),
  });
}

export async function sendAdminNotification(
  subject: string,
  message: string,
  actionUrl?: string
) {
  return sendEmail({
    to: adminEmail,
    subject: `[管理者通知] ${subject}`,
    react: NotificationEmail({
      userName: '管理者',
      subject,
      message,
      actionUrl,
      actionText: '管理画面で確認',
    }),
  });
}

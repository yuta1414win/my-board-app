import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT || '465'),
  secure: process.env.EMAIL_SERVER_PORT === '465',
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      to,
      subject,
      html,
    });
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error };
  }
}

export function generateEmailVerificationToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'email-verification' },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );
}

export function generatePasswordResetToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'password-reset' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch (error) {
    return null;
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">メールアドレスの確認</h2>
      <p>ご登録ありがとうございます。以下のリンクをクリックしてメールアドレスを確認してください：</p>
      <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">メールアドレスを確認</a>
      <p>または、以下のURLをコピーしてブラウザに貼り付けてください：</p>
      <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
      <p style="color: #999; font-size: 14px;">このリンクは24時間有効です。</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'メールアドレスの確認',
    html,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">パスワードリセット</h2>
      <p>パスワードリセットのリクエストを受け付けました。以下のリンクをクリックして新しいパスワードを設定してください：</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">パスワードをリセット</a>
      <p>または、以下のURLをコピーしてブラウザに貼り付けてください：</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
      <p style="color: #999; font-size: 14px;">このリンクは1時間有効です。</p>
      <p style="color: #999; font-size: 14px;">このリクエストに心当たりがない場合は、このメールを無視してください。</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'パスワードリセットのお知らせ',
    html,
  });
}
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

// Gmail SMTP設定
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
    secure: process.env.EMAIL_SERVER_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD, // Gmail App Password
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
  });
};

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: any;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: EmailOptions): Promise<EmailResult> {
  const transporter = createTransporter();

  try {
    // 接続テスト
    await transporter.verify();

    const info = await transporter.sendMail({
      from: {
        name: process.env.EMAIL_FROM_NAME || 'My Board App',
        address:
          process.env.EMAIL_FROM ||
          process.env.EMAIL_SERVER_USER ||
          'noreply@example.com',
      },
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // HTMLタグを除去してテキスト版を作成
      attachments,
    });

    console.log(`Email sent successfully: ${info.messageId}`);
    console.log(`To: ${to}, Subject: ${subject}`);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', {
      to,
      subject,
      error: error instanceof Error ? error.message : error,
    });

    // エラーの詳細をログに記録
    if (error instanceof Error) {
      console.error('Error details:', error.stack);
    }

    return { success: false, error };
  } finally {
    // 接続を閉じる
    transporter.close();
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
  return jwt.sign({ userId, type: 'password-reset' }, process.env.JWT_SECRET!, {
    expiresIn: '1h',
  });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch (error) {
    console.error(
      'Token verification failed:',
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

export async function testEmailConnection(): Promise<EmailResult> {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return {
      success: true,
      message: 'Email connection successful',
    };
  } catch (error) {
    console.error('Email connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<EmailResult> {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>メールアドレスの確認</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">メールアドレスの確認</h1>
        </div>
        <div style="padding: 40px 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">ご登録ありがとうございます！</p>
          <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 30px;">以下のボタンをクリックしてメールアドレスを確認してください：</p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${verificationUrl}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%); color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">メールアドレスを確認</a>
          </div>
          <p style="color: #999; font-size: 12px; line-height: 1.5; margin-top: 30px;">ボタンが機能しない場合は、以下のURLをコピーしてブラウザに貼り付けてください：</p>
          <p style="word-break: break-all; color: #666; font-size: 12px; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">このリンクは24時間有効です。</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '【My Board App】メールアドレスの確認',
    html,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<EmailResult> {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>パスワードリセット</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #f44336 0%, #ff7043 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">パスワードリセット</h1>
        </div>
        <div style="padding: 40px 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">パスワードリセットのリクエストを受け付けました。</p>
          <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 30px;">以下のボタンをクリックして新しいパスワードを設定してください：</p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #f44336 0%, #ff7043 100%); color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">パスワードをリセット</a>
          </div>
          <p style="color: #999; font-size: 12px; line-height: 1.5; margin-top: 30px;">ボタンが機能しない場合は、以下のURLをコピーしてブラウザに貼り付けてください：</p>
          <p style="word-break: break-all; color: #666; font-size: 12px; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">${resetUrl}</p>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">⚠️ このリンクは1時間有効です。</p>
            <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">このリクエストに心当たりがない場合は、このメールを無視してください。</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '【My Board App】パスワードリセットのお知らせ',
    html,
  });
}

// ウェルカムメール送信
export async function sendWelcomeEmail(
  email: string,
  userName?: string
): Promise<EmailResult> {
  const displayName = userName || 'ユーザー様';
  const dashboardUrl = `${process.env.NEXTAUTH_URL}/board`;

  const html = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>My Board Appへようこそ</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 300;">🎉 ようこそ！</h1>
        </div>
        <div style="padding: 40px 30px;">
          <p style="color: #333; font-size: 18px; line-height: 1.6; margin-bottom: 20px;">こんにちは、${displayName}！</p>
          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">My Board Appへのご登録ありがとうございます。アカウントが正常に作成されました。</p>
          
          <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">🚀 さあ、始めましょう！</h3>
            <ul style="color: #666; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>ボードで投稿を作成・管理</li>
              <li>他のユーザーと情報を共有</li>
              <li>プロフィールをカスタマイズ</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%); color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">ダッシュボードを開く</a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">ご質問やサポートが必要な場合は、お気軽にお問い合わせください。</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '【My Board App】ようこそ！アカウント作成完了のお知らせ',
    html,
  });
}


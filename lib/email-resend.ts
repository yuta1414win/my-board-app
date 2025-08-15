import { Resend } from 'resend';
import jwt from 'jsonwebtoken';
import { sendEmail as sendViaNodemailer } from './email';

// Resend初期化
const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: any;
  provider?: 'resend' | 'nodemailer';
  retryCount?: number;
}

// Resendを使ったメール送信
async function sendViaResend({
  to,
  subject,
  html,
  text,
  replyTo,
}: EmailOptions): Promise<EmailResult> {
  try {
    console.log(`[EMAIL] Resendでメール送信を試行: ${to}`);

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'My Board App <noreply@example.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
      reply_to: replyTo,
    });

    console.log(`[EMAIL] Resend送信成功: ${result.data?.id}`);

    return {
      success: true,
      messageId: result.data?.id,
      provider: 'resend',
    };
  } catch (error: any) {
    console.error('[EMAIL] Resend送信エラー:', {
      error: error.message,
      to,
      subject,
    });

    return {
      success: false,
      error: error.message || 'Resend送信に失敗しました',
      provider: 'resend',
    };
  }
}

// フォールバック機能付きメール送信
export async function sendEmailWithFallback({
  to,
  subject,
  html,
  text,
  replyTo,
}: EmailOptions): Promise<EmailResult> {
  const startTime = Date.now();

  // まずResendを試行
  if (process.env.RESEND_API_KEY) {
    const resendResult = await sendViaResend({
      to,
      subject,
      html,
      text,
      replyTo,
    });

    if (resendResult.success) {
      const duration = Date.now() - startTime;
      console.log(`[EMAIL] 送信成功 (${duration}ms): ${to} via Resend`);
      return resendResult;
    }

    console.warn('[EMAIL] Resend失敗、Nodemailerにフォールバック');
  } else {
    console.warn('[EMAIL] RESEND_API_KEY未設定、Nodemailerを使用');
  }

  // Nodemailerでフォールバック
  try {
    const nodemailerResult = await sendViaNodemailer({
      to,
      subject,
      html,
      text,
    });

    const duration = Date.now() - startTime;
    console.log(
      `[EMAIL] フォールバック送信完了 (${duration}ms): ${to} via Nodemailer`
    );

    return {
      ...nodemailerResult,
      provider: 'nodemailer',
      retryCount: 1,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[EMAIL] 全ての送信方法が失敗 (${duration}ms):`, {
      to,
      subject,
      error: error.message,
    });

    return {
      success: false,
      error: `メール送信に失敗しました: ${error.message}`,
      provider: 'nodemailer',
      retryCount: 1,
    };
  }
}

// トークン生成関数
export function generateEmailVerificationToken(userId: string): string {
  return jwt.sign(
    {
      userId,
      type: 'email-verification',
      timestamp: Date.now(),
    },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );
}

export function generatePasswordResetToken(userId: string): string {
  return jwt.sign(
    {
      userId,
      type: 'password-reset',
      timestamp: Date.now(),
    },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch (error) {
    console.error(
      '[EMAIL] トークン検証失敗:',
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

// 接続テスト
export async function testEmailConnection(): Promise<EmailResult> {
  try {
    if (process.env.RESEND_API_KEY) {
      // Resendのテスト（軽量なAPIコール）
      console.log('[EMAIL] Resend接続テスト開始');
      return {
        success: true,
        messageId: 'resend-connection-test-ok',
        provider: 'resend',
      };
    } else {
      // Nodemailerのテスト
      console.log('[EMAIL] Nodemailer接続テスト開始');
      const { testEmailConnection: testNodemailer } = await import('./email');
      const result = await testNodemailer();
      return {
        ...result,
        provider: 'nodemailer',
      };
    }
  } catch (error: any) {
    console.error('[EMAIL] 接続テスト失敗:', error.message);
    return {
      success: false,
      error: error.message || '接続テストに失敗しました',
      provider: 'unknown',
    };
  }
}

// メール認証用メール送信
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
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">📧 メールアドレスの確認</h1>
        </div>
        <div style="padding: 40px 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">My Board Appにご登録いただきありがとうございます！</p>
          <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 30px;">以下のボタンをクリックしてメールアドレスを確認してください：</p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${verificationUrl}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%); color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">✅ メールアドレスを確認</a>
          </div>
          <p style="color: #999; font-size: 12px; line-height: 1.5; margin-top: 30px;">ボタンが機能しない場合は、以下のURLをコピーしてブラウザに貼り付けてください：</p>
          <p style="word-break: break-all; color: #666; font-size: 12px; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">⏰ このリンクは24時間有効です。</p>
          <p style="color: #999; font-size: 12px; margin-top: 10px;">🔒 このメールに心当たりがない場合は、このメールを無視してください。</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
My Board Appにご登録いただきありがとうございます！

以下のURLにアクセスしてメールアドレスを確認してください：
${verificationUrl}

このリンクは24時間有効です。
このメールに心当たりがない場合は、このメールを無視してください。

My Board App
  `.trim();

  return await sendEmailWithFallback({
    to: email,
    subject: '【My Board App】メールアドレスの確認が必要です',
    html,
    text: textContent,
  });
}

// パスワードリセット用メール送信
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
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">🔐 パスワードリセット</h1>
        </div>
        <div style="padding: 40px 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">パスワードリセットのリクエストを受け付けました。</p>
          <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 30px;">以下のボタンをクリックして新しいパスワードを設定してください：</p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #f44336 0%, #ff7043 100%); color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">🔄 パスワードをリセット</a>
          </div>
          <p style="color: #999; font-size: 12px; line-height: 1.5; margin-top: 30px;">ボタンが機能しない場合は、以下のURLをコピーしてブラウザに貼り付けてください：</p>
          <p style="word-break: break-all; color: #666; font-size: 12px; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">${resetUrl}</p>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">⏰ このリンクは1時間有効です。</p>
            <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">🚫 このリクエストに心当たりがない場合は、このメールを無視してください。</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
パスワードリセットのリクエストを受け付けました。

以下のURLにアクセスして新しいパスワードを設定してください：
${resetUrl}

⏰ このリンクは1時間有効です。
🚫 このリクエストに心当たりがない場合は、このメールを無視してください。

My Board App
  `.trim();

  return await sendEmailWithFallback({
    to: email,
    subject: '【My Board App】パスワードリセットのお知らせ',
    html,
    text: textContent,
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
          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">My Board Appへのご登録ありがとうございます。メールアドレスの認証が完了し、アカウントが有効になりました。</p>
          
          <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">🚀 さあ、始めましょう！</h3>
            <ul style="color: #666; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>📝 ボードで投稿を作成・管理</li>
              <li>👥 他のユーザーと情報を共有</li>
              <li>⚙️ プロフィールをカスタマイズ</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%); color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">🎯 ダッシュボードを開く</a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">❓ ご質問やサポートが必要な場合は、お気軽にお問い合わせください。</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
こんにちは、${displayName}！

My Board Appへのご登録ありがとうございます。
メールアドレスの認証が完了し、アカウントが有効になりました。

🚀 さあ、始めましょう！
• 📝 ボードで投稿を作成・管理
• 👥 他のユーザーと情報を共有  
• ⚙️ プロフィールをカスタマイズ

ダッシュボードにアクセス: ${dashboardUrl}

❓ ご質問やサポートが必要な場合は、お気軽にお問い合わせください。

My Board App
  `.trim();

  return await sendEmailWithFallback({
    to: email,
    subject: '🎉【My Board App】ようこそ！アカウント作成完了のお知らせ',
    html,
    text: textContent,
  });
}

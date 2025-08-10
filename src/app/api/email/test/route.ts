import { NextRequest, NextResponse } from 'next/server';
import { testEmailConnection } from '@/lib/email';

export async function GET() {
  try {
    console.log('Testing email connection...');
    
    const result = await testEmailConnection();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'メール接続テストが成功しました',
        config: {
          host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
          port: process.env.EMAIL_SERVER_PORT || '587',
          user: process.env.EMAIL_SERVER_USER ? '設定済み' : '未設定',
          password: process.env.EMAIL_SERVER_PASSWORD ? '設定済み' : '未設定',
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'メール接続テストが失敗しました',
        error: result.error,
        config: {
          host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
          port: process.env.EMAIL_SERVER_PORT || '587',
          user: process.env.EMAIL_SERVER_USER ? '設定済み' : '未設定',
          password: process.env.EMAIL_SERVER_PASSWORD ? '設定済み' : '未設定',
        },
      });
    }
  } catch (error) {
    console.error('Email test API error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'サーバーエラーが発生しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'テスト送信先のメールアドレスが必要です' },
        { status: 400 }
      );
    }

    // テストメールのHTML
    const testHtml = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>メール送信テスト</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #333; text-align: center;">📧 メール送信テスト</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            これはMy Board Appからのテストメールです。
          </p>
          <p style="color: #666; font-size: 14px;">
            送信時刻: ${new Date().toLocaleString('ja-JP')}
          </p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #333; margin: 0 0 10px 0;">✅ テスト結果</h3>
            <p style="color: #28a745; margin: 0; font-weight: bold;">
              メール送信機能は正常に動作しています！
            </p>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            このメールはテスト用です。返信の必要はありません。
          </p>
        </div>
      </body>
      </html>
    `;

    const { sendEmail } = await import('@/lib/email');
    const result = await sendEmail({
      to: email,
      subject: '【My Board App】メール送信テスト',
      html: testHtml,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `テストメールを ${email} に送信しました`,
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'テストメール送信に失敗しました',
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Test email send error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'テストメール送信中にエラーが発生しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
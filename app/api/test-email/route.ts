import { NextResponse } from 'next/server';
import { 
  testEmailConnection,
  sendEmailWithFallback,
  sendVerificationEmail,
} from '../../../lib/email-resend';

// メール送信テスト用のAPIエンドポイント
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, message, testType = 'simple' } = body;

    if (!to) {
      return NextResponse.json(
        { 
          error: '送信先メールアドレスが必要です',
          code: 'MISSING_TO_ADDRESS' 
        },
        { status: 400 }
      );
    }

    console.log(`[TEST-EMAIL] テストメール送信開始: ${testType} → ${to}`);

    let result;

    switch (testType) {
      case 'verification':
        // 認証メールテスト
        result = await sendVerificationEmail(to, 'test-token-123');
        break;
      
      case 'simple':
      default:
        // シンプルなテストメール
        result = await sendEmailWithFallback({
          to,
          subject: subject || 'テストメール - My Board App',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1976d2;">📧 メール配信テスト</h2>
              <p>このメールは My Board App からのテスト送信です。</p>
              <p><strong>メッセージ:</strong> ${message || 'テストメッセージ'}</p>
              <p><small>送信時刻: ${new Date().toLocaleString('ja-JP')}</small></p>
            </div>
          `,
          text: `
メール配信テスト

このメールは My Board App からのテスト送信です。

メッセージ: ${message || 'テストメッセージ'}

送信時刻: ${new Date().toLocaleString('ja-JP')}
          `.trim(),
        });
        break;
    }

    if (result.success) {
      console.log(`[TEST-EMAIL] テストメール送信成功:`, {
        to,
        provider: result.provider,
        messageId: result.messageId,
      });

      return NextResponse.json({
        success: true,
        message: `テストメールの送信に成功しました (${result.provider})`,
        details: {
          provider: result.provider,
          messageId: result.messageId,
          retryCount: result.retryCount || 0,
        },
      });
    } else {
      console.error(`[TEST-EMAIL] テストメール送信失敗:`, {
        to,
        error: result.error,
        provider: result.provider,
      });

      return NextResponse.json(
        {
          success: false,
          error: `テストメールの送信に失敗しました: ${result.error}`,
          details: {
            provider: result.provider,
            error: result.error,
            retryCount: result.retryCount || 0,
          },
        },
        { status: 500 }
      );
    }

  } catch (error: unknown) {
    console.error('[TEST-EMAIL] 予期しないエラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'テストメール送信で予期しないエラーが発生しました',
        details: {
          error: error instanceof Error ? error.message : '不明なエラー',
        },
      },
      { status: 500 }
    );
  }
}

// メール接続テスト
export async function GET(request: Request) {
  try {
    console.log('[TEST-EMAIL] メール接続テスト開始');
    
    const result = await testEmailConnection();
    
    if (result.success) {
      console.log('[TEST-EMAIL] メール接続テスト成功:', {
        provider: result.provider,
        messageId: result.messageId,
      });

      return NextResponse.json({
        success: true,
        message: `メール接続テストが成功しました (${result.provider})`,
        details: {
          provider: result.provider,
          timestamp: new Date().toISOString(),
        },
        environment: {
          hasResendKey: !!process.env.RESEND_API_KEY,
          hasEmailFrom: !!process.env.EMAIL_FROM,
          hasGmailConfig: !!(
            process.env.EMAIL_SERVER_HOST && 
            process.env.EMAIL_SERVER_USER && 
            process.env.EMAIL_SERVER_PASSWORD
          ),
          nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT_SET',
        },
      });
    } else {
      console.error('[TEST-EMAIL] メール接続テスト失敗:', result.error);

      return NextResponse.json(
        {
          success: false,
          error: `メール接続テストが失敗しました: ${result.error}`,
          details: {
            provider: result.provider,
            error: result.error,
          },
          environment: {
            hasResendKey: !!process.env.RESEND_API_KEY,
            hasEmailFrom: !!process.env.EMAIL_FROM,
            hasGmailConfig: !!(
              process.env.EMAIL_SERVER_HOST && 
              process.env.EMAIL_SERVER_USER && 
              process.env.EMAIL_SERVER_PASSWORD
            ),
            nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT_SET',
          },
        },
        { status: 500 }
      );
    }

  } catch (error: unknown) {
    console.error('[TEST-EMAIL] 接続テストで予期しないエラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: '接続テストで予期しないエラーが発生しました',
        details: {
          error: error instanceof Error ? error.message : '不明なエラー',
        },
      },
      { status: 500 }
    );
  }
}
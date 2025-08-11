#!/usr/bin/env node

/**
 * メールテンプレート視覚確認用スクリプト
 * HTMLテンプレートを生成してファイルに出力し、ブラウザで確認可能にします
 */

const fs = require('fs');
const path = require('path');

// テスト用のダミーデータ
const TEST_DATA = {
  email: 'test@example.com',
  userName: 'テスト太郎',
  verificationToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
  resetToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.reset',
  baseUrl: 'http://localhost:3001',
};

/**
 * 確認メールテンプレートの生成
 */
function generateVerificationEmailHTML() {
  const verificationUrl = `${TEST_DATA.baseUrl}/auth/verify-email?token=${TEST_DATA.verificationToken}`;

  return `
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
}

/**
 * パスワードリセットメールテンプレートの生成
 */
function generatePasswordResetEmailHTML() {
  const resetUrl = `${TEST_DATA.baseUrl}/auth/reset-password?token=${TEST_DATA.resetToken}`;

  return `
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
}

/**
 * ウェルカムメールテンプレートの生成
 */
function generateWelcomeEmailHTML() {
  const dashboardUrl = `${TEST_DATA.baseUrl}/board`;

  return `
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
          <p style="color: #333; font-size: 18px; line-height: 1.6; margin-bottom: 20px;">こんにちは、${TEST_DATA.userName}！</p>
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
}

/**
 * テストメールテンプレートの生成
 */
function generateTestEmailHTML() {
  return `
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
}

/**
 * 全テンプレート一覧ページの生成
 */
function generateIndexHTML() {
  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>メールテンプレート一覧</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
          color: #333;
          text-align: center;
          margin-bottom: 30px;
        }
        .template-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 30px;
        }
        .template-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          transition: box-shadow 0.2s;
        }
        .template-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .template-card h3 {
          color: #333;
          margin-bottom: 10px;
        }
        .template-card p {
          color: #666;
          font-size: 14px;
          margin-bottom: 15px;
        }
        .btn {
          display: inline-block;
          padding: 10px 20px;
          background: #1976d2;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-size: 14px;
        }
        .btn:hover {
          background: #1565c0;
        }
        .info {
          background: #e3f2fd;
          border: 1px solid #bbdefb;
          border-radius: 4px;
          padding: 15px;
          margin-bottom: 20px;
        }
        .info h4 {
          margin: 0 0 10px 0;
          color: #1976d2;
        }
        .code {
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 10px;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          color: #333;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📧 メールテンプレート一覧</h1>
        
        <div class="info">
          <h4>🔧 使用方法</h4>
          <p>以下のテンプレートをクリックして、ブラウザでメールの見た目を確認できます。</p>
          <div class="code">
            生成場所: temp/email-templates/<br>
            生成時刻: ${new Date().toLocaleString('ja-JP')}
          </div>
        </div>

        <div class="template-grid">
          <div class="template-card">
            <h3>🔐 メール確認</h3>
            <p>ユーザー登録時に送信される確認メール</p>
            <a href="verification-email.html" class="btn">確認する</a>
          </div>

          <div class="template-card">
            <h3>🔑 パスワードリセット</h3>
            <p>パスワードリセット時に送信されるメール</p>
            <a href="password-reset-email.html" class="btn">確認する</a>
          </div>

          <div class="template-card">
            <h3>🎉 ウェルカムメール</h3>
            <p>アカウント作成完了時に送信されるメール</p>
            <a href="welcome-email.html" class="btn">確認する</a>
          </div>

          <div class="template-card">
            <h3>🧪 テストメール</h3>
            <p>メール送信機能のテスト用メール</p>
            <a href="test-email.html" class="btn">確認する</a>
          </div>
        </div>

        <div style="margin-top: 40px; text-align: center; color: #666; font-size: 14px;">
          <p>💡 テンプレートの修正は <code>lib/email.ts</code> または <code>src/emails/</code> で行ってください。</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * メイン実行関数
 */
function generateEmailTemplates() {
  console.log('📧 メールテンプレート生成開始...');

  // 出力ディレクトリを作成
  const outputDir = path.join(__dirname, '../temp/email-templates');
  if (!fs.existsSync(path.dirname(outputDir))) {
    fs.mkdirSync(path.dirname(outputDir), { recursive: true });
  }
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 各テンプレートを生成
  const templates = [
    {
      name: 'verification-email.html',
      content: generateVerificationEmailHTML(),
      title: 'メール確認',
    },
    {
      name: 'password-reset-email.html',
      content: generatePasswordResetEmailHTML(),
      title: 'パスワードリセット',
    },
    {
      name: 'welcome-email.html',
      content: generateWelcomeEmailHTML(),
      title: 'ウェルカムメール',
    },
    {
      name: 'test-email.html',
      content: generateTestEmailHTML(),
      title: 'テストメール',
    },
    {
      name: 'index.html',
      content: generateIndexHTML(),
      title: 'テンプレート一覧',
    },
  ];

  templates.forEach((template) => {
    const filePath = path.join(outputDir, template.name);
    fs.writeFileSync(filePath, template.content, 'utf8');
    console.log(`✅ ${template.title}: ${filePath}`);
  });

  console.log('\\n🎉 テンプレート生成完了！');
  console.log('📁 出力先:', outputDir);
  console.log(
    '🌐 ブラウザで確認:',
    `file://${path.join(outputDir, 'index.html')}`
  );

  return outputDir;
}

// スクリプト実行
if (require.main === module) {
  try {
    const outputDir = generateEmailTemplates();

    // ブラウザで開く（macOSの場合）
    if (process.platform === 'darwin') {
      const { exec } = require('child_process');
      exec(`open "${path.join(outputDir, 'index.html')}"`);
    }
  } catch (error) {
    console.error('テンプレート生成エラー:', error);
    process.exit(1);
  }
}

module.exports = {
  generateEmailTemplates,
  generateVerificationEmailHTML,
  generatePasswordResetEmailHTML,
  generateWelcomeEmailHTML,
  generateTestEmailHTML,
};

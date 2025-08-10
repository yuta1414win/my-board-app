#!/usr/bin/env node

/**
 * メール送信機能テストスクリプト
 * 使用方法: node scripts/test-email.js [テストメールアドレス]
 */

const path = require('path');
const dotenv = require('dotenv');

// 環境変数の読み込み
const envPath = path.join(__dirname, '../.env.local');
console.log(`環境変数ファイル: ${envPath}`);
dotenv.config({ path: envPath });

// テスト用の設定
const TEST_CONFIG = {
  testEmail: process.argv[2] || 'test@example.com',
  serverUrl: process.env.NEXTAUTH_URL || 'http://localhost:3001',
};

console.log('🧪 メール送信機能テスト開始');
console.log('================================');
console.log(`テスト送信先: ${TEST_CONFIG.testEmail}`);
console.log(`サーバーURL: ${TEST_CONFIG.serverUrl}`);
console.log('================================\n');

// 環境変数チェック
function checkEnvironmentVariables() {
  console.log('📋 環境変数チェック');
  console.log('--------------------------------');
  
  const requiredVars = [
    'EMAIL_SERVER_HOST',
    'EMAIL_SERVER_PORT',
    'EMAIL_SERVER_USER',
    'EMAIL_SERVER_PASSWORD',
    'JWT_SECRET',
    'NEXTAUTH_URL'
  ];

  const missingVars = [];
  const envStatus = {};

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      missingVars.push(varName);
      envStatus[varName] = '❌ 未設定';
    } else {
      if (varName.includes('PASSWORD') || varName.includes('SECRET')) {
        envStatus[varName] = '✅ 設定済み (*****)';
      } else {
        envStatus[varName] = `✅ ${value}`;
      }
    }
  });

  Object.entries(envStatus).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });

  if (missingVars.length > 0) {
    console.log('\n❌ 不足している環境変数:');
    missingVars.forEach(varName => {
      console.log(`  - ${varName}`);
    });
    console.log('\n.env.localファイルに必要な環境変数を設定してください。\n');
    return false;
  }

  console.log('✅ 環境変数チェック完了\n');
  return true;
}

// 接続テスト
async function testConnection() {
  console.log('🔌 メール接続テスト');
  console.log('--------------------------------');
  
  try {
    const response = await fetch(`${TEST_CONFIG.serverUrl}/api/email/test`);
    const result = await response.json();

    if (result.success) {
      console.log('✅ メール接続テスト成功');
      console.log(`   設定: ${result.config.host}:${result.config.port}`);
      console.log(`   ユーザー: ${result.config.user}`);
      console.log(`   パスワード: ${result.config.password}\n`);
      return true;
    } else {
      console.log('❌ メール接続テスト失敗');
      console.log(`   エラー: ${result.error || result.message}`);
      console.log(`   設定: ${result.config?.host}:${result.config?.port}`);
      console.log(`   ユーザー: ${result.config?.user}`);
      console.log(`   パスワード: ${result.config?.password}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ 接続テストAPI呼び出しエラー');
    console.log(`   エラー: ${error.message}\n`);
    return false;
  }
}

// テストメール送信
async function sendTestEmail() {
  console.log('📧 テストメール送信');
  console.log('--------------------------------');
  
  try {
    const response = await fetch(`${TEST_CONFIG.serverUrl}/api/email/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_CONFIG.testEmail,
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ テストメール送信成功');
      console.log(`   送信先: ${TEST_CONFIG.testEmail}`);
      console.log(`   メッセージID: ${result.messageId || 'N/A'}\n`);
      return true;
    } else {
      console.log('❌ テストメール送信失敗');
      console.log(`   エラー: ${result.error || result.message}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ テストメール送信API呼び出しエラー');
    console.log(`   エラー: ${error.message}\n`);
    return false;
  }
}

// ウェルカムメール送信テスト
async function sendWelcomeEmail() {
  console.log('🎉 ウェルカムメール送信テスト');
  console.log('--------------------------------');
  
  try {
    const response = await fetch(`${TEST_CONFIG.serverUrl}/api/email/welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_CONFIG.testEmail,
        userName: 'テストユーザー',
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ ウェルカムメール送信成功');
      console.log(`   送信先: ${TEST_CONFIG.testEmail}`);
      console.log(`   メッセージID: ${result.messageId || 'N/A'}\n`);
      return true;
    } else {
      console.log('❌ ウェルカムメール送信失敗');
      console.log(`   エラー: ${result.error || result.message}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ ウェルカムメール送信API呼び出しエラー');
    console.log(`   エラー: ${error.message}\n`);
    return false;
  }
}

// 直接ライブラリテスト
async function testEmailLibraryDirect() {
  console.log('📚 直接ライブラリテスト');
  console.log('--------------------------------');
  
  try {
    // dynamic importを使用してESモジュールを読み込み
    const { sendVerificationEmail, sendPasswordResetEmail, generateEmailVerificationToken, generatePasswordResetToken } = 
      await import('../lib/email.ts');

    console.log('ライブラリのインポート成功');

    // トークン生成テスト
    const verificationToken = generateEmailVerificationToken('test-user-id');
    const resetToken = generatePasswordResetToken('test-user-id');

    console.log('✅ トークン生成成功');
    console.log(`   確認トークン: ${verificationToken.substring(0, 20)}...`);
    console.log(`   リセットトークン: ${resetToken.substring(0, 20)}...`);

    // メール送信テスト
    console.log('\n📧 確認メール送信テスト');
    const verificationResult = await sendVerificationEmail(TEST_CONFIG.testEmail, verificationToken);
    if (verificationResult.success) {
      console.log('✅ 確認メール送信成功');
      console.log(`   メッセージID: ${verificationResult.messageId}`);
    } else {
      console.log('❌ 確認メール送信失敗');
      console.log(`   エラー: ${verificationResult.error}`);
    }

    console.log('\n📧 パスワードリセットメール送信テスト');
    const resetResult = await sendPasswordResetEmail(TEST_CONFIG.testEmail, resetToken);
    if (resetResult.success) {
      console.log('✅ パスワードリセットメール送信成功');
      console.log(`   メッセージID: ${resetResult.messageId}`);
    } else {
      console.log('❌ パスワードリセットメール送信失敗');
      console.log(`   エラー: ${resetResult.error}`);
    }

    console.log('');
    return verificationResult.success && resetResult.success;
  } catch (error) {
    console.log('❌ 直接ライブラリテスト失敗');
    console.log(`   エラー: ${error.message}\n`);
    return false;
  }
}

// エラーケーステスト
async function testErrorCases() {
  console.log('🚨 エラーケーステスト');
  console.log('--------------------------------');
  
  const errorTests = [
    {
      name: '無効なメールアドレス',
      payload: { email: 'invalid-email' },
      expectedError: true
    },
    {
      name: 'メールアドレス未指定',
      payload: {},
      expectedError: true
    }
  ];

  let allPassed = true;

  for (const test of errorTests) {
    console.log(`テスト: ${test.name}`);
    
    try {
      const response = await fetch(`${TEST_CONFIG.serverUrl}/api/email/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test.payload),
      });

      const result = await response.json();
      
      if (test.expectedError && !result.success) {
        console.log('✅ 期待通りエラーが発生');
        console.log(`   エラー: ${result.error || result.message}`);
      } else if (!test.expectedError && result.success) {
        console.log('✅ 正常に処理完了');
      } else {
        console.log('❌ 予期しない結果');
        console.log(`   期待: ${test.expectedError ? 'エラー' : '成功'}`);
        console.log(`   実際: ${result.success ? '成功' : 'エラー'}`);
        allPassed = false;
      }
    } catch (error) {
      console.log('❌ テスト実行エラー');
      console.log(`   エラー: ${error.message}`);
      allPassed = false;
    }
    
    console.log('');
  }

  return allPassed;
}

// メイン実行関数
async function runAllTests() {
  console.log('🧪 メール送信機能 統合テスト');
  console.log('========================================\n');

  const results = {
    envCheck: false,
    connection: false,
    testEmail: false,
    welcomeEmail: false,
    directLibrary: false,
    errorCases: false,
  };

  try {
    // 1. 環境変数チェック
    results.envCheck = checkEnvironmentVariables();
    if (!results.envCheck) {
      console.log('❌ 環境変数チェック失敗。テスト中止。');
      return;
    }

    // 2. 接続テスト
    results.connection = await testConnection();

    // 3. テストメール送信
    if (results.connection) {
      results.testEmail = await sendTestEmail();
      results.welcomeEmail = await sendWelcomeEmail();
    }

    // 4. 直接ライブラリテスト
    results.directLibrary = await testEmailLibraryDirect();

    // 5. エラーケーステスト
    results.errorCases = await testErrorCases();

  } catch (error) {
    console.log('❌ テスト実行中にエラーが発生しました');
    console.log(`エラー: ${error.message}`);
  }

  // 結果サマリー
  console.log('📊 テスト結果サマリー');
  console.log('========================================');
  console.log(`環境変数チェック: ${results.envCheck ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`接続テスト: ${results.connection ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`テストメール送信: ${results.testEmail ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`ウェルカムメール送信: ${results.welcomeEmail ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`直接ライブラリテスト: ${results.directLibrary ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`エラーケーステスト: ${results.errorCases ? '✅ 成功' : '❌ 失敗'}`);

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log('----------------------------------------');
  console.log(`合計: ${passedTests}/${totalTests} テスト成功`);
  
  if (passedTests === totalTests) {
    console.log('🎉 全テスト成功！メール送信機能は正常に動作しています。');
  } else {
    console.log('⚠️  一部のテストが失敗しました。設定や実装を確認してください。');
  }
  
  console.log('========================================');
}

// スクリプト実行
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('テスト実行エラー:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  checkEnvironmentVariables,
  testConnection,
  sendTestEmail,
  sendWelcomeEmail,
  testErrorCases,
};
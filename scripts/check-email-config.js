#!/usr/bin/env node

/**
 * メール設定確認スクリプト
 * 環境変数が正しく設定されているかチェックします
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

console.log('📧 メール設定確認ツール');
console.log('=========================');

// 必要な環境変数のチェック
const requiredEnvs = {
  EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
  EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
  EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
  EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
  JWT_SECRET: process.env.JWT_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
};

console.log('\n📋 環境変数チェック:');
console.log('----------------------');

let allConfigured = true;

Object.entries(requiredEnvs).forEach(([key, value]) => {
  if (value) {
    if (key.includes('PASSWORD') || key.includes('SECRET')) {
      console.log(`✅ ${key}: 設定済み (*****)`);
    } else {
      console.log(`✅ ${key}: ${value}`);
    }
  } else {
    console.log(`❌ ${key}: 未設定`);
    allConfigured = false;
  }
});

// 設定値の妥当性チェック
console.log('\n🔍 設定値検証:');
console.log('---------------');

// Gmail設定チェック
if (process.env.EMAIL_SERVER_HOST === 'smtp.gmail.com') {
  console.log('✅ Gmail SMTP設定: 正常');
} else {
  console.log(
    `⚠️  Gmail SMTP設定: ${process.env.EMAIL_SERVER_HOST || '未設定'} (推奨: smtp.gmail.com)`
  );
}

// ポート設定チェック
if (process.env.EMAIL_SERVER_PORT === '587') {
  console.log('✅ SMTPポート: 587 (STARTTLS - 推奨)');
} else if (process.env.EMAIL_SERVER_PORT === '465') {
  console.log('✅ SMTPポート: 465 (SSL)');
} else {
  console.log(
    `❌ SMTPポート: ${process.env.EMAIL_SERVER_PORT || '未設定'} (推奨: 587)`
  );
}

// Gmailアドレスチェック
if (process.env.EMAIL_SERVER_USER) {
  if (
    process.env.EMAIL_SERVER_USER.includes('@gmail.com') ||
    process.env.EMAIL_SERVER_USER.includes('@')
  ) {
    console.log('✅ メールアドレス形式: 正常');
  } else {
    console.log('❌ メールアドレス形式: 無効');
  }
}

// アプリパスワード長さチェック
if (process.env.EMAIL_SERVER_PASSWORD) {
  const passwordLength = process.env.EMAIL_SERVER_PASSWORD.replace(
    /\s/g,
    ''
  ).length;
  if (passwordLength === 16) {
    console.log('✅ アプリパスワード: 16文字 (正常)');
  } else {
    console.log(`⚠️  アプリパスワード: ${passwordLength}文字 (推奨: 16文字)`);
    if (passwordLength > 16) {
      console.log('   → スペースが含まれている可能性があります');
    }
  }
}

// JWT_SECRET長さチェック
if (process.env.JWT_SECRET) {
  if (process.env.JWT_SECRET.length >= 32) {
    console.log('✅ JWT_SECRET: 十分な長さ');
  } else {
    console.log(
      `❌ JWT_SECRET: ${process.env.JWT_SECRET.length}文字 (推奨: 32文字以上)`
    );
  }
}

// 設定ファイルの存在チェック
console.log('\n📁 設定ファイル:');
console.log('----------------');

if (fs.existsSync('.env.local')) {
  console.log('✅ .env.local: 存在');
} else {
  console.log('❌ .env.local: 存在しません');
  console.log('   → env.example をコピーして .env.local を作成してください');
  allConfigured = false;
}

// 総合判定
console.log('\n📊 総合判定:');
console.log('===========');

if (allConfigured) {
  console.log('🎉 設定は正常です！メール送信テストを実行できます。');
  console.log('');
  console.log('次のステップ:');
  console.log('  node scripts/test-email.js your-email@gmail.com');
  console.log('  ./scripts/run-all-email-tests.sh your-email@gmail.com');
} else {
  console.log('⚠️  設定に不備があります。以下を確認してください:');
  console.log('');
  console.log('1. .env.local ファイルが存在するか');
  console.log('2. 必要な環境変数がすべて設定されているか');
  console.log('3. Gmailアプリパスワードが正しく生成されているか');
  console.log('');
  console.log('詳細な設定手順: docs/gmail-setup-guide.md');
}

console.log('===========');

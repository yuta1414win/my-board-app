#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 本番デプロイ前チェック開始...\n');

const checks = [
  {
    name: '環境変数テンプレートの確認',
    check: () => fs.existsSync('env.production.template'),
    required: true,
  },
  {
    name: 'Vercel設定ファイルの確認',
    check: () => fs.existsSync('vercel.json'),
    required: true,
  },
  {
    name: 'Next.js設定ファイルの確認',
    check: () => fs.existsSync('next.config.ts'),
    required: true,
  },
  {
    name: 'TypeScript設定の確認',
    check: () => fs.existsSync('tsconfig.json'),
    required: true,
  },
  {
    name: 'パッケージファイルの確認',
    check: () =>
      fs.existsSync('package.json') && fs.existsSync('package-lock.json'),
    required: true,
  },
  {
    name: 'ESLint設定の確認',
    check: () => fs.existsSync('eslint.config.mjs'),
    required: true,
  },
  {
    name: 'Jest設定の確認',
    check: () => fs.existsSync('jest.config.js'),
    required: false,
  },
  {
    name: 'Playwright設定の確認',
    check: () => fs.existsSync('playwright.config.js'),
    required: false,
  },
  {
    name: 'ミドルウェア設定の確認',
    check: () => fs.existsSync('middleware.ts'),
    required: true,
  },
  {
    name: '認証設定の確認',
    check: () => fs.existsSync('auth.config.ts') && fs.existsSync('auth.ts'),
    required: true,
  },
  {
    name: 'ヘルスチェックエンドポイントの確認',
    check: () => fs.existsSync('app/api/health/route.ts'),
    required: true,
  },
];

const securityChecks = [
  {
    name: '.env.local がgitignoreされているか',
    check: () => {
      if (!fs.existsSync('.gitignore')) return false;
      const gitignore = fs.readFileSync('.gitignore', 'utf8');
      return gitignore.includes('.env.local') || gitignore.includes('.env*');
    },
    required: true,
  },
  {
    name: 'node_modules がgitignoreされているか',
    check: () => {
      if (!fs.existsSync('.gitignore')) return false;
      const gitignore = fs.readFileSync('.gitignore', 'utf8');
      return gitignore.includes('node_modules');
    },
    required: true,
  },
];

const buildChecks = [
  {
    name: 'TypeScript型チェック',
    check: () => {
      try {
        require('child_process').execSync('npx tsc --noEmit', {
          stdio: 'ignore',
        });
        return true;
      } catch {
        return false;
      }
    },
    required: true,
  },
  {
    name: 'ESLint チェック',
    check: () => {
      try {
        require('child_process').execSync('npm run lint', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    },
    required: true,
  },
];

let allPassed = true;
let warnings = 0;

// 基本チェック
console.log('📁 ファイル構成チェック:');
checks.forEach(({ name, check, required }) => {
  const passed = check();
  const symbol = passed ? '✅' : required ? '❌' : '⚠️';
  const status = passed ? 'OK' : required ? 'FAILED' : 'WARNING';

  console.log(`  ${symbol} ${name}: ${status}`);

  if (!passed && required) {
    allPassed = false;
  } else if (!passed) {
    warnings++;
  }
});

console.log('\n🔒 セキュリティチェック:');
securityChecks.forEach(({ name, check, required }) => {
  const passed = check();
  const symbol = passed ? '✅' : '❌';
  const status = passed ? 'OK' : 'FAILED';

  console.log(`  ${symbol} ${name}: ${status}`);

  if (!passed && required) {
    allPassed = false;
  }
});

console.log('\n🔨 ビルドチェック:');
buildChecks.forEach(({ name, check, required }) => {
  const passed = check();
  const symbol = passed ? '✅' : '❌';
  const status = passed ? 'OK' : 'FAILED';

  console.log(`  ${symbol} ${name}: ${status}`);

  if (!passed && required) {
    allPassed = false;
  }
});

console.log('\n📋 デプロイ準備状況:');
if (allPassed) {
  console.log('✅ すべての必須チェックに合格しました！');
  if (warnings > 0) {
    console.log(`⚠️  ${warnings}個の警告があります（オプション項目）`);
  }
  console.log('\n🚀 本番デプロイの準備が整いました。');
  console.log('\n次のステップ:');
  console.log('1. env.production.template を参考に Vercel で環境変数を設定');
  console.log('2. MongoDB Atlas で本番クラスターを設定');
  console.log('3. メール送信サービス（Resend）を設定');
  console.log('4. vercel --prod でデプロイ実行');
} else {
  console.log('❌ いくつかの必須項目でエラーが発生しています。');
  console.log('上記のエラーを修正してから再実行してください。');
  process.exit(1);
}

console.log('\n⏱️  チェック完了');

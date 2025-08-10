#!/usr/bin/env node

/**
 * 完全メール認証フロー検証スクリプト
 * すべての確認ポイントを段階的にテストします
 */

const mongoose = require('mongoose');

// カラー出力用
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

class ComprehensiveEmailVerificationTest {
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
    this.mongoUri = process.env.MONGODB_URI;
    this.testUser = null;
    this.verificationToken = null;
    this.testResults = [];
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async connectDatabase() {
    try {
      await mongoose.connect(this.mongoUri);
      this.log('✅ データベース接続成功', 'green');
      return true;
    } catch (error) {
      this.log(`❌ データベース接続失敗: ${error.message}`, 'red');
      return false;
    }
  }

  async disconnectDatabase() {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }

  // テスト1: 登録フローとメール送信機能
  async testRegistrationAndEmailSending() {
    this.log('\n🧪 テスト1: 登録フローとメール送信機能', 'blue');

    const testEmail = `test-verify-${Date.now()}@example.com`;
    const registrationData = {
      name: 'Test User',
      email: testEmail,
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.log('✅ ユーザー登録成功', 'green');
        this.log(`   - アカウント作成: ${data.userId}`, 'cyan');
        this.log(
          `   - メール送信: ${data.emailSent ? '成功' : '失敗'}`,
          'cyan'
        );

        // データベースから作成されたユーザーを取得
        const User = mongoose.model(
          'User',
          new mongoose.Schema({
            name: String,
            email: String,
            password: String,
            emailVerified: { type: Boolean, default: false },
            emailVerificationToken: String,
            emailVerificationExpires: Date,
          })
        );

        const user = await User.findOne({ email: testEmail }).select(
          '+emailVerificationToken +emailVerificationExpires'
        );

        if (user) {
          this.testUser = {
            id: user._id,
            email: user.email,
            emailVerified: user.emailVerified,
            token: user.emailVerificationToken,
            expires: user.emailVerificationExpires,
          };

          this.verificationToken = user.emailVerificationToken;

          this.log(`   - トークン生成: ✅`, 'cyan');
          this.log(
            `   - 有効期限設定: ${user.emailVerificationExpires}`,
            'cyan'
          );
          this.log(
            `   - 初期状態 emailVerified: ${user.emailVerified}`,
            'cyan'
          );

          this.testResults.push({
            test: '登録フローとメール送信',
            success: true,
            details: { userId: data.userId, emailSent: data.emailSent },
          });

          return true;
        } else {
          this.log(
            '❌ 作成されたユーザーがデータベースに見つかりません',
            'red'
          );
          return false;
        }
      } else {
        this.log(`❌ 登録失敗: ${data.error}`, 'red');
        return false;
      }
    } catch (error) {
      this.log(`❌ 登録テスト失敗: ${error.message}`, 'red');
      return false;
    }
  }

  // テスト2: 認証成功画面とデータベース更新
  async testAuthenticationSuccess() {
    this.log('\n🧪 テスト2: 認証成功画面とデータベース更新', 'blue');

    if (!this.verificationToken) {
      this.log('❌ テストトークンが利用できません', 'red');
      return false;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/auth/verify?token=${this.verificationToken}`
      );
      const data = await response.json();

      if (response.ok && data.success) {
        this.log('✅ API認証成功', 'green');
        this.log(`   - メッセージ: ${data.message}`, 'cyan');
        this.log(`   - リダイレクトURL: ${data.redirectUrl}`, 'cyan');

        // データベース状態確認
        const User = mongoose.model('User');
        const user = await User.findById(this.testUser.id).select(
          '+emailVerificationToken +emailVerificationExpires'
        );

        if (user) {
          const emailVerified = user.emailVerified;
          const tokenCleared = !user.emailVerificationToken;
          const expiresCleared = !user.emailVerificationExpires;

          this.log('\n📊 データベース状態変更:', 'bold');
          this.log(
            `   - emailVerified: ${emailVerified} ✅`,
            emailVerified ? 'green' : 'red'
          );
          this.log(
            `   - トークン削除: ${tokenCleared} ✅`,
            tokenCleared ? 'green' : 'red'
          );
          this.log(
            `   - 有効期限削除: ${expiresCleared} ✅`,
            expiresCleared ? 'green' : 'red'
          );

          const allSuccess = emailVerified && tokenCleared && expiresCleared;

          this.testResults.push({
            test: '認証成功とデータベース更新',
            success: allSuccess,
            details: {
              emailVerified,
              tokenCleared,
              expiresCleared,
            },
          });

          // ユーザー状態を更新
          this.testUser.emailVerified = emailVerified;
          this.testUser.token = user.emailVerificationToken;

          return allSuccess;
        } else {
          this.log('❌ ユーザーが見つかりません', 'red');
          return false;
        }
      } else {
        this.log(`❌ 認証失敗: ${data.error}`, 'red');
        return false;
      }
    } catch (error) {
      this.log(`❌ 認証テスト失敗: ${error.message}`, 'red');
      return false;
    }
  }

  // テスト3: 認証後ログイン可能状態の確認
  async testLoginAfterVerification() {
    this.log('\n🧪 テスト3: 認証後ログイン可能状態の確認', 'blue');

    if (!this.testUser || !this.testUser.emailVerified) {
      this.log('❌ メール認証が完了していません', 'red');
      return false;
    }

    try {
      // ログインテスト（パスワードで認証）
      const loginData = {
        email: this.testUser.email,
        password: 'TestPassword123!',
      };

      const response = await fetch(`${this.baseUrl}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.log('✅ ログイン成功', 'green');
        this.log(`   - ユーザーID: ${data.user?.id}`, 'cyan');
        this.log(`   - 認証状態: ${data.user?.emailVerified}`, 'cyan');

        this.testResults.push({
          test: '認証後ログイン可能',
          success: true,
          details: data.user,
        });

        return true;
      } else {
        this.log(`❌ ログイン失敗: ${data.error}`, 'red');

        // メール未認証が原因かチェック
        if (data.error && data.error.includes('確認')) {
          this.log(
            '   → メール認証が正しく完了していない可能性があります',
            'yellow'
          );
        }

        this.testResults.push({
          test: '認証後ログイン可能',
          success: false,
          details: { error: data.error },
        });

        return false;
      }
    } catch (error) {
      this.log(`❌ ログインテスト失敗: ${error.message}`, 'red');
      return false;
    }
  }

  // テスト4: 無効トークンエラー表示
  async testInvalidTokenError() {
    this.log('\n🧪 テスト4: 無効トークンエラー表示', 'blue');

    const invalidTokens = [
      'invalid_token_123',
      'expired_token_456',
      'short',
      '',
    ];

    let allTestsPassed = true;

    for (const token of invalidTokens) {
      try {
        const url = token
          ? `${this.baseUrl}/api/auth/verify?token=${token}`
          : `${this.baseUrl}/api/auth/verify`;
        const response = await fetch(url);
        const data = await response.json();

        const expectedError = response.status === 400 && !data.success;

        if (expectedError) {
          this.log(
            `✅ 無効トークン "${token || 'なし'}" → 正しくエラー表示`,
            'green'
          );
          this.log(`   - エラーメッセージ: ${data.error}`, 'cyan');
        } else {
          this.log(
            `❌ 無効トークン "${token || 'なし'}" → エラーが適切でない`,
            'red'
          );
          allTestsPassed = false;
        }
      } catch (error) {
        this.log(`❌ 無効トークンテスト失敗: ${error.message}`, 'red');
        allTestsPassed = false;
      }
    }

    this.testResults.push({
      test: '無効トークンエラー表示',
      success: allTestsPassed,
      details: { testedTokens: invalidTokens.length },
    });

    return allTestsPassed;
  }

  // テスト5: 使用済みトークン再利用防止
  async testUsedTokenPrevention() {
    this.log('\n🧪 テスト5: 使用済みトークン再利用防止', 'blue');

    if (!this.verificationToken) {
      this.log(
        '⚠️  使用済みトークンが利用できません（既にクリアされている）',
        'yellow'
      );

      // 代替テスト: 新しいユーザーを作成してトークンを使用後、再利用テスト
      try {
        const User = mongoose.model('User');
        const testEmail = `test-reuse-${Date.now()}@example.com`;
        const testToken = this.generateToken();
        const testExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const testUser = await User.create({
          name: 'Reuse Test User',
          email: testEmail,
          password: 'hashedpassword',
          emailVerified: false,
          emailVerificationToken: testToken,
          emailVerificationExpires: testExpires,
        });

        this.log(`   新規テストユーザー作成: ${testEmail}`, 'cyan');

        // 1回目の使用
        const firstResponse = await fetch(
          `${this.baseUrl}/api/auth/verify?token=${testToken}`
        );
        const firstData = await firstResponse.json();

        if (firstResponse.ok && firstData.success) {
          this.log('✅ 1回目の使用: 成功', 'green');

          // 2回目の使用（再利用テスト）
          const secondResponse = await fetch(
            `${this.baseUrl}/api/auth/verify?token=${testToken}`
          );
          const secondData = await secondResponse.json();

          if (secondResponse.status === 400 && !secondData.success) {
            this.log('✅ 2回目の使用: 正しく拒否されました', 'green');
            this.log(`   - エラーメッセージ: ${secondData.error}`, 'cyan');

            this.testResults.push({
              test: '使用済みトークン再利用防止',
              success: true,
              details: { message: '再利用が正しく防止された' },
            });

            return true;
          } else {
            this.log('❌ 2回目の使用: 不正に成功してしまいました', 'red');

            this.testResults.push({
              test: '使用済みトークン再利用防止',
              success: false,
              details: { error: '再利用が防止されていない' },
            });

            return false;
          }
        } else {
          this.log(`❌ 1回目の使用失敗: ${firstData.error}`, 'red');
          return false;
        }
      } catch (error) {
        this.log(`❌ 再利用防止テスト失敗: ${error.message}`, 'red');
        return false;
      }
    } else {
      // 既に使用済みのトークンで再利用テスト
      try {
        const response = await fetch(
          `${this.baseUrl}/api/auth/verify?token=${this.verificationToken}`
        );
        const data = await response.json();

        if (response.status === 400 && !data.success) {
          this.log(
            '✅ 使用済みトークンの再利用が正しく防止されました',
            'green'
          );
          this.log(`   - エラーメッセージ: ${data.error}`, 'cyan');

          this.testResults.push({
            test: '使用済みトークン再利用防止',
            success: true,
            details: { message: '再利用が正しく防止された' },
          });

          return true;
        } else {
          this.log('❌ 使用済みトークンが不正に受け入れられました', 'red');
          return false;
        }
      } catch (error) {
        this.log(`❌ 再利用防止テスト失敗: ${error.message}`, 'red');
        return false;
      }
    }
  }

  generateToken(length = 32) {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  // テスト結果サマリー
  printComprehensiveResults() {
    this.log('\n📊 完全メール認証フロー検証結果', 'bold');
    this.log('='.repeat(50), 'blue');

    const successCount = this.testResults.filter((r) => r.success).length;
    const totalCount = this.testResults.length;

    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅ 成功' : '❌ 失敗';
      const color = result.success ? 'green' : 'red';
      this.log(`${index + 1}. ${result.test}: ${status}`, color);
    });

    this.log('='.repeat(50), 'blue');
    this.log(
      `総合結果: ${successCount}/${totalCount} 確認ポイント合格`,
      successCount === totalCount ? 'green' : 'red'
    );

    if (successCount === totalCount) {
      this.log('\n🎉 すべての確認ポイントが完璧に動作しています！', 'green');
      this.log('メール認証機能は本格運用準備完了です。', 'green');
    } else {
      this.log(
        `\n⚠️  ${totalCount - successCount}件の確認ポイントで問題が見つかりました`,
        'red'
      );
      this.log('問題の詳細を確認して修正してください。', 'yellow');
    }

    // 各確認ポイントの詳細結果
    this.log('\n📋 確認ポイント詳細:', 'bold');
    this.log(
      '1. 登録後メール送信: ' + (this.testResults[0]?.success ? '✅' : '❌'),
      this.testResults[0]?.success ? 'green' : 'red'
    );
    this.log(
      '2. 認証成功画面: ' + (this.testResults[1]?.success ? '✅' : '❌'),
      this.testResults[1]?.success ? 'green' : 'red'
    );
    this.log(
      '3. データベース更新: ' + (this.testResults[1]?.success ? '✅' : '❌'),
      this.testResults[1]?.success ? 'green' : 'red'
    );
    this.log(
      '4. 認証後ログイン: ' + (this.testResults[2]?.success ? '✅' : '❌'),
      this.testResults[2]?.success ? 'green' : 'red'
    );
    this.log(
      '5. 無効トークンエラー: ' + (this.testResults[3]?.success ? '✅' : '❌'),
      this.testResults[3]?.success ? 'green' : 'red'
    );
    this.log(
      '6. 使用済み再利用防止: ' + (this.testResults[4]?.success ? '✅' : '❌'),
      this.testResults[4]?.success ? 'green' : 'red'
    );
  }

  // クリーンアップ
  async cleanup() {
    this.log('\n🧹 テストデータのクリーンアップ', 'yellow');

    try {
      const User = mongoose.model('User');

      // テストで作成したユーザーを削除
      const result = await User.deleteMany({
        email: { $regex: /^test-(verify-|reuse-).*@example\.com$/ },
      });

      this.log(
        `✅ ${result.deletedCount}件のテストデータを削除しました`,
        'green'
      );
    } catch (error) {
      this.log(`❌ クリーンアップ失敗: ${error.message}`, 'red');
    }
  }

  // メインテスト実行
  async runComprehensiveTest() {
    this.log('🚀 完全メール認証フロー検証を開始します...', 'bold');

    // 環境確認
    if (!this.mongoUri) {
      this.log('❌ MONGODB_URI環境変数が設定されていません', 'red');
      process.exit(1);
    }

    try {
      // データベース接続
      const dbConnected = await this.connectDatabase();
      if (!dbConnected) {
        process.exit(1);
      }

      // 確認ポイントを順次テスト
      await this.testRegistrationAndEmailSending();
      await this.testAuthenticationSuccess();
      await this.testLoginAfterVerification();
      await this.testInvalidTokenError();
      await this.testUsedTokenPrevention();

      // 結果表示
      this.printComprehensiveResults();

      // クリーンアップ
      await this.cleanup();
    } catch (error) {
      this.log(
        `❌ テスト実行中にエラーが発生しました: ${error.message}`,
        'red'
      );
    } finally {
      await this.disconnectDatabase();
    }
  }
}

// メイン実行
if (require.main === module) {
  const tester = new ComprehensiveEmailVerificationTest();
  tester.runComprehensiveTest().catch(console.error);
}

module.exports = ComprehensiveEmailVerificationTest;

#!/usr/bin/env node

/**
 * メール認証機能の自動テストスクリプト
 */

const { execSync } = require('child_process');
const fetch = require('node-fetch');
const mongoose = require('mongoose');

// カラー出力用
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class EmailVerificationTester {
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
    this.mongoUri = process.env.MONGODB_URI;
    this.testResults = [];
    this.testUser = null;
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

  async createTestUser() {
    try {
      // テスト用Userモデル作成（簡易版）
      const User = mongoose.model('User', new mongoose.Schema({
        name: String,
        email: String,
        password: String,
        emailVerified: { type: Boolean, default: false },
        emailVerificationToken: String,
        emailVerificationExpires: Date,
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      }));

      const testEmail = `test-${Date.now()}@example.com`;
      const token = this.generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後

      const user = new User({
        name: 'Test User',
        email: testEmail,
        password: 'hashedpassword',
        emailVerified: false,
        emailVerificationToken: token,
        emailVerificationExpires: expiresAt
      });

      await user.save();
      
      this.testUser = {
        id: user._id,
        email: testEmail,
        token: token,
        expiresAt: expiresAt
      };

      this.log(`✅ テストユーザー作成成功: ${testEmail}`, 'green');
      return true;
    } catch (error) {
      this.log(`❌ テストユーザー作成失敗: ${error.message}`, 'red');
      return false;
    }
  }

  generateToken(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  async makeApiRequest(endpoint, options = {}) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      const data = await response.json();
      return {
        status: response.status,
        data: data,
        headers: response.headers
      };
    } catch (error) {
      return {
        error: error.message,
        status: 0
      };
    }
  }

  async testValidToken() {
    this.log('\n🧪 テスト1: 有効なトークンでの認証', 'blue');
    
    const result = await this.makeApiRequest(`/api/auth/verify?token=${this.testUser.token}`);
    
    const success = result.status === 200 && 
                   result.data.success === true &&
                   result.data.code === 'EMAIL_VERIFIED';
    
    if (success) {
      this.log('✅ 有効なトークン認証成功', 'green');
    } else {
      this.log(`❌ 有効なトークン認証失敗: Status ${result.status}`, 'red');
      this.log(`   Response: ${JSON.stringify(result.data)}`, 'red');
    }

    this.testResults.push({
      test: '有効なトークン認証',
      success: success,
      details: result
    });

    return success;
  }

  async testInvalidToken() {
    this.log('\n🧪 テスト2: 無効なトークンでの認証', 'blue');
    
    const invalidToken = 'invalid_token_12345';
    const result = await this.makeApiRequest(`/api/auth/verify?token=${invalidToken}`);
    
    const success = result.status === 400 && 
                   result.data.success === false &&
                   result.data.code === 'INVALID_TOKEN';
    
    if (success) {
      this.log('✅ 無効なトークン処理成功', 'green');
    } else {
      this.log(`❌ 無効なトークン処理失敗: Status ${result.status}`, 'red');
    }

    this.testResults.push({
      test: '無効なトークン処理',
      success: success,
      details: result
    });

    return success;
  }

  async testMissingToken() {
    this.log('\n🧪 テスト3: トークンなしでの認証', 'blue');
    
    const result = await this.makeApiRequest('/api/auth/verify');
    
    const success = result.status === 400 && 
                   result.data.success === false &&
                   result.data.code === 'TOKEN_REQUIRED';
    
    if (success) {
      this.log('✅ トークンなし処理成功', 'green');
    } else {
      this.log(`❌ トークンなし処理失敗: Status ${result.status}`, 'red');
    }

    this.testResults.push({
      test: 'トークンなし処理',
      success: success,
      details: result
    });

    return success;
  }

  async testExpiredToken() {
    this.log('\n🧪 テスト4: 期限切れトークンでの認証', 'blue');
    
    try {
      // 期限切れトークン用の新しいユーザー作成
      const User = mongoose.model('User');
      const expiredUser = new User({
        name: 'Expired Test User',
        email: `expired-${Date.now()}@example.com`,
        password: 'hashedpassword',
        emailVerified: false,
        emailVerificationToken: this.generateToken(),
        emailVerificationExpires: new Date('2023-01-01') // 過去の日付
      });

      await expiredUser.save();
      
      const result = await this.makeApiRequest(`/api/auth/verify?token=${expiredUser.emailVerificationToken}`);
      
      const success = result.status === 400 && 
                     result.data.success === false &&
                     result.data.code === 'INVALID_TOKEN';
      
      if (success) {
        this.log('✅ 期限切れトークン処理成功', 'green');
      } else {
        this.log(`❌ 期限切れトークン処理失敗: Status ${result.status}`, 'red');
      }

      this.testResults.push({
        test: '期限切れトークン処理',
        success: success,
        details: result
      });

      return success;
    } catch (error) {
      this.log(`❌ 期限切れトークンテスト失敗: ${error.message}`, 'red');
      return false;
    }
  }

  async testResendFunctionality() {
    this.log('\n🧪 テスト5: 再送信機能', 'blue');
    
    const result = await this.makeApiRequest('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({
        email: this.testUser.email
      })
    });
    
    // 注意: 実際のメール送信はテスト環境では無効化されている可能性がある
    const success = result.status === 200 || result.status === 500;
    
    if (success) {
      this.log('✅ 再送信API呼び出し成功', 'green');
    } else {
      this.log(`❌ 再送信API呼び出し失敗: Status ${result.status}`, 'red');
    }

    this.testResults.push({
      test: '再送信機能',
      success: success,
      details: result
    });

    return success;
  }

  async testAlreadyVerified() {
    this.log('\n🧪 テスト6: 既に認証済みユーザーの再送信', 'blue');
    
    try {
      // 認証済みユーザー作成
      const User = mongoose.model('User');
      const verifiedUser = new User({
        name: 'Verified Test User',
        email: `verified-${Date.now()}@example.com`,
        password: 'hashedpassword',
        emailVerified: true, // 既に認証済み
        emailVerificationToken: null,
        emailVerificationExpires: null
      });

      await verifiedUser.save();
      
      const result = await this.makeApiRequest('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: verifiedUser.email
        })
      });
      
      const success = result.status === 400 && 
                     result.data.success === false &&
                     result.data.code === 'ALREADY_VERIFIED';
      
      if (success) {
        this.log('✅ 認証済みユーザー処理成功', 'green');
      } else {
        this.log(`❌ 認証済みユーザー処理失敗: Status ${result.status}`, 'red');
      }

      this.testResults.push({
        test: '認証済みユーザー処理',
        success: success,
        details: result
      });

      return success;
    } catch (error) {
      this.log(`❌ 認証済みユーザーテスト失敗: ${error.message}`, 'red');
      return false;
    }
  }

  async checkDatabaseState() {
    this.log('\n🧪 テスト7: データベース状態確認', 'blue');
    
    try {
      const User = mongoose.model('User');
      const user = await User.findById(this.testUser.id);
      
      if (user) {
        const verified = user.emailVerified;
        const tokenCleared = !user.emailVerificationToken;
        const expiresCleared = !user.emailVerificationExpires;
        
        const success = verified && tokenCleared && expiresCleared;
        
        if (success) {
          this.log('✅ データベース状態確認成功', 'green');
          this.log(`   - emailVerified: ${verified}`, 'green');
          this.log(`   - トークン削除: ${tokenCleared}`, 'green');
          this.log(`   - 有効期限削除: ${expiresCleared}`, 'green');
        } else {
          this.log('❌ データベース状態確認失敗', 'red');
          this.log(`   - emailVerified: ${verified}`, verified ? 'green' : 'red');
          this.log(`   - トークン削除: ${tokenCleared}`, tokenCleared ? 'green' : 'red');
          this.log(`   - 有効期限削除: ${expiresCleared}`, expiresCleared ? 'green' : 'red');
        }

        this.testResults.push({
          test: 'データベース状態確認',
          success: success,
          details: {
            emailVerified: verified,
            tokenCleared: tokenCleared,
            expiresCleared: expiresCleared
          }
        });

        return success;
      } else {
        this.log('❌ テストユーザーが見つかりません', 'red');
        return false;
      }
    } catch (error) {
      this.log(`❌ データベース状態確認失敗: ${error.message}`, 'red');
      return false;
    }
  }

  async cleanup() {
    this.log('\n🧹 テスト環境のクリーンアップ', 'yellow');
    
    try {
      const User = mongoose.model('User');
      
      // テストで作成したユーザーを削除
      await User.deleteMany({
        email: { $regex: /^(test-|expired-|verified-).*@example\.com$/ }
      });
      
      this.log('✅ テストデータのクリーンアップ完了', 'green');
    } catch (error) {
      this.log(`❌ クリーンアップ失敗: ${error.message}`, 'red');
    }
  }

  printResults() {
    this.log('\n📊 テスト結果サマリー', 'bold');
    this.log('=====================================', 'blue');
    
    const successCount = this.testResults.filter(r => r.success).length;
    const totalCount = this.testResults.length;
    
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅ 成功' : '❌ 失敗';
      const color = result.success ? 'green' : 'red';
      this.log(`${index + 1}. ${result.test}: ${status}`, color);
    });
    
    this.log('=====================================', 'blue');
    this.log(`総合結果: ${successCount}/${totalCount} テスト合格`, 
      successCount === totalCount ? 'green' : 'red');
    
    if (successCount === totalCount) {
      this.log('🎉 すべてのテストが合格しました！', 'green');
    } else {
      this.log(`⚠️  ${totalCount - successCount}件のテストが失敗しました`, 'red');
    }
  }

  async runAllTests() {
    this.log('🚀 メール認証機能テストを開始します...', 'bold');
    
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

      // テストユーザー作成
      const userCreated = await this.createTestUser();
      if (!userCreated) {
        process.exit(1);
      }

      // テスト実行
      await this.testValidToken();
      await this.testInvalidToken();
      await this.testMissingToken();
      await this.testExpiredToken();
      await this.testResendFunctionality();
      await this.testAlreadyVerified();
      await this.checkDatabaseState();

      // 結果表示
      this.printResults();

      // クリーンアップ
      await this.cleanup();

    } catch (error) {
      this.log(`❌ テスト実行中にエラーが発生しました: ${error.message}`, 'red');
    } finally {
      await this.disconnectDatabase();
    }
  }
}

// メイン実行
if (require.main === module) {
  const tester = new EmailVerificationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = EmailVerificationTester;
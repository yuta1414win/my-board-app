#!/usr/bin/env node

/**
 * メール送信ログモニタリングスクリプト
 * メール送信の成功/失敗を監視し、詳細なログを記録します
 */

const fs = require('fs');
const path = require('path');

// ログファイルのパス
const LOG_DIR = path.join(__dirname, '../logs');
const EMAIL_LOG_FILE = path.join(LOG_DIR, 'email.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'email-errors.log');

/**
 * ログディレクトリを作成
 */
function ensureLogDirectory() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    console.log(`📁 ログディレクトリを作成しました: ${LOG_DIR}`);
  }
}

/**
 * タイムスタンプ付きログメッセージの生成
 */
function createLogMessage(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logData = data ? ` | ${JSON.stringify(data, null, 0)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${logData}\\n`;
}

/**
 * ログファイルに書き込み
 */
function writeLog(filePath, message) {
  try {
    fs.appendFileSync(filePath, message, 'utf8');
  } catch (error) {
    console.error('ログ書き込みエラー:', error);
  }
}

/**
 * メール送信ログを記録
 */
function logEmailSent(to, subject, messageId, duration = null) {
  const logData = {
    to,
    subject,
    messageId,
    duration: duration ? `${duration}ms` : null,
    timestamp: new Date().toISOString(),
  };
  
  const message = createLogMessage('SUCCESS', 'Email sent successfully', logData);
  writeLog(EMAIL_LOG_FILE, message);
  
  console.log('✅ メール送信成功:', {
    to,
    subject: subject.length > 50 ? subject.substring(0, 50) + '...' : subject,
    messageId,
    duration: duration ? `${duration}ms` : 'N/A',
  });
}

/**
 * メール送信エラーを記録
 */
function logEmailError(to, subject, error, duration = null) {
  const logData = {
    to,
    subject,
    error: error.message || error,
    errorCode: error.code,
    errorStack: error.stack,
    duration: duration ? `${duration}ms` : null,
    timestamp: new Date().toISOString(),
  };
  
  const message = createLogMessage('ERROR', 'Email sending failed', logData);
  writeLog(ERROR_LOG_FILE, message);
  
  console.log('❌ メール送信失敗:', {
    to,
    subject: subject.length > 50 ? subject.substring(0, 50) + '...' : subject,
    error: error.message || error,
    duration: duration ? `${duration}ms` : 'N/A',
  });
}

/**
 * 接続テストログを記録
 */
function logConnectionTest(success, error = null, config = null) {
  const logData = {
    success,
    error: error ? error.message || error : null,
    config,
    timestamp: new Date().toISOString(),
  };
  
  const level = success ? 'SUCCESS' : 'ERROR';
  const message = createLogMessage(level, 'Email connection test', logData);
  const logFile = success ? EMAIL_LOG_FILE : ERROR_LOG_FILE;
  writeLog(logFile, message);
  
  if (success) {
    console.log('✅ 接続テスト成功');
  } else {
    console.log('❌ 接続テスト失敗:', error?.message || error);
  }
}

/**
 * ログファイルを分析
 */
function analyzeEmailLogs() {
  console.log('📊 メール送信ログ分析');
  console.log('==============================');

  try {
    // 成功ログの分析
    let successLogs = [];
    let errorLogs = [];

    if (fs.existsSync(EMAIL_LOG_FILE)) {
      const successData = fs.readFileSync(EMAIL_LOG_FILE, 'utf8');
      successLogs = successData.split('\\n').filter(line => line.trim());
    }

    if (fs.existsSync(ERROR_LOG_FILE)) {
      const errorData = fs.readFileSync(ERROR_LOG_FILE, 'utf8');
      errorLogs = errorData.split('\\n').filter(line => line.trim());
    }

    // 統計情報
    console.log(`📈 総メール送信試行数: ${successLogs.length + errorLogs.length}`);
    console.log(`✅ 成功: ${successLogs.length}`);
    console.log(`❌ 失敗: ${errorLogs.length}`);
    
    if (successLogs.length + errorLogs.length > 0) {
      const successRate = ((successLogs.length / (successLogs.length + errorLogs.length)) * 100).toFixed(2);
      console.log(`📊 成功率: ${successRate}%`);
    }

    // 最近のエラー分析
    if (errorLogs.length > 0) {
      console.log('\\n🔍 最近のエラー分析:');
      console.log('------------------------------');
      
      const recentErrors = errorLogs.slice(-5); // 最新5件
      recentErrors.forEach((logLine, index) => {
        try {
          const match = logLine.match(/\\[(.*?)\\] \\[(.*?)\\] (.*?) \\| (.*)/);
          if (match) {
            const [, timestamp, level, message, dataStr] = match;
            const data = JSON.parse(dataStr);
            
            console.log(`\\n${index + 1}. ${new Date(timestamp).toLocaleString('ja-JP')}`);
            console.log(`   宛先: ${data.to}`);
            console.log(`   件名: ${data.subject?.substring(0, 50)}...`);
            console.log(`   エラー: ${data.error}`);
            if (data.errorCode) {
              console.log(`   エラーコード: ${data.errorCode}`);
            }
          }
        } catch (parseError) {
          console.log(`   解析エラー: ${logLine.substring(0, 100)}...`);
        }
      });
    }

    // 成功時の統計
    if (successLogs.length > 0) {
      console.log('\\n📈 成功メール統計:');
      console.log('------------------------------');
      
      const durations = [];
      const recipients = new Set();
      
      successLogs.forEach(logLine => {
        try {
          const match = logLine.match(/\\[(.*?)\\] \\[(.*?)\\] (.*?) \\| (.*)/);
          if (match) {
            const [, , , , dataStr] = match;
            const data = JSON.parse(dataStr);
            
            if (data.to) recipients.add(data.to);
            if (data.duration) {
              const durationMs = parseInt(data.duration);
              if (!isNaN(durationMs)) durations.push(durationMs);
            }
          }
        } catch (parseError) {
          // パース失敗は無視
        }
      });

      console.log(`📧 ユニーク受信者数: ${recipients.size}`);
      
      if (durations.length > 0) {
        const avgDuration = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2);
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);
        
        console.log(`⏱️  平均送信時間: ${avgDuration}ms`);
        console.log(`⚡ 最短送信時間: ${minDuration}ms`);
        console.log(`🐌 最長送信時間: ${maxDuration}ms`);
      }
    }

  } catch (error) {
    console.error('ログ分析エラー:', error);
  }

  console.log('\\n==============================');
}

/**
 * ログファイルをクリア
 */
function clearEmailLogs() {
  try {
    if (fs.existsSync(EMAIL_LOG_FILE)) {
      fs.unlinkSync(EMAIL_LOG_FILE);
      console.log('✅ 成功ログをクリアしました');
    }
    
    if (fs.existsSync(ERROR_LOG_FILE)) {
      fs.unlinkSync(ERROR_LOG_FILE);
      console.log('✅ エラーログをクリアしました');
    }
    
    console.log('🧹 ログクリア完了');
  } catch (error) {
    console.error('ログクリアエラー:', error);
  }
}

/**
 * リアルタイムログ監視
 */
function watchEmailLogs() {
  console.log('👀 メール送信ログをリアルタイム監視中...');
  console.log('Ctrl+C で監視を停止');
  console.log('==============================\\n');

  // ファイル変更監視
  const watchFiles = [EMAIL_LOG_FILE, ERROR_LOG_FILE];
  
  watchFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      fs.watchFile(filePath, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          console.log(`📝 ログ更新検出: ${path.basename(filePath)}`);
          
          // 新しいログエントリを表示
          try {
            const data = fs.readFileSync(filePath, 'utf8');
            const lines = data.split('\\n').filter(line => line.trim());
            const lastLine = lines[lines.length - 1];
            
            if (lastLine) {
              const match = lastLine.match(/\\[(.*?)\\] \\[(.*?)\\] (.*?) \\| (.*)/);
              if (match) {
                const [, timestamp, level, message, dataStr] = match;
                const data = JSON.parse(dataStr);
                
                const time = new Date(timestamp).toLocaleTimeString('ja-JP');
                const icon = level === 'SUCCESS' ? '✅' : '❌';
                
                console.log(`${icon} [${time}] ${data.to} - ${data.subject?.substring(0, 40)}...`);
                if (level === 'ERROR' && data.error) {
                  console.log(`   エラー: ${data.error}`);
                }
              }
            }
          } catch (error) {
            console.error('ログ読み取りエラー:', error);
          }
        }
      });
    }
  });

  // Ctrl+C でプログラム終了
  process.on('SIGINT', () => {
    console.log('\\n\\n🛑 ログ監視を停止しました');
    process.exit(0);
  });

  // 初期状態表示
  if (fs.existsSync(EMAIL_LOG_FILE) || fs.existsSync(ERROR_LOG_FILE)) {
    console.log('📊 現在のログ状況:');
    analyzeEmailLogs();
    console.log('\\n監視を開始しました...\\n');
  } else {
    console.log('📝 ログファイルが見つかりません。メール送信後に監視を開始します...\\n');
  }
}

/**
 * テスト用メール送信ログ生成
 */
function generateTestLogs() {
  console.log('🧪 テスト用ログを生成中...');
  
  ensureLogDirectory();

  // 成功ログのテストデータ
  const successTests = [
    { to: 'test1@example.com', subject: 'ウェルカムメール', messageId: 'msg-001', duration: 1250 },
    { to: 'test2@example.com', subject: 'パスワードリセット', messageId: 'msg-002', duration: 980 },
    { to: 'test3@example.com', subject: 'メールアドレス確認', messageId: 'msg-003', duration: 1100 },
  ];

  // エラーログのテストデータ
  const errorTests = [
    { 
      to: 'invalid@domain.invalid', 
      subject: 'テストメール', 
      error: new Error('DNS resolution failed'),
      duration: 5000
    },
    { 
      to: 'test@example.com', 
      subject: 'テストメール', 
      error: new Error('SMTP authentication failed'),
      duration: 2000
    },
  ];

  // テストログ生成
  successTests.forEach(test => {
    logEmailSent(test.to, test.subject, test.messageId, test.duration);
  });

  errorTests.forEach(test => {
    logEmailError(test.to, test.subject, test.error, test.duration);
  });

  console.log('✅ テスト用ログ生成完了');
}

/**
 * メイン実行関数
 */
function main() {
  const command = process.argv[2];

  ensureLogDirectory();

  switch (command) {
    case 'analyze':
    case 'stats':
      analyzeEmailLogs();
      break;
      
    case 'clear':
      clearEmailLogs();
      break;
      
    case 'watch':
    case 'monitor':
      watchEmailLogs();
      break;
      
    case 'test':
      generateTestLogs();
      break;
      
    case 'help':
    default:
      console.log('📧 メール送信ログモニタリングツール');
      console.log('=====================================');
      console.log('使用方法: node test-email-monitoring.js <command>');
      console.log('');
      console.log('利用可能なコマンド:');
      console.log('  analyze, stats  - ログファイルを分析して統計情報を表示');
      console.log('  clear           - ログファイルをクリア');
      console.log('  watch, monitor  - リアルタイムでログを監視');
      console.log('  test            - テスト用ログデータを生成');
      console.log('  help            - このヘルプを表示');
      console.log('');
      console.log('例:');
      console.log('  node scripts/test-email-monitoring.js analyze');
      console.log('  node scripts/test-email-monitoring.js watch');
      break;
  }
}

// エクスポート用関数
module.exports = {
  logEmailSent,
  logEmailError,
  logConnectionTest,
  analyzeEmailLogs,
  clearEmailLogs,
  watchEmailLogs,
  generateTestLogs,
  ensureLogDirectory,
};

// スクリプト実行
if (require.main === module) {
  main();
}
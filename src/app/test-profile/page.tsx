'use client';

import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Alert,
  Stack,
  Paper,
  Divider,
} from '@mui/material';

export default function TestProfilePage() {
  const [results, setResults] = useState<
    {
      type: 'success' | 'error';
      message: string;
      details?: any;
    }[]
  >([]);

  const addResult = (
    type: 'success' | 'error',
    message: string,
    details?: any
  ) => {
    setResults((prev) => [...prev, { type, message, details }]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testProfileAPI = async () => {
    try {
      const response = await fetch('/api/user/profile');
      const data = await response.json();

      if (response.ok) {
        addResult('success', 'プロフィール取得成功', data);
      } else {
        addResult('error', `プロフィール取得失敗: ${data.error}`, data);
      }
    } catch (error) {
      addResult('error', 'プロフィール取得エラー', error);
    }
  };

  const testProfileUpdate = async () => {
    const testData = {
      name: 'テストユーザー' + Date.now(),
      bio: 'これはテスト用の自己紹介です。更新されました。',
      quickComment: 'テストコメント！',
    };

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });
      const data = await response.json();

      if (response.ok) {
        addResult('success', 'プロフィール更新成功', data);
      } else {
        addResult('error', `プロフィール更新失敗: ${data.error}`, data);
      }
    } catch (error) {
      addResult('error', 'プロフィール更新エラー', error);
    }
  };

  const testValidation = async () => {
    const invalidData = {
      name: '', // 必須エラー
      bio: 'あ'.repeat(201), // 文字数制限エラー
      quickComment: 'あ'.repeat(51), // 文字数制限エラー
    };

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });
      const data = await response.json();

      if (!response.ok) {
        addResult('success', 'バリデーションエラーが正常に動作', data);
      } else {
        addResult('error', 'バリデーションが動作していない', data);
      }
    } catch (error) {
      addResult('error', 'バリデーションテストエラー', error);
    }
  };

  const testPasswordChange = async () => {
    const passwordData = {
      currentPassword: 'WrongPassword123!',
      newPassword: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    };

    try {
      const response = await fetch('/api/user/update-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordData),
      });
      const data = await response.json();

      if (!response.ok) {
        addResult('success', 'パスワード変更エラー処理が正常に動作', data);
      } else {
        addResult('error', 'パスワード変更が予期しない成功', data);
      }
    } catch (error) {
      addResult('error', 'パスワード変更テストエラー', error);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          プロフィール機能テスト
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              テスト実行
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
              <Button variant="contained" onClick={testProfileAPI}>
                プロフィール取得テスト
              </Button>
              <Button variant="contained" onClick={testProfileUpdate}>
                プロフィール更新テスト
              </Button>
              <Button variant="contained" onClick={testValidation}>
                バリデーションテスト
              </Button>
              <Button variant="contained" onClick={testPasswordChange}>
                パスワード変更テスト
              </Button>
              <Button variant="outlined" onClick={clearResults}>
                結果クリア
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            テスト結果
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {results.length === 0 ? (
            <Typography color="text.secondary">
              テストを実行すると結果がここに表示されます
            </Typography>
          ) : (
            <Stack spacing={2}>
              {results.map((result, index) => (
                <Alert key={index} severity={result.type}>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {result.message}
                  </Typography>
                  {result.details && (
                    <Box
                      component="pre"
                      sx={{
                        fontSize: '0.8rem',
                        overflow: 'auto',
                        backgroundColor: 'rgba(0,0,0,0.05)',
                        p: 1,
                        borderRadius: 1,
                        mt: 1,
                      }}
                    >
                      {JSON.stringify(result.details, null, 2)}
                    </Box>
                  )}
                </Alert>
              ))}
            </Stack>
          )}
        </Paper>

        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              手動テスト手順
            </Typography>
            <Typography variant="body2" component="div">
              <ol>
                <li>
                  <strong>認証チェック</strong>: ログアウト状態で `/profile`
                  にアクセス → ログインページにリダイレクト
                </li>
                <li>
                  <strong>プロフィール表示</strong>: ログイン後 `/profile`
                  にアクセス → プロフィール情報が表示される
                </li>
                <li>
                  <strong>編集機能</strong>: 「編集」ボタンクリック →
                  フォーム表示 → データ変更 → 保存
                </li>
                <li>
                  <strong>文字数制限</strong>:
                  名前51文字、自己紹介201文字、コメント51文字入力 → エラー表示
                </li>
                <li>
                  <strong>パスワード変更</strong>: `/profile/change-credentials`
                  → フォーム入力 → バリデーション確認
                </li>
                <li>
                  <strong>キャンセル機能</strong>: 編集中にキャンセル →
                  変更が破棄される
                </li>
                <li>
                  <strong>レスポンシブ</strong>: ブラウザサイズ変更 →
                  レイアウト調整確認
                </li>
              </ol>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

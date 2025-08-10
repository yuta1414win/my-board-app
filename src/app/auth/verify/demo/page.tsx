'use client';

import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Stack,
  Divider,
  Box,
  Alert,
  Chip,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Info,
  PlayArrow,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

// デモ用のサンプルトークン
const DEMO_TOKENS = {
  valid: 'demo_valid_token_12345678901234567890',
  invalid: 'demo_invalid_token_12345678901234567890',
  expired: 'demo_expired_token_12345678901234567890',
};

export default function VerifyEmailDemoPage() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleDemoRedirect = (tokenType: keyof typeof DEMO_TOKENS, delay = 1000) => {
    setIsRedirecting(true);
    
    setTimeout(() => {
      const token = DEMO_TOKENS[tokenType];
      router.push(`/auth/verify?token=${token}&demo=true`);
      setIsRedirecting(false);
    }, delay);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography 
            variant="h3" 
            gutterBottom 
            sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent'
            }}
          >
            メール認証機能デモ
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Material UIを使ったメール認証機能のデモンストレーション
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body2">
            このページはデモ用です。実際のメール認証フローを体験できます。
            各シナリオのボタンをクリックして、異なる結果を確認してください。
          </Typography>
        </Alert>

        <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
          テストシナリオ
        </Typography>

        <Stack spacing={3}>
          {/* 成功パターン */}
          <Paper 
            variant="outlined" 
            sx={{ p: 3, borderColor: 'success.light', bgcolor: 'success.50' }}
          >
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <CheckCircle color="success" />
              <Typography variant="h6" color="success.dark">
                成功パターン
              </Typography>
              <Chip label="推奨" color="success" size="small" />
            </Stack>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              有効なトークンでメール認証が成功するケース
            </Typography>
            
            <Typography variant="caption" display="block" sx={{ mb: 2, fontFamily: 'monospace' }}>
              期待される結果: 成功メッセージ → 5秒後にログインページへリダイレクト
            </Typography>
            
            <Button
              variant="contained"
              color="success"
              startIcon={<PlayArrow />}
              onClick={() => handleDemoRedirect('valid')}
              disabled={isRedirecting}
              size="small"
            >
              テスト実行
            </Button>
          </Paper>

          {/* エラーパターン1: 無効なトークン */}
          <Paper 
            variant="outlined" 
            sx={{ p: 3, borderColor: 'error.light', bgcolor: 'error.50' }}
          >
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <Error color="error" />
              <Typography variant="h6" color="error.dark">
                無効なトークン
              </Typography>
            </Stack>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              存在しないまたは無効なトークンでアクセスするケース
            </Typography>
            
            <Typography variant="caption" display="block" sx={{ mb: 2, fontFamily: 'monospace' }}>
              期待される結果: エラーメッセージ → 再送信ボタン表示
            </Typography>
            
            <Button
              variant="contained"
              color="error"
              startIcon={<PlayArrow />}
              onClick={() => handleDemoRedirect('invalid')}
              disabled={isRedirecting}
              size="small"
            >
              テスト実行
            </Button>
          </Paper>

          {/* エラーパターン2: 期限切れトークン */}
          <Paper 
            variant="outlined" 
            sx={{ p: 3, borderColor: 'warning.light', bgcolor: 'warning.50' }}
          >
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <Warning color="warning" />
              <Typography variant="h6" color="warning.dark">
                期限切れトークン
              </Typography>
            </Stack>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              24時間を過ぎて期限切れになったトークンでアクセスするケース
            </Typography>
            
            <Typography variant="caption" display="block" sx={{ mb: 2, fontFamily: 'monospace' }}>
              期待される結果: 期限切れエラー → 再送信ボタン表示
            </Typography>
            
            <Button
              variant="contained"
              color="warning"
              startIcon={<PlayArrow />}
              onClick={() => handleDemoRedirect('expired')}
              disabled={isRedirecting}
              size="small"
            >
              テスト実行
            </Button>
          </Paper>
        </Stack>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
          実装された機能
        </Typography>

        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircle color="success" fontSize="small" />
            <Typography variant="body2">
              Material UIを使用したモダンなユーザーインターフェース
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircle color="success" fontSize="small" />
            <Typography variant="body2">
              リアルタイムのトークン検証とエラーハンドリング
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircle color="success" fontSize="small" />
            <Typography variant="body2">
              自動リダイレクト機能（カウントダウン付き）
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircle color="success" fontSize="small" />
            <Typography variant="body2">
              メール再送信機能（ダイアログ形式）
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircle color="success" fontSize="small" />
            <Typography variant="body2">
              レスポンシブデザインとアクセシビリティ対応
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircle color="success" fontSize="small" />
            <Typography variant="body2">
              統一された日本語エラーメッセージ
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            テスト後は各シナリオの動作を確認してください
          </Typography>
          
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="outlined"
              onClick={() => router.push('/auth/signin')}
            >
              ログインページへ
            </Button>
            <Button
              variant="outlined"
              onClick={() => router.push('/')}
            >
              ホームへ戻る
            </Button>
          </Stack>
        </Box>

        {isRedirecting && (
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              テストページにリダイレクトしています...
            </Typography>
          </Alert>
        )}
      </Paper>
    </Container>
  );
}
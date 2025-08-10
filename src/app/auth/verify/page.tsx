'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  Stack,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Email,
  Home,
  Login,
  Refresh,
} from '@mui/icons-material';

interface VerificationResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  canResend?: boolean;
  redirectUrl?: string;
}

type VerificationStatus = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [response, setResponse] = useState<VerificationResponse | null>(null);
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [countdown, setCountdown] = useState(5);

  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setResponse({
        success: false,
        error: '確認トークンが見つかりません',
        code: 'TOKEN_NOT_FOUND',
      });
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch(
          `/api/auth/verify?token=${encodeURIComponent(token)}`
        );
        const data: VerificationResponse = await res.json();

        setResponse(data);
        setStatus(data.success ? 'success' : 'error');

        if (data.success && data.redirectUrl) {
          // カウントダウン開始
          const timer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer);
                router.push(
                  data.redirectUrl +
                    '?message=' +
                    encodeURIComponent(data.message || '')
                );
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          return () => clearInterval(timer);
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setResponse({
          success: false,
          error: 'ネットワークエラーが発生しました',
          code: 'NETWORK_ERROR',
        });
      }
    };

    verifyEmail();
  }, [token, router]);

  const handleResendEmail = async () => {
    if (!resendEmail.trim()) {
      setResendMessage('メールアドレスを入力してください');
      return;
    }

    setIsResending(true);
    setResendMessage('');

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      });

      const data: VerificationResponse = await res.json();
      setResendMessage(
        data.message || data.error || '不明なエラーが発生しました'
      );

      if (data.success) {
        setTimeout(() => {
          setResendDialogOpen(false);
          setResendEmail('');
          setResendMessage('');
        }, 3000);
      }
    } catch (error) {
      console.error('Resend error:', error);
      setResendMessage('ネットワークエラーが発生しました');
    } finally {
      setIsResending(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              メールアドレスを確認しています...
            </Typography>
          </Box>
        );

      case 'success':
        return (
          <Fade in timeout={500}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircle
                sx={{
                  fontSize: 80,
                  color: 'success.main',
                  mb: 2,
                  filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))',
                }}
              />
              <Typography
                variant="h4"
                sx={{ mb: 2, fontWeight: 'bold', color: 'success.dark' }}
              >
                確認完了！
              </Typography>

              <Alert
                severity="success"
                sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}
              >
                <Typography variant="body1">{response?.message}</Typography>
              </Alert>

              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {countdown}秒後にログインページへ自動的に移動します...
              </Typography>

              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Login />}
                  onClick={() => router.push('/auth/signin')}
                  sx={{ px: 4 }}
                >
                  今すぐログイン
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<Home />}
                  onClick={() => router.push('/')}
                >
                  ホームへ
                </Button>
              </Stack>
            </Box>
          </Fade>
        );

      case 'error':
        return (
          <Fade in timeout={500}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Error
                sx={{
                  fontSize: 80,
                  color: 'error.main',
                  mb: 2,
                  filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))',
                }}
              />
              <Typography
                variant="h4"
                sx={{ mb: 2, fontWeight: 'bold', color: 'error.dark' }}
              >
                確認に失敗しました
              </Typography>

              <Alert severity="error" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
                <Typography variant="body1">{response?.error}</Typography>
              </Alert>

              <Stack spacing={2} sx={{ maxWidth: 400, mx: 'auto' }}>
                {response?.canResend && (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Refresh />}
                    onClick={() => setResendDialogOpen(true)}
                    sx={{ px: 4 }}
                  >
                    確認メールを再送信
                  </Button>
                )}

                <Divider sx={{ my: 2 }}>または</Divider>

                <Stack direction="row" spacing={2} justifyContent="center">
                  <Button
                    variant="outlined"
                    startIcon={<Email />}
                    onClick={() => router.push('/auth/register')}
                  >
                    新規登録に戻る
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Login />}
                    onClick={() => router.push('/auth/signin')}
                  >
                    ログインページへ
                  </Button>
                </Stack>

                <Button
                  variant="text"
                  startIcon={<Home />}
                  onClick={() => router.push('/')}
                  sx={{ mt: 2 }}
                >
                  ホームに戻る
                </Button>
              </Stack>
            </Box>
          </Fade>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper
        elevation={3}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        }}
      >
        <Box sx={{ p: 4, backgroundColor: 'background.paper' }}>
          <Typography
            variant="h3"
            align="center"
            sx={{
              mb: 4,
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            メールアドレス確認
          </Typography>

          {renderContent()}
        </Box>
      </Paper>

      {/* 再送信ダイアログ */}
      <Dialog
        open={resendDialogOpen}
        onClose={() => setResendDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Email color="primary" />
            <Typography variant="h6">確認メールの再送信</Typography>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            確認メールを再送信するメールアドレスを入力してください
          </Typography>

          <TextField
            autoFocus
            fullWidth
            type="email"
            label="メールアドレス"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            disabled={isResending}
            sx={{ mb: 2 }}
          />

          {resendMessage && (
            <Alert
              severity={
                resendMessage.includes('再送信しました') ? 'success' : 'error'
              }
              sx={{ mt: 2 }}
            >
              {resendMessage}
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setResendDialogOpen(false)}
            disabled={isResending}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleResendEmail}
            variant="contained"
            disabled={isResending || !resendEmail.trim()}
            startIcon={isResending ? <CircularProgress size={20} /> : <Email />}
          >
            {isResending ? '送信中...' : '再送信'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

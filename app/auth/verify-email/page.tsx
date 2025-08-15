'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Alert,
  CircularProgress,
  Button,
  Typography,
  Paper,
} from '@mui/material';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setStatus('error');
      setMessage('無効なリンクです');
    }
  }, [token]);

  const verifyEmail = async (token: string) => {
    try {
      console.log(
        '[VERIFY-PAGE] メール認証開始:',
        token.substring(0, 20) + '...'
      );

      const response = await fetch(`/api/auth/verify-email?token=${token}`);
      const data = await response.json();

      console.log('[VERIFY-PAGE] レスポンス:', {
        status: response.status,
        ok: response.ok,
        message: data.message,
        error: data.error,
      });

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
        setDetails(data);
      } else {
        setStatus('error');
        setMessage(data.error || 'メール認証に失敗しました');
        setDetails({
          statusCode: response.status,
          code: data.code,
          url: window.location.href,
        });
      }
    } catch (error) {
      console.error('[VERIFY-PAGE] メール認証エラー:', error);
      setStatus('error');
      setMessage('サーバーエラーが発生しました');
      setDetails({
        error: error instanceof Error ? error.message : '不明なエラー',
        url: window.location.href,
      });
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        gap: 2,
      }}
    >
      {status === 'loading' && (
        <>
          <CircularProgress />
          <Alert severity="info">メールアドレスを確認中...</Alert>
        </>
      )}

      {status === 'success' && (
        <>
          <Alert severity="success">{message}</Alert>
          <Button
            component={Link}
            href="/auth/signin"
            variant="contained"
            size="large"
          >
            ログインページへ
          </Button>
        </>
      )}

      {status === 'error' && (
        <>
          <Alert severity="error">{message}</Alert>

          {details && (
            <Paper
              sx={{
                p: 2,
                mt: 2,
                maxWidth: '500px',
                bgcolor: '#fafafa',
                fontSize: '0.875rem',
              }}
            >
              <Typography variant="body2" color="text.secondary" gutterBottom>
                🔍 デバッグ情報:
              </Typography>
              <pre
                style={{
                  margin: 0,
                  fontSize: '0.75rem',
                  wordWrap: 'break-word',
                }}
              >
                {JSON.stringify(details, null, 2)}
              </pre>
            </Paper>
          )}

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              component={Link}
              href="/auth/register"
              variant="outlined"
              size="large"
            >
              登録ページに戻る
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="text"
              size="large"
            >
              リロード
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

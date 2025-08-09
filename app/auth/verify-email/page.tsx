'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, Alert, CircularProgress, Button } from '@mui/material';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

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
      const response = await fetch(`/api/auth/verify-email?token=${token}`);
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.error || 'メール認証に失敗しました');
      }
    } catch (error) {
      setStatus('error');
      setMessage('サーバーエラーが発生しました');
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
          <Button
            component={Link}
            href="/auth/register"
            variant="outlined"
            size="large"
          >
            登録ページに戻る
          </Button>
        </>
      )}
    </Box>
  );
}
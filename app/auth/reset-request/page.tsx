'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  Stack,
  Container,
} from '@mui/material';
import { Email, ArrowBack } from '@mui/icons-material';
import NextLink from 'next/link';
import { z } from 'zod';

// バリデーションスキーマ
const emailSchema = z.object({
  email: z.string().email('正しいメールアドレスを入力してください'),
});

export default function ResetRequestPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // バリデーション
      const validatedFields = emailSchema.safeParse({ email });
      if (!validatedFields.success) {
        setError(validatedFields.error.issues[0].message);
        setLoading(false);
        return;
      }

      // TODO: リセットAPIを実装後、ここでAPIを呼び出す
      // const response = await fetch('/api/auth/reset-request', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email: validatedFields.data.email }),
      // });

      // 一時的に成功状態を表示
      setSuccess(true);

      // 5秒後にサインインページへリダイレクト
      setTimeout(() => {
        router.push('/auth/signin');
      }, 5000);
    } catch (err) {
      setError('リセットメールの送信に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, mb: 4 }}>
          <Card elevation={3}>
            <CardContent sx={{ p: 4 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                リセットメールを送信しました
              </Alert>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {email} 宛にアカウント復旧用のリンクを送信しました。
                メールをご確認ください。
              </Typography>
              <Typography variant="body2" color="text.secondary">
                メールが届かない場合は、迷惑メールフォルダをご確認ください。
              </Typography>
              <Button
                component={NextLink}
                href="/auth/signin"
                fullWidth
                variant="outlined"
                sx={{ mt: 3 }}
              >
                サインインページへ戻る
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Card elevation={3}>
          <CardContent sx={{ p: 4 }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                mb: 1,
                fontWeight: 'bold',
                textAlign: 'center',
              }}
            >
              アカウント復旧
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 4, textAlign: 'center' }}
            >
              登録したメールアドレスを入力してください。
              アカウント復旧用のリンクをお送りします。
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="メールアドレス"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="email"
                  InputProps={{
                    startAdornment: (
                      <Email sx={{ mr: 1, color: 'action.active' }} />
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading || !email}
                  sx={{ py: 1.5 }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'リセットメールを送信'
                  )}
                </Button>

                <Box sx={{ textAlign: 'center' }}>
                  <Link
                    component={NextLink}
                    href="/auth/signin"
                    variant="body2"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      color: 'text.secondary',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    <ArrowBack sx={{ mr: 0.5, fontSize: 18 }} />
                    サインインページへ戻る
                  </Link>
                </Box>
              </Stack>
            </form>
          </CardContent>
        </Card>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            アカウントをお持ちでない方は
            <Link component={NextLink} href="/auth/register" sx={{ ml: 0.5 }}>
              新規登録
            </Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}

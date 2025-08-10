'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import {
  Container,
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  Stack,
  Divider,
} from '@mui/material';
import {
  Google as GoogleIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';

export default function SignInPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(''); // エラーをクリア
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // バリデーション
    if (!formData.email.trim()) {
      setError('メールアドレスを入力してください');
      setLoading(false);
      return;
    }

    if (!formData.password.trim()) {
      setError('パスワードを入力してください');
      setLoading(false);
      return;
    }

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        callbackUrl: '/board',
        redirect: false,
      });

      if (result?.error) {
        setError(
          'ログインに失敗しました。メールアドレスまたはパスワードを確認してください。'
        );
      } else if (result?.ok) {
        router.push('/board');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: string) => {
    try {
      await signIn(provider, {
        callbackUrl: '/board',
        redirect: true,
      });
    } catch (error) {
      console.error(`${provider} login error:`, error);
      setError(`${provider}ログインに失敗しました`);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: { xs: 4, sm: 8 }, px: { xs: 2, sm: 0 } }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          align="center"
          sx={{
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
            mb: 4,
          }}
        >
          ログイン
        </Typography>

        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  name="email"
                  type="email"
                  label="メールアドレス"
                  placeholder="メールアドレスを入力"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoComplete="email"
                />

                <TextField
                  fullWidth
                  name="password"
                  type="password"
                  label="パスワード"
                  placeholder="パスワードを入力"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />

                {error && (
                  <Alert severity="error" role="alert">
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  disabled={
                    loading ||
                    !formData.email.trim() ||
                    !formData.password.trim()
                  }
                  sx={{
                    height: 48,
                    fontSize: '1rem',
                  }}
                >
                  {loading ? 'ログイン中...' : 'ログイン'}
                </Button>
              </Stack>
            </form>

            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="textSecondary">
                または
              </Typography>
            </Divider>

            <Typography
              variant="h6"
              color="primary"
              sx={{ textAlign: 'center', my: 2 }}
            >
              ソーシャルログイン
            </Typography>

            <Stack spacing={2}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<GoogleIcon />}
                onClick={() => handleOAuthSignIn('google')}
                disabled={loading}
                sx={{
                  height: 48,
                  borderColor: '#db4437',
                  color: '#db4437',
                  '&:hover': {
                    borderColor: '#c23321',
                    backgroundColor: '#fdf2f2',
                  },
                }}
              >
                Googleでログイン
              </Button>

              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<GitHubIcon />}
                onClick={() => handleOAuthSignIn('github')}
                disabled={loading}
                sx={{
                  height: 48,
                  borderColor: '#333',
                  color: '#333',
                  '&:hover': {
                    borderColor: '#000',
                    backgroundColor: '#f5f5f5',
                  },
                }}
              >
                GitHubでログイン
              </Button>
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                アカウントをお持ちでないですか？
              </Typography>
              <Link href="/auth/register" style={{ textDecoration: 'none' }}>
                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  sx={{ mt: 1 }}
                >
                  新規登録
                </Button>
              </Link>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button variant="text" color="primary">
              ← ホームに戻る
            </Button>
          </Link>
        </Box>
      </Box>
    </Container>
  );
}

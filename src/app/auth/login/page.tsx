'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Google as GoogleIcon,
  GitHub as GitHubIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
} from '@mui/icons-material';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/board';

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
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        // エラーメッセージの改善
        if (result.error.includes('メールアドレスが確認されていません')) {
          setError('メールアドレスが確認されていません。確認メールをご確認ください。');
        } else {
          setError('メールアドレスまたはパスワードが正しくありません。');
        }
      } else if (result?.ok) {
        // ログイン成功メッセージを表示してからリダイレクト
        router.push(callbackUrl);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('ネットワークエラーが発生しました。しばらく経ってから再度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: string) => {
    setLoading(true);
    try {
      await signIn(provider, {
        callbackUrl,
        redirect: true,
      });
    } catch (error) {
      console.error(`${provider} login error:`, error);
      setError(`${provider}ログインに失敗しました`);
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: { xs: 4, sm: 8 }, px: { xs: 2, sm: 0 } }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <LoginIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontSize: { xs: '1.75rem', sm: '2.125rem' },
              fontWeight: 'bold',
            }}
          >
            ログイン
          </Typography>
          <Typography variant="body2" color="text.secondary">
            アカウントにログインして掲示板を利用しましょう
          </Typography>
        </Box>

        <Card elevation={3}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  name="email"
                  type="email"
                  label="メールアドレス"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoComplete="email"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  label="パスワード"
                  placeholder="8文字以上のパスワード"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="パスワードの表示切り替え"
                          onClick={togglePasswordVisibility}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
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
                    fontWeight: 'bold',
                  }}
                >
                  {loading ? 'ログイン中...' : 'ログイン'}
                </Button>

                <Box sx={{ textAlign: 'right' }}>
                  <Link
                    href="/auth/forgot-password"
                    style={{
                      textDecoration: 'none',
                      color: '#1976d2',
                      fontSize: '0.875rem',
                    }}
                  >
                    パスワードをお忘れですか？
                  </Link>
                </Box>
              </Stack>
            </form>

            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                または
              </Typography>
            </Divider>

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
              <Typography variant="body2" color="text.secondary" gutterBottom>
                アカウントをお持ちでないですか？
              </Typography>
              <Link href="/auth/register" style={{ textDecoration: 'none' }}>
                <Button
                  variant="text"
                  color="primary"
                  size="large"
                  sx={{ fontWeight: 'bold' }}
                >
                  新規登録はこちら
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
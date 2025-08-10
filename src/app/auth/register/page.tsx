'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
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
    if (!formData.name.trim()) {
      setError('名前を入力してください');
      setLoading(false);
      return;
    }

    if (formData.name.length > 50) {
      setError('名前は50文字以内で入力してください');
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setError('メールアドレスを入力してください');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('有効なメールアドレスを入力してください');
      setLoading(false);
      return;
    }

    if (!formData.password.trim()) {
      setError('パスワードを入力してください');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // 登録成功時はログインページにリダイレクト
        router.push('/auth/signin?message=登録が完了しました。ログインしてください。');
      } else {
        setError(data.error || '登録に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
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
            mb: 4 
          }}
        >
          新規登録
        </Typography>

        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  name="name"
                  type="text"
                  label="名前"
                  placeholder="お名前を入力"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoComplete="name"
                  error={formData.name.length > 50}
                  helperText={`${formData.name.length}/50文字`}
                />

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
                  placeholder="パスワードを入力（8文字以上）"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  helperText="8文字以上で入力してください"
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
                    !formData.name.trim() ||
                    formData.name.length > 50 ||
                    !formData.email.trim() ||
                    !formData.password.trim() ||
                    formData.password.length < 8
                  }
                  sx={{ 
                    height: 48,
                    fontSize: '1rem',
                  }}
                >
                  {loading ? '登録中...' : '登録する'}
                </Button>
              </Stack>
            </form>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                すでにアカウントをお持ちですか？
              </Typography>
              <Link href="/auth/signin" style={{ textDecoration: 'none' }}>
                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  sx={{ mt: 1 }}
                >
                  ログイン
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
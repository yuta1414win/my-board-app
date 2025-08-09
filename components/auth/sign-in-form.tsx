'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
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
} from '@mui/material';
import { Email, Lock } from '@mui/icons-material';
import NextLink from 'next/link';

interface FormData {
  email: string;
  password: string;
}

export default function SignInForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.email) {
      newErrors.email = 'メールアドレスは必須です';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    if (!formData.password) {
      newErrors.password = 'パスワードは必須です';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setMessage('');

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === 'メールアドレスが確認されていません') {
          setMessage('メールアドレスが確認されていません。確認メールをご確認ください。');
        } else {
          setMessage('メールアドレスまたはパスワードが正しくありません');
        }
      } else if (result?.ok) {
        router.push('/board');
      }
    } catch (error) {
      setMessage('サーバーエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // エラーをクリア
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <Card sx={{ maxWidth: 400, width: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom textAlign="center">
          ログイン
        </Typography>
        
        {message && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="メールアドレス"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={!!errors.email}
            helperText={errors.email}
            margin="normal"
            InputProps={{
              startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />,
            }}
          />

          <TextField
            fullWidth
            label="パスワード"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={!!errors.password}
            helperText={errors.password}
            margin="normal"
            InputProps={{
              startAdornment: <Lock sx={{ mr: 1, color: 'action.active' }} />,
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mt: 3, mb: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'ログイン'}
          </Button>

          <Box textAlign="center">
            <Link component={NextLink} href="/auth/register" variant="body2">
              アカウントをお持ちでない方はこちら
            </Link>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
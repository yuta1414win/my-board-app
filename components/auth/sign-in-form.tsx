'use client';

import React, { useState, useEffect } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  IconButton,
  InputAdornment,
  Divider,
} from '@mui/material';
import { 
  Email, 
  Lock, 
  Visibility, 
  VisibilityOff,
  Security,
  AccountCircle 
} from '@mui/icons-material';
import NextLink from 'next/link';
import { z } from 'zod';

interface FormData {
  email: string;
  password: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
  details?: Array<{ field: string; message: string }>;
}

// バリデーションスキーマ
const signInSchema = z.object({
  email: z.string().email('正しいメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockEndTime, setBlockEndTime] = useState<Date | null>(null);

  // URLパラメータからエラーメッセージを取得
  useEffect(() => {
    const error = searchParams?.get('error');
    const callbackUrl = searchParams?.get('callbackUrl');
    
    if (error) {
      switch (error) {
        case 'CredentialsSignin':
          setMessage('メールアドレスまたはパスワードが正しくありません');
          break;
        case 'EmailNotVerified':
          setMessage('メールアドレスが確認されていません。確認メールをご確認ください。');
          break;
        case 'AccountLocked':
          setMessage('アカウントがロックされています。しばらく時間を置いてお試しください。');
          break;
        default:
          setMessage('ログインエラーが発生しました');
      }
    }
    
    if (callbackUrl) {
      setMessage('ログインが必要です');
    }
  }, [searchParams]);

  // ブロック時間の管理
  useEffect(() => {
    if (isBlocked && blockEndTime) {
      const timer = setInterval(() => {
        if (new Date() >= blockEndTime) {
          setIsBlocked(false);
          setBlockEndTime(null);
          setAttemptCount(0);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isBlocked, blockEndTime]);

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
          setMessage(
            'メールアドレスが確認されていません。確認メールをご確認ください。'
          );
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
    setFormData((prev) => ({ ...prev, [name]: value }));
    // エラーをクリア
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
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

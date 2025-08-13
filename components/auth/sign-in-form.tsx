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
  Stack,
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Security,
  AccountCircle,
  Google as GoogleIcon,
  GitHub as GitHubIcon,
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
          setMessage(
            'メールアドレスが確認されていません。確認メールをご確認ください。'
          );
          break;
        case 'AccountLocked':
          setMessage(
            'アカウントがロックされています。しばらく時間を置いてお試しください。'
          );
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
    const validation = signInSchema.safeParse(formData);

    if (!validation.success) {
      const newErrors: Partial<FormData> = {};
      validation.error.issues.forEach((error) => {
        const field = error.path[0] as keyof FormData;
        newErrors[field] = error.message;
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ブロック状態チェック
    if (isBlocked) {
      const remainingTime = blockEndTime
        ? Math.ceil((blockEndTime.getTime() - new Date().getTime()) / 1000)
        : 0;
      setMessage(
        `ログインがブロックされています。あと${remainingTime}秒お待ちください。`
      );
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    setMessage('');

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
        callbackUrl: searchParams?.get('callbackUrl') || '/board',
      });

      if (result?.error) {
        // ログイン失敗時の試行回数を増加
        const newAttemptCount = attemptCount + 1;
        setAttemptCount(newAttemptCount);

        // 5回失敗でブロック（5分間）
        if (newAttemptCount >= 5) {
          const blockTime = new Date(Date.now() + 5 * 60 * 1000); // 5分間
          setIsBlocked(true);
          setBlockEndTime(blockTime);
          setMessage(
            'ログイン試行回数が上限を超えました。5分間お待ちください。'
          );
          return;
        }

        // エラーメッセージの設定
        switch (result.error) {
          case 'メールアドレスが確認されていません':
          case 'メールアドレスが確認されていません。確認メールをご確認ください。':
            setMessage(
              'メールアドレスが確認されていません。確認メールをご確認ください。'
            );
            break;
          case 'CredentialsSignin':
          case 'Invalid credentials':
            setMessage(
              `メールアドレスまたはパスワードが正しくありません（試行回数: ${newAttemptCount}/5）`
            );
            break;
          default:
            setMessage(
              `ログインエラーが発生しました（試行回数: ${newAttemptCount}/5）`
            );
        }
      } else if (result?.ok) {
        // ログイン成功時は試行回数をリセット
        setAttemptCount(0);

        // セッション更新待機
        const session = await getSession();
        if (session) {
          const callbackUrl = searchParams?.get('callbackUrl') || '/board';
          router.push(callbackUrl);
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setMessage(
        'サーバーエラーが発生しました。しばらく時間を置いてお試しください。'
      );
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

    // メッセージクリア
    if (message && !isBlocked) {
      setMessage('');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getRemainingTime = (): string => {
    if (!blockEndTime) return '';
    const remaining = Math.ceil(
      (blockEndTime.getTime() - new Date().getTime()) / 1000
    );
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleOAuthSignIn = async (provider: string) => {
    if (isBlocked || loading) return;

    try {
      await signIn(provider, {
        callbackUrl: '/board',
        redirect: true,
      });
    } catch (error) {
      console.error(`${provider} login error:`, error);
      setMessage(`${provider}ログインに失敗しました`);
    }
  };

  return (
    <Card sx={{ maxWidth: 420, width: '100%', boxShadow: 3 }}>
      <CardContent sx={{ p: 4 }}>
        <Box textAlign="center" mb={3}>
          <AccountCircle sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            ログイン
          </Typography>
          <Typography variant="body2" color="text.secondary">
            アカウントにログインしてボードにアクセス
          </Typography>
        </Box>

        {message && (
          <Alert
            severity={
              message.includes('確認メール')
                ? 'warning'
                : isBlocked
                  ? 'error'
                  : 'error'
            }
            sx={{ mb: 2 }}
            icon={isBlocked ? <Security /> : undefined}
          >
            {message}
            {isBlocked && (
              <Typography variant="caption" display="block" mt={1}>
                残り時間: {getRemainingTime()}
              </Typography>
            )}
          </Alert>
        )}

        {attemptCount > 0 && attemptCount < 5 && !isBlocked && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            ログイン失敗回数: {attemptCount}/5
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
            disabled={isBlocked}
            autoComplete="email"
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email color="action" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="パスワード"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            error={!!errors.password}
            helperText={errors.password}
            margin="normal"
            disabled={isBlocked}
            autoComplete="current-password"
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={togglePasswordVisibility}
                    edge="end"
                    disabled={isBlocked}
                    aria-label="toggle password visibility"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading || isBlocked}
            sx={{
              mt: 3,
              mb: 2,
              py: 1.5,
              bgcolor: isBlocked ? 'grey.400' : 'primary.main',
            }}
            data-testid="login-submit"
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : isBlocked ? (
              `ブロック中 (${getRemainingTime()})`
            ) : (
              'ログイン'
            )}
          </Button>
        </Box>

        {/* OAuth ボタンと補助リンクはフォームの外に配置して、フォーム内のsubmitボタンと分離 */}
        <Divider sx={{ my: 2 }}>
          <Typography variant="body2" color="textSecondary">
            または
          </Typography>
        </Divider>

        <Stack spacing={2} sx={{ mb: 3 }}>
          <Button
            type="button"
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={() => handleOAuthSignIn('google')}
            disabled={loading || isBlocked}
            sx={{
              height: 48,
              borderColor: '#db4437',
              color: '#db4437',
              '&:hover': {
                borderColor: '#c23321',
                backgroundColor: '#fdf2f2',
              },
              '&:disabled': {
                opacity: 0.6,
              },
            }}
          >
            Googleでログイン
          </Button>

          <Button
            type="button"
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<GitHubIcon />}
            onClick={() => handleOAuthSignIn('github')}
            disabled={loading || isBlocked}
            sx={{
              height: 48,
              borderColor: '#333',
              color: '#333',
              '&:hover': {
                borderColor: '#000',
                backgroundColor: '#f5f5f5',
              },
              '&:disabled': {
                opacity: 0.6,
              },
            }}
          >
            GitHubでログイン
          </Button>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Box
          display="flex"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1}
        >
          <Link
            component={NextLink}
            href="/auth/register"
            variant="body2"
            sx={{ color: 'primary.main' }}
          >
            新規登録
          </Link>
          <Link
            component={NextLink}
            href="/auth/reset-request"
            variant="body2"
            sx={{ color: 'text.secondary' }}
          >
            パスワードを忘れた場合
          </Link>
        </Box>

        {/* セキュリティ情報 */}
        <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
          >
            <Security fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
            セキュリティのため、5回連続でログインに失敗するとアカウントが5分間ロックされます。
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

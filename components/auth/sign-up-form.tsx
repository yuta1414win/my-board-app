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
  IconButton,
  InputAdornment,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Person,
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Cancel,
  PersonAdd,
  Security,
} from '@mui/icons-material';
import NextLink from 'next/link';
import { z } from 'zod';

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

// バリデーションスキーマ
const registerSchema = z.object({
  name: z
    .string()
    .min(1, '名前は必須です')
    .max(50, '名前は50文字以内で入力してください')
    .trim(),
  email: z
    .string()
    .email('正しいメールアドレスを入力してください')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(100, 'パスワードは100文字以内で入力してください'),
  confirmPassword: z.string().min(1, 'パスワード確認は必須です'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
});

export default function SignUpForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning'>('error');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: '',
    color: 'error',
  });
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    number: false,
    letter: false,
    special: false,
  });

  // パスワード強度チェック
  const checkPasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      number: /\d/.test(password),
      letter: /[a-zA-Z]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    setPasswordRequirements(checks);

    if (checks.length) score++;
    if (checks.number) score++;
    if (checks.letter) score++;
    if (checks.special) score++;

    const strengthMap: { [key: number]: PasswordStrength } = {
      0: { score: 0, label: '', color: 'error' },
      1: { score: 25, label: '弱い', color: 'error' },
      2: { score: 50, label: '普通', color: 'warning' },
      3: { score: 75, label: '強い', color: 'info' },
      4: { score: 100, label: '非常に強い', color: 'success' },
    };

    return strengthMap[score];
  };

  const validateForm = (): boolean => {
    const validation = registerSchema.safeParse(formData);

    if (!validation.success) {
      const newErrors: Partial<FormData> = {};
      validation.error.errors.forEach((error) => {
        const field = error.path[0] as keyof FormData;
        newErrors[field] = error.message;
      });
      setErrors(newErrors);
      return false;
    }

    // パスワード強度の追加チェック
    const hasNumber = /\d/.test(formData.password);
    const hasLetter = /[a-zA-Z]/.test(formData.password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password);

    if (!hasNumber || !hasLetter || !hasSpecial) {
      setErrors({
        password: 'パスワードは数字、英字、特殊文字を含む必要があります',
      });
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || '登録が完了しました。メールアドレスに確認メールを送信しました。');
        setMessageType('success');
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
        });
        // 3秒後にログインページへリダイレクト
        setTimeout(() => {
          router.push('/auth/signin');
        }, 3000);
      } else {
        // エラーコードによる詳細なメッセージ
        if (data.code === 'RATE_LIMIT_EXCEEDED') {
          setMessage(data.error);
          setMessageType('warning');
        } else if (data.code === 'EMAIL_ALREADY_VERIFIED') {
          setMessage('このメールアドレスは既に登録されています。ログインしてください。');
          setMessageType('warning');
        } else if (data.code === 'VERIFICATION_EMAIL_RESENT') {
          setMessage(data.message);
          setMessageType('success');
        } else {
          setMessage(data.error || '登録に失敗しました');
          setMessageType('error');
        }

        // バリデーションエラーの詳細表示
        if (data.details && Array.isArray(data.details)) {
          const fieldErrors: Partial<FormData> = {};
          data.details.forEach((detail: { field: string; message: string }) => {
            if (detail.field in formData) {
              fieldErrors[detail.field as keyof FormData] = detail.message;
            }
          });
          setErrors(fieldErrors);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage('サーバーエラーが発生しました。しばらく時間を置いてお試しください。');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // パスワード強度チェック
    if (name === 'password') {
      const strength = checkPasswordStrength(value);
      setPasswordStrength(strength);
    }
    
    // エラーをクリア
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    
    // メッセージクリア
    if (message) {
      setMessage('');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Card sx={{ maxWidth: 450, width: '100%', boxShadow: 3 }}>
      <CardContent sx={{ p: 4 }}>
        <Box textAlign="center" mb={3}>
          <PersonAdd sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            新規登録
          </Typography>
          <Typography variant="body2" color="text.secondary">
            アカウントを作成してボードにアクセス
          </Typography>
        </Box>

        {message && (
          <Alert 
            severity={messageType} 
            sx={{ mb: 2 }}
            icon={messageType === 'success' ? <CheckCircle /> : undefined}
          >
            {message}
            {messageType === 'success' && (
              <Typography variant="caption" display="block" mt={1}>
                ログインページへリダイレクトしています...
              </Typography>
            )}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="名前"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            margin="normal"
            autoComplete="name"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person color="action" />
                </InputAdornment>
              ),
            }}
          />

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
            autoComplete="email"
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
            autoComplete="new-password"
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
                    aria-label="toggle password visibility"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* パスワード強度インジケーター */}
          {formData.password && (
            <Box sx={{ mt: 1, mb: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography variant="caption" color="text.secondary">
                  パスワード強度:
                </Typography>
                <Typography 
                  variant="caption" 
                  color={passwordStrength.color}
                  fontWeight="bold"
                >
                  {passwordStrength.label}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={passwordStrength.score} 
                color={passwordStrength.color as any}
                sx={{ height: 6, borderRadius: 1 }}
              />
              
              {/* パスワード要件 */}
              <Box mt={1}>
                <List dense sx={{ py: 0 }}>
                  <ListItem sx={{ py: 0, minHeight: 28 }}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      {passwordRequirements.length ? (
                        <CheckCircle fontSize="small" color="success" />
                      ) : (
                        <Cancel fontSize="small" color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary="8文字以上" 
                      primaryTypographyProps={{ 
                        variant: 'caption',
                        color: passwordRequirements.length ? 'success.main' : 'text.secondary'
                      }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0, minHeight: 28 }}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      {passwordRequirements.number ? (
                        <CheckCircle fontSize="small" color="success" />
                      ) : (
                        <Cancel fontSize="small" color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary="数字を含む" 
                      primaryTypographyProps={{ 
                        variant: 'caption',
                        color: passwordRequirements.number ? 'success.main' : 'text.secondary'
                      }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0, minHeight: 28 }}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      {passwordRequirements.letter ? (
                        <CheckCircle fontSize="small" color="success" />
                      ) : (
                        <Cancel fontSize="small" color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary="英字を含む" 
                      primaryTypographyProps={{ 
                        variant: 'caption',
                        color: passwordRequirements.letter ? 'success.main' : 'text.secondary'
                      }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0, minHeight: 28 }}>
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      {passwordRequirements.special ? (
                        <CheckCircle fontSize="small" color="success" />
                      ) : (
                        <Cancel fontSize="small" color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary="特殊文字を含む (!@#$%^&*など)" 
                      primaryTypographyProps={{ 
                        variant: 'caption',
                        color: passwordRequirements.special ? 'success.main' : 'text.secondary'
                      }}
                    />
                  </ListItem>
                </List>
              </Box>
            </Box>
          )}

          <TextField
            fullWidth
            label="パスワード確認"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            margin="normal"
            autoComplete="new-password"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={toggleConfirmPasswordVisibility}
                    edge="end"
                    aria-label="toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
            disabled={loading}
            sx={{ mt: 3, mb: 2, py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} /> : '登録する'}
          </Button>

          <Divider sx={{ my: 2 }} />

          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary" gutterBottom>
              既にアカウントをお持ちですか？
            </Typography>
            <Link 
              component={NextLink} 
              href="/auth/signin" 
              variant="body2"
              sx={{ color: 'primary.main' }}
            >
              ログインする
            </Link>
          </Box>

          {/* セキュリティ情報 */}
          <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="caption" color="text.secondary" display="block">
              <Security fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
              登録後、メールアドレスの確認が必要です。24時間以内に確認メール内のリンクをクリックしてください。
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

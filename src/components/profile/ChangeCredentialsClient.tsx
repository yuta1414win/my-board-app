'use client';

import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  Alert,
  LinearProgress,
  Paper,
  Fade,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Lock as LockIcon,
  ArrowBack as ArrowBackIcon,
  Visibility,
  VisibilityOff,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { checkPasswordStrength, PasswordStrength } from '@/lib/validation';

interface FormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ValidationErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export default function ChangeCredentialsClient() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [passwordStrength, setPasswordStrength] =
    useState<PasswordStrength | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // パスワード強度チェック
    if (name === 'newPassword') {
      if (value) {
        setPasswordStrength(checkPasswordStrength(value));
      } else {
        setPasswordStrength(null);
      }
    }

    // リアルタイムバリデーション
    const newErrors = { ...errors };

    switch (name) {
      case 'currentPassword':
        if (!value.trim()) {
          newErrors.currentPassword = '現在のパスワードは必須です';
        } else {
          delete newErrors.currentPassword;
        }
        break;
      case 'newPassword':
        if (!value.trim()) {
          newErrors.newPassword = '新しいパスワードは必須です';
        } else if (value.length < 8) {
          newErrors.newPassword = 'パスワードは8文字以上で入力してください';
        } else {
          delete newErrors.newPassword;
        }
        // 確認パスワードも再チェック
        if (formData.confirmPassword && formData.confirmPassword !== value) {
          newErrors.confirmPassword = 'パスワードが一致しません';
        } else if (formData.confirmPassword) {
          delete newErrors.confirmPassword;
        }
        break;
      case 'confirmPassword':
        if (!value.trim()) {
          newErrors.confirmPassword = 'パスワード確認は必須です';
        } else if (value !== formData.newPassword) {
          newErrors.confirmPassword = 'パスワードが一致しません';
        } else {
          delete newErrors.confirmPassword;
        }
        break;
    }

    setErrors(newErrors);
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 最終バリデーション
    const newErrors: ValidationErrors = {};

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = '現在のパスワードは必須です';
    }

    if (!formData.newPassword.trim()) {
      newErrors.newPassword = '新しいパスワードは必須です';
    } else if (!passwordStrength?.isValid) {
      newErrors.newPassword =
        'パスワードは8文字以上で、大文字、小文字、数字、特殊文字のうち4つ以上を含む必要があります';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'パスワード確認は必須です';
    } else if (formData.confirmPassword !== formData.newPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/user/update-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'パスワードが正常に変更されました',
        });

        // 3秒後にプロフィールページに戻る
        setTimeout(() => {
          router.push('/profile');
        }, 3000);
      } else {
        const error = await response.json();
        if (error.details) {
          setErrors(error.details);
        } else {
          setMessage({
            type: 'error',
            text: error.error || 'パスワードの変更に失敗しました',
          });
        }
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'パスワードの変更に失敗しました',
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    !Object.values(errors).some((error) => error) &&
    formData.currentPassword &&
    formData.newPassword &&
    formData.confirmPassword &&
    passwordStrength?.isValid;

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* ヘッダー */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
          <IconButton onClick={() => router.back()} color="primary">
            <ArrowBackIcon />
          </IconButton>
          <LockIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 'bold', color: 'primary.main' }}
          >
            パスワード変更
          </Typography>
        </Stack>

        {/* メッセージ表示 */}
        <Fade in={!!message}>
          <div>
            {message && (
              <Alert
                severity={message.type}
                sx={{ mb: 3 }}
                onClose={() => setMessage(null)}
              >
                {message.text}
              </Alert>
            )}
          </div>
        </Fade>

        {/* フォームカード */}
        <Card elevation={2}>
          <CardContent sx={{ p: 3 }}>
            <Box component="form" onSubmit={handleSubmit}>
              {loading && <LinearProgress sx={{ mb: 2 }} />}

              <Stack spacing={3}>
                {/* 現在のパスワード */}
                <TextField
                  fullWidth
                  type={showPasswords.current ? 'text' : 'password'}
                  name="currentPassword"
                  label="現在のパスワード"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  disabled={loading}
                  error={!!errors.currentPassword}
                  helperText={errors.currentPassword}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => togglePasswordVisibility('current')}
                          edge="end"
                          disabled={loading}
                        >
                          {showPasswords.current ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* 新しいパスワード */}
                <Box>
                  <TextField
                    fullWidth
                    type={showPasswords.new ? 'text' : 'password'}
                    name="newPassword"
                    label="新しいパスワード"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    disabled={loading}
                    error={!!errors.newPassword}
                    helperText={errors.newPassword}
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => togglePasswordVisibility('new')}
                            edge="end"
                            disabled={loading}
                          >
                            {showPasswords.new ? (
                              <VisibilityOff />
                            ) : (
                              <Visibility />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  {/* パスワード強度表示 */}
                  {passwordStrength && (
                    <Paper
                      elevation={0}
                      sx={{
                        mt: 1,
                        p: 2,
                        bgcolor: 'grey.50',
                        border: 1,
                        borderColor: 'grey.200',
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ mb: 1 }}
                      >
                        <SecurityIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          パスワード強度:
                        </Typography>
                        <Typography
                          variant="body2"
                          color={
                            passwordStrength.isValid
                              ? 'success.main'
                              : 'warning.main'
                          }
                          sx={{ fontWeight: 'medium' }}
                        >
                          {passwordStrength.message}
                        </Typography>
                      </Stack>
                      <Stack spacing={0.5}>
                        <Typography
                          variant="caption"
                          color={
                            passwordStrength.requirements.minLength
                              ? 'success.main'
                              : 'text.secondary'
                          }
                        >
                          ✓ 8文字以上
                        </Typography>
                        <Typography
                          variant="caption"
                          color={
                            passwordStrength.requirements.hasUpperCase
                              ? 'success.main'
                              : 'text.secondary'
                          }
                        >
                          ✓ 大文字を含む
                        </Typography>
                        <Typography
                          variant="caption"
                          color={
                            passwordStrength.requirements.hasLowerCase
                              ? 'success.main'
                              : 'text.secondary'
                          }
                        >
                          ✓ 小文字を含む
                        </Typography>
                        <Typography
                          variant="caption"
                          color={
                            passwordStrength.requirements.hasNumber
                              ? 'success.main'
                              : 'text.secondary'
                          }
                        >
                          ✓ 数字を含む
                        </Typography>
                        <Typography
                          variant="caption"
                          color={
                            passwordStrength.requirements.hasSpecialChar
                              ? 'success.main'
                              : 'text.secondary'
                          }
                        >
                          ✓ 特殊文字を含む
                        </Typography>
                      </Stack>
                    </Paper>
                  )}
                </Box>

                {/* パスワード確認 */}
                <TextField
                  fullWidth
                  type={showPasswords.confirm ? 'text' : 'password'}
                  name="confirmPassword"
                  label="パスワード確認"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={loading}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => togglePasswordVisibility('confirm')}
                          edge="end"
                          disabled={loading}
                        >
                          {showPasswords.confirm ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* ボタン */}
                <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || !isFormValid}
                    startIcon={<LockIcon />}
                    sx={{ flex: 1 }}
                  >
                    パスワード変更
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => router.back()}
                    disabled={loading}
                    sx={{ flex: 1 }}
                  >
                    キャンセル
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

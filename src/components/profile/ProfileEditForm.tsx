'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Stack,
  LinearProgress,
  Typography,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { UserProfile } from '@/models/User';

interface ProfileEditFormProps {
  user: UserProfile;
  onUpdate: (updatedUser: UserProfile) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  bio: string;
  quickComment: string;
}

interface ValidationErrors {
  name?: string;
  bio?: string;
  quickComment?: string;
}

export default function ProfileEditForm({ 
  user, 
  onUpdate, 
  onError, 
  onCancel 
}: ProfileEditFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: user.name || '',
    bio: user.bio || '',
    quickComment: user.quickComment || '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // フォームのリアルタイムバリデーション
  const validateField = (name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case 'name':
        if (!value.trim()) return '名前は必須です';
        if (value.length > 50) return '名前は50文字以内で入力してください';
        return undefined;
      case 'bio':
        if (value.length > 200) return '自己紹介は200文字以内で入力してください';
        return undefined;
      case 'quickComment':
        if (value.length > 50) return '一言コメントは50文字以内で入力してください';
        return undefined;
      default:
        return undefined;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof FormData;
    
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));

    // リアルタイムバリデーション
    const error = validateField(fieldName, value);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 全フィールドをバリデーション
    const newErrors: ValidationErrors = {};
    Object.entries(formData).forEach(([key, value]) => {
      const error = validateField(key as keyof FormData, value);
      if (error) {
        newErrors[key as keyof FormData] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          bio: formData.bio.trim() || undefined,
          quickComment: formData.quickComment.trim() || undefined,
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        onUpdate(updatedUser);
      } else {
        const error = await response.json();
        if (error.details) {
          setErrors(error.details);
        } else {
          onError(error.error || 'プロフィールの更新に失敗しました');
        }
      }
    } catch (error) {
      onError('プロフィールの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name || '',
      bio: user.bio || '',
      quickComment: user.quickComment || '',
    });
    setErrors({});
    onCancel();
  };

  const isFormValid = !Object.values(errors).some(error => error) && formData.name.trim();

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      
      <Stack spacing={3}>
        {/* 名前 */}
        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1 }}
          >
            名前 *
          </Typography>
          <TextField
            fullWidth
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="表示名を入力してください"
            disabled={loading}
            error={!!errors.name}
            helperText={errors.name || `${formData.name.length}/50文字`}
            inputProps={{ maxLength: 50 }}
          />
        </Box>

        {/* 自己紹介 */}
        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1 }}
          >
            自己紹介
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            placeholder="自己紹介を入力してください"
            disabled={loading}
            error={!!errors.bio}
            helperText={errors.bio || `${formData.bio.length}/200文字`}
            inputProps={{ maxLength: 200 }}
          />
        </Box>

        {/* 一言コメント */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography
              variant="body2"
              color="text.secondary"
            >
              一言コメント
            </Typography>
            <Chip 
              label="吹き出し表示" 
              size="small" 
              variant="outlined" 
              color="primary"
            />
          </Stack>
          <TextField
            fullWidth
            name="quickComment"
            value={formData.quickComment}
            onChange={handleInputChange}
            placeholder="短いコメントを入力してください"
            disabled={loading}
            error={!!errors.quickComment}
            helperText={errors.quickComment || `${formData.quickComment.length}/50文字`}
            inputProps={{ maxLength: 50 }}
          />
        </Box>

        {/* ボタン */}
        <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
          <Button
            type="submit"
            startIcon={<SaveIcon />}
            variant="contained"
            disabled={loading || !isFormValid}
            sx={{ flex: 1 }}
          >
            保存
          </Button>
          <Button
            startIcon={<CancelIcon />}
            variant="outlined"
            onClick={handleCancel}
            disabled={loading}
            sx={{ flex: 1 }}
          >
            キャンセル
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';

interface Post {
  _id: string;
  title: string;
  content: string;
  author: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

interface PostFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editPost?: Post | null;
}

interface FormData {
  title: string;
  content: string;
}

export default function PostForm({
  open,
  onClose,
  onSuccess,
  editPost,
}: PostFormProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editPost) {
      setFormData({
        title: editPost.title,
        content: editPost.content,
      });
    } else {
      setFormData({
        title: '',
        content: '',
      });
    }
    setErrors({});
    setMessage('');
  }, [editPost, open]);

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'タイトルは必須です';
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'タイトルは100文字以内で入力してください';
    }

    if (!formData.content.trim()) {
      newErrors.content = '内容は必須です';
    } else if (formData.content.trim().length > 1000) {
      newErrors.content = '内容は1000文字以内で入力してください';
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
      const url = editPost ? `/api/posts/${editPost._id}` : '/api/posts';
      const method = editPost ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        setMessage(data.error || '保存に失敗しました');
      }
    } catch (error) {
      setMessage('サーバーエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // エラーをクリア
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{editPost ? '投稿を編集' : '新しい投稿'}</DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {message && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {message}
            </Alert>
          )}

          <TextField
            fullWidth
            label="タイトル"
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={!!errors.title}
            helperText={errors.title || `${formData.title.length}/100文字`}
            margin="normal"
            disabled={loading}
          />

          <TextField
            fullWidth
            label="内容"
            name="content"
            value={formData.content}
            onChange={handleChange}
            error={!!errors.content}
            helperText={errors.content || `${formData.content.length}/1000文字`}
            margin="normal"
            multiline
            rows={8}
            disabled={loading}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            キャンセル
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? (
              <CircularProgress size={20} />
            ) : editPost ? (
              '更新'
            ) : (
              '投稿'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  LinearProgress,
  Breadcrumbs,
  Link,
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';

export default function NewPostPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const titleLength = title.length;
  const contentLength = content.length;
  const titleMaxLength = 100;
  const contentMaxLength = 1000;

  const getTitleHelperText = () => {
    if (titleLength > titleMaxLength) {
      return `文字数が上限を超えています（${titleLength}/${titleMaxLength}）`;
    }
    return `${titleLength}/${titleMaxLength}文字`;
  };

  const getContentHelperText = () => {
    if (contentLength > contentMaxLength) {
      return `文字数が上限を超えています（${contentLength}/${contentMaxLength}）`;
    }
    return `${contentLength}/${contentMaxLength}文字`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      setError('タイトルと内容を入力してください');
      return;
    }

    if (titleLength > titleMaxLength || contentLength > contentMaxLength) {
      setError('文字数制限を超えています');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/board');
      } else {
        setError(data.error || '投稿に失敗しました');
      }
    } catch (error) {
      setError('サーバーエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (!session) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Alert severity="warning">
          投稿するにはログインが必要です
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link 
          component="button" 
          variant="inherit" 
          onClick={handleBack}
          sx={{ textDecoration: 'none', cursor: 'pointer' }}
        >
          掲示板
        </Link>
        <Typography color="text.primary">新規投稿</Typography>
      </Breadcrumbs>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          ✍️ 新しい投稿を作成
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          他の会員と情報を共有しましょう
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="タイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            margin="normal"
            required
            disabled={loading}
            error={titleLength > titleMaxLength}
            helperText={getTitleHelperText()}
          />
          
          <Box sx={{ mb: 1 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min((titleLength / titleMaxLength) * 100, 100)}
              color={titleLength > titleMaxLength ? 'error' : 'primary'}
            />
          </Box>
          
          <TextField
            fullWidth
            label="内容"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            margin="normal"
            multiline
            rows={10}
            required
            disabled={loading}
            error={contentLength > contentMaxLength}
            helperText={getContentHelperText()}
            placeholder="投稿の内容を入力してください..."
          />

          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min((contentLength / contentMaxLength) * 100, 100)}
              color={contentLength > contentMaxLength ? 'error' : 'primary'}
            />
          </Box>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={handleBack}
              disabled={loading}
            >
              戻る
            </Button>
            
            <Button
              type="submit"
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <Save />}
              disabled={loading || titleLength > titleMaxLength || contentLength > contentMaxLength}
              sx={{ flex: 1 }}
            >
              {loading ? '投稿中...' : '投稿する'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
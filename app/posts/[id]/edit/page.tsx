'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  Skeleton,
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';

interface Post {
  _id: string;
  title: string;
  content: string;
  author: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPost, setLoadingPost] = useState(true);
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

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/posts/${params.id}`);
      const data = await response.json();

      if (response.ok) {
        setPost(data);
        setTitle(data.title);
        setContent(data.content);
        
        // 投稿者チェック
        if (session?.user?.id !== data.author) {
          setError('この投稿を編集する権限がありません');
        }
      } else {
        setError(data.error || '投稿の読み込みに失敗しました');
      }
    } catch (error) {
      setError('サーバーエラーが発生しました');
    } finally {
      setLoadingPost(false);
    }
  };

  useEffect(() => {
    if (params.id && session) {
      fetchPost();
    }
  }, [params.id, session]);

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
      const response = await fetch(`/api/posts/${params.id}`, {
        method: 'PUT',
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
        setError(data.error || '更新に失敗しました');
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
          編集するにはログインが必要です
        </Alert>
      </Container>
    );
  }

  if (loadingPost) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Skeleton variant="text" height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
      </Container>
    );
  }

  if (error && !post) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Alert severity="error">
          {error}
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
          onClick={() => router.push('/board')}
          sx={{ textDecoration: 'none', cursor: 'pointer' }}
        >
          掲示板
        </Link>
        <Typography color="text.primary">投稿を編集</Typography>
      </Breadcrumbs>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          ✏️ 投稿を編集
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          投稿内容を修正してください
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
              {loading ? '更新中...' : '更新する'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
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

interface PostResponse {
  post: Post;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    isOwner: boolean;
    isAdmin: boolean;
  };
}

interface APIError {
  error: string;
  code: string;
  action?: string;
  postId?: string;
}

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [post, setPost] = useState<Post | null>(null);
  const [permissions, setPermissions] = useState<{
    canEdit: boolean;
    canDelete: boolean;
    isOwner: boolean;
    isAdmin: boolean;
  } | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPost, setLoadingPost] = useState(true);
  const [error, setError] = useState('');
  const [permissionError, setPermissionError] = useState('');

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
        // 新しいAPIレスポンス形式に対応
        if (data.post && data.permissions) {
          setPost(data.post);
          setPermissions(data.permissions);
          setTitle(data.post.title);
          setContent(data.post.content);

          // 権限チェック
          if (!data.permissions.canEdit) {
            setPermissionError(
              data.permissions.isAdmin
                ? '管理者権限でのみ編集可能です'
                : 'この投稿を編集する権限がありません'
            );
          }
        } else {
          // 旧形式のレスポンスとの互換性
          setPost(data);
          setTitle(data.title);
          setContent(data.content);

          // 従来の権限チェック
          if (session?.user?.id !== data.author) {
            setPermissionError('この投稿を編集する権限がありません');
          } else {
            setPermissions({
              canEdit: true,
              canDelete: true,
              isOwner: true,
              isAdmin: session?.user?.role === 'admin',
            });
          }
        }
      } else {
        // エラーレスポンスの詳細処理
        const apiError = data as APIError;
        if (response.status === 403) {
          setPermissionError(apiError.error || 'アクセスが拒否されました');
        } else if (response.status === 404) {
          setError('投稿が見つかりません');
        } else {
          setError(apiError.error || '投稿の読み込みに失敗しました');
        }
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
        // エラー処理の強化
        const apiError = data as APIError;
        if (response.status === 403) {
          setPermissionError(apiError.error || 'アクセスが拒否されました');
        } else if (response.status === 400) {
          setError(apiError.error || '入力内容に問題があります');
        } else {
          setError(apiError.error || '更新に失敗しました');
        }
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
        <Alert severity="warning">編集するにはログインが必要です</Alert>
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

  // 権限エラーの表示
  if (permissionError) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {permissionError}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => router.push('/board')}
        >
          掲示板に戻る
        </Button>
      </Container>
    );
  }

  if (error && !post) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => router.push('/board')}
        >
          掲示板に戻る
        </Button>
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

        {permissions && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {permissions.isAdmin
              ? '管理者として編集中'
              : 'あなたの投稿を編集中'}
            {permissions.isOwner && !permissions.isAdmin && '（投稿者）'}
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
              disabled={
                loading ||
                titleLength > titleMaxLength ||
                contentLength > contentMaxLength ||
                !permissions?.canEdit ||
                !!permissionError
              }
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

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  LinearProgress,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Preview as PreviewIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useRequireAuth } from '@/hooks/useRequireAuth';

const POST_CATEGORIES = [
  { value: 'general', label: '一般' },
  { value: 'question', label: '質問' },
  { value: 'discussion', label: 'ディスカッション' },
  { value: 'announcement', label: 'お知らせ' },
  { value: 'tech', label: 'テクノロジー' },
  { value: 'hobby', label: '趣味' },
];

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  authorId: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  
  const { loading: authLoading, authenticated, user, error: authError } = useRequireAuth({
    requireEmailVerification: false,
  });

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // 投稿データの取得
  useEffect(() => {
    const fetchPost = async () => {
      if (!postId || !authenticated) return;

      try {
        const response = await fetch(`/api/posts/${postId}`);
        if (response.ok) {
          const postData = await response.json();
          setPost(postData);
          setFormData({
            title: postData.title,
            content: postData.content,
            category: postData.category,
          });
        } else if (response.status === 404) {
          setSubmitError('投稿が見つかりません。');
        } else if (response.status === 403) {
          setSubmitError('この投稿を編集する権限がありません。');
        } else {
          throw new Error('投稿の取得に失敗しました。');
        }
      } catch (error: any) {
        console.error('Fetch post error:', error);
        setSubmitError(error.message || '投稿の取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, authenticated]);

  // ローディング表示
  if (authLoading || loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
          <Card elevation={2}>
            <CardContent sx={{ p: 3 }}>
              <Skeleton variant="rectangular" height={300} />
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  // エラー表示
  if (authError || submitError) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            エラーが発生しました
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {authError || submitError}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => router.back()}
            sx={{ mt: 2 }}
          >
            戻る
          </Button>
        </Box>
      </Container>
    );
  }

  // 認証されていない場合
  if (!authenticated) {
    return null;
  }

  // 投稿が存在しない、または権限がない場合
  if (!post || (post.authorId !== user?.id)) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            アクセスできません
          </Typography>
          <Typography variant="body2" color="text.secondary">
            この投稿を編集する権限がありません。
          </Typography>
          <Button
            variant="outlined"
            onClick={() => router.push('/board')}
            sx={{ mt: 2 }}
          >
            掲示板に戻る
          </Button>
        </Box>
      </Container>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setSubmitError(null);
  };

  const handleCategoryChange = (event: any) => {
    setFormData(prev => ({
      ...prev,
      category: event.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    if (!formData.title.trim()) {
      setSubmitError('タイトルを入力してください。');
      return;
    }
    
    if (!formData.content.trim()) {
      setSubmitError('本文を入力してください。');
      return;
    }

    if (formData.title.length > 100) {
      setSubmitError('タイトルは100文字以内で入力してください。');
      return;
    }

    if (formData.content.length > 5000) {
      setSubmitError('本文は5000文字以内で入力してください。');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: formData.category,
        }),
      });

      if (response.ok) {
        router.push(`/board?success=updated&postId=${postId}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '投稿の更新に失敗しました。');
      }
    } catch (error: any) {
      console.error('Post update error:', error);
      setSubmitError(error.message || 'ネットワークエラーが発生しました。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/board?success=deleted');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '投稿の削除に失敗しました。');
      }
    } catch (error: any) {
      console.error('Post delete error:', error);
      setSubmitError(error.message || 'ネットワークエラーが発生しました。');
    } finally {
      setSubmitting(false);
      setDeleteConfirm(false);
    }
  };

  const handleCancel = () => {
    const hasChanges = 
      formData.title !== post.title ||
      formData.content !== post.content ||
      formData.category !== post.category;

    if (hasChanges) {
      if (confirm('変更が保存されていませんが、キャンセルしますか？')) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  const getCategoryLabel = (value: string) => {
    return POST_CATEGORIES.find(cat => cat.value === value)?.label || value;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('ja-JP');
    } catch {
      return dateString;
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* ヘッダー */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
          <EditIcon sx={{ fontSize: 32, color: 'info.main' }} />
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 'bold', color: 'info.main' }}
          >
            投稿編集
          </Typography>
        </Stack>

        <form onSubmit={handleSubmit}>
          <Card elevation={2}>
            <CardContent sx={{ p: 3 }}>
              {/* エラーメッセージ */}
              {submitError && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {submitError}
                </Alert>
              )}

              {/* 投稿情報 */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  投稿者: {post.author.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  作成日: {formatDate(post.createdAt)}
                </Typography>
                {post.createdAt !== post.updatedAt && (
                  <Typography variant="body2" color="text.secondary">
                    最終更新: {formatDate(post.updatedAt)}
                  </Typography>
                )}
              </Box>

              <Stack spacing={3}>
                {/* カテゴリー選択 */}
                <FormControl fullWidth>
                  <InputLabel id="category-label">カテゴリー</InputLabel>
                  <Select
                    labelId="category-label"
                    value={formData.category}
                    label="カテゴリー"
                    onChange={handleCategoryChange}
                    disabled={submitting}
                  >
                    {POST_CATEGORIES.map((category) => (
                      <MenuItem key={category.value} value={category.value}>
                        {category.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* タイトル */}
                <TextField
                  fullWidth
                  name="title"
                  label="タイトル"
                  value={formData.title}
                  onChange={handleInputChange}
                  disabled={submitting}
                  required
                  inputProps={{ maxLength: 100 }}
                  helperText={`${formData.title.length}/100文字`}
                />

                {/* 本文 */}
                <TextField
                  fullWidth
                  multiline
                  rows={12}
                  name="content"
                  label="本文"
                  value={formData.content}
                  onChange={handleInputChange}
                  disabled={submitting}
                  required
                  inputProps={{ maxLength: 5000 }}
                  helperText={`${formData.content.length}/5000文字`}
                />

                {/* プレビューモード */}
                {preview && (
                  <Box sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                        プレビュー
                      </Typography>
                      <Chip
                        label={getCategoryLabel(formData.category)}
                        color="primary"
                        size="small"
                      />
                    </Stack>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {formData.title || 'タイトル未入力'}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.7,
                        color: formData.content ? 'text.primary' : 'text.secondary',
                      }}
                    >
                      {formData.content || '本文未入力'}
                    </Typography>
                  </Box>
                )}

                {/* 進捗バー */}
                {submitting && <LinearProgress />}

                {/* アクションボタン */}
                <Stack direction="row" spacing={2} justifyContent="space-between" flexWrap="wrap">
                  {/* 削除ボタン */}
                  <Button
                    startIcon={<DeleteIcon />}
                    variant="outlined"
                    color="error"
                    onClick={handleDelete}
                    disabled={submitting}
                  >
                    {deleteConfirm ? '本当に削除' : '削除'}
                  </Button>

                  {/* 右側のボタングループ */}
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <Button
                      startIcon={<PreviewIcon />}
                      variant="outlined"
                      onClick={() => setPreview(!preview)}
                      disabled={submitting}
                    >
                      {preview ? 'プレビュー終了' : 'プレビュー'}
                    </Button>
                    
                    <Button
                      startIcon={<CancelIcon />}
                      variant="outlined"
                      onClick={handleCancel}
                      disabled={submitting}
                    >
                      キャンセル
                    </Button>
                    
                    <Button
                      type="submit"
                      startIcon={<SaveIcon />}
                      variant="contained"
                      color="info"
                      disabled={submitting || !formData.title.trim() || !formData.content.trim()}
                      sx={{ minWidth: 120 }}
                    >
                      {submitting ? '更新中...' : '更新する'}
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </form>
      </Box>
    </Container>
  );
}
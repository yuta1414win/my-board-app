'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@mui/material';
import {
  PostAdd as PostAddIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Preview as PreviewIcon,
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

export default function NewPostPage() {
  const router = useRouter();
  const { loading, authenticated, user, error } = useRequireAuth({
    requireEmailVerification: false,
  });

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  // ローディング表示
  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4, mb: 4 }}>
          <LinearProgress />
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              読み込み中...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  // エラー表示
  if (error) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            エラーが発生しました
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
        </Box>
      </Container>
    );
  }

  // 認証されていない場合
  if (!authenticated) {
    return null;
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
      const response = await fetch('/api/posts', {
        method: 'POST',
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
        const post = await response.json();
        router.push(`/board?success=created&postId=${post.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '投稿の作成に失敗しました。');
      }
    } catch (error: any) {
      console.error('Post creation error:', error);
      setSubmitError(error.message || 'ネットワークエラーが発生しました。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (formData.title || formData.content) {
      if (confirm('入力した内容が失われますが、キャンセルしますか？')) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  const getCategoryLabel = (value: string) => {
    return POST_CATEGORIES.find(cat => cat.value === value)?.label || value;
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* ヘッダー */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
          <PostAddIcon sx={{ fontSize: 32, color: 'success.main' }} />
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 'bold', color: 'success.main' }}
          >
            新規投稿
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

              {/* 投稿者情報 */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  投稿者
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {user?.name || 'ユーザー'}
                </Typography>
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
                  placeholder="投稿のタイトルを入力してください"
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
                  placeholder="投稿の内容を入力してください"
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
                <Stack direction="row" spacing={2} justifyContent="flex-end" flexWrap="wrap">
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
                    color="success"
                    disabled={submitting || !formData.title.trim() || !formData.content.trim()}
                    sx={{ minWidth: 120 }}
                  >
                    {submitting ? '投稿中...' : '投稿する'}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </form>

        {/* ヒント */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
          <Typography variant="body2" color="info.dark">
            <strong>投稿のヒント:</strong><br />
            • 明確で分かりやすいタイトルを付けましょう<br />
            • 適切なカテゴリーを選択してください<br />
            • 丁寧で建設的な内容を心がけましょう<br />
            • 個人情報や機密情報は投稿しないでください
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}
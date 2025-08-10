'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Stack,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

export default function BoardPage() {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [openEditDialog, setOpenEditDialog] = useState(false);

  // 投稿一覧を取得
  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      const data = await response.json();
      if (data.success) {
        setPosts(data.data);
      }
    } catch {
      setError('投稿の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // 新規投稿
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }

    if (title.length > 50) {
      setError('タイトルは50文字以内にしてください');
      return;
    }

    if (!content.trim()) {
      setError('本文を入力してください');
      return;
    }

    if (content.length > 200) {
      setError('本文は200文字以内にしてください');
      return;
    }

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      });

      const data = await response.json();

      if (data.success) {
        setTitle('');
        setContent('');
        fetchPosts();
      } else {
        setError(data.error || '投稿に失敗しました');
      }
    } catch {
      setError('投稿に失敗しました');
    }
  };

  // 投稿削除
  const handleDelete = async (id) => {
    if (!confirm('本当に削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchPosts();
      } else {
        setError('削除に失敗しました');
      }
    } catch {
      setError('削除に失敗しました');
    }
  };

  // 編集開始
  const handleEditStart = (post) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditContent(post.content);
    setOpenEditDialog(true);
  };

  // 編集保存
  const handleEditSave = async () => {
    setError('');

    if (!editTitle.trim()) {
      setError('タイトルを入力してください');
      return;
    }

    if (editTitle.length > 50) {
      setError('タイトルは50文字以内にしてください');
      return;
    }

    if (!editContent.trim()) {
      setError('本文を入力してください');
      return;
    }

    if (editContent.length > 200) {
      setError('本文は200文字以内にしてください');
      return;
    }

    try {
      const response = await fetch(`/api/posts/${editingPost._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });

      const data = await response.json();

      if (data.success) {
        setOpenEditDialog(false);
        setEditingPost(null);
        setEditTitle('');
        setEditContent('');
        fetchPosts();
      } else {
        setError(data.error || '更新に失敗しました');
      }
    } catch {
      setError('更新に失敗しました');
    }
  };

  // 編集キャンセル
  const handleEditCancel = () => {
    setOpenEditDialog(false);
    setEditingPost(null);
    setEditTitle('');
    setEditContent('');
    setError('');
  };

  // 日付フォーマット
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString('ja-JP') +
      ' ' +
      date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    );
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: { xs: 2, sm: 4 }, px: { xs: 1, sm: 2 } }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          align="center"
          sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
        >
          オープン掲示板
        </Typography>

        {/* 投稿フォーム */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  name="title"
                  placeholder="タイトルを入力してください（50文字以内）"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  error={title.length > 50}
                  helperText={`${title.length}/50文字`}
                  label="タイトル"
                  required
                />
                <TextField
                  fullWidth
                  name="content"
                  multiline
                  rows={3}
                  placeholder="本文を入力してください（200文字以内）"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  error={content.length > 200}
                  helperText={`${content.length}/200文字`}
                  label="本文"
                  required
                />
                {error && <Alert severity="error">{error}</Alert>}
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={
                    !title.trim() ||
                    title.length > 50 ||
                    !content.trim() ||
                    content.length > 200
                  }
                  fullWidth
                  sx={{ height: 48 }}
                >
                  投稿する
                </Button>
              </Stack>
            </form>
          </CardContent>
        </Card>

        {/* 投稿一覧 */}
        <Stack spacing={2}>
          {posts.length === 0 ? (
            <Typography align="center" color="textSecondary">
              まだ投稿がありません
            </Typography>
          ) : (
            posts.map((post) => (
              <Card
                key={post._id}
                sx={{ transition: 'all 0.3s', '&:hover': { boxShadow: 3 } }}
              >
                <CardContent>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                  >
                    <Box flex={1} sx={{ minWidth: 0 }}>
                      <Typography
                        variant="h6"
                        component="h2"
                        gutterBottom
                        sx={{
                          wordBreak: 'break-word',
                          fontWeight: 500,
                          mb: 1,
                        }}
                      >
                        {post.title}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          mb: 1,
                        }}
                      >
                        {post.content}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        display="block"
                      >
                        {formatDate(post.createdAt)}
                        {post.updatedAt !== post.createdAt && ' (編集済み)'}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        ml: 2,
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => handleEditStart(post)}
                        color="primary"
                        sx={{ p: { xs: 0.5, sm: 1 } }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(post._id)}
                        color="error"
                        sx={{ p: { xs: 0.5, sm: 1 } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))
          )}
        </Stack>

        {/* 編集ダイアログ */}
        <Dialog
          open={openEditDialog}
          onClose={handleEditCancel}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>投稿を編集</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                error={editTitle.length > 50}
                helperText={`${editTitle.length}/50文字`}
                label="タイトル"
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                error={editContent.length > 200}
                helperText={`${editContent.length}/200文字`}
                label="本文"
              />
              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleEditCancel}>キャンセル</Button>
            <Button
              onClick={handleEditSave}
              variant="contained"
              color="primary"
              disabled={
                !editTitle.trim() ||
                editTitle.length > 50 ||
                !editContent.trim() ||
                editContent.length > 200
              }
            >
              保存
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}

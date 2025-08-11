'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Pagination,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { MoreVert, Edit, Delete, Warning } from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Post {
  _id: string;
  title: string;
  content: string;
  author: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

interface PostPermissions {
  canEdit: boolean;
  canDelete: boolean;
  isOwner: boolean;
  isAdmin: boolean;
}

interface APIError {
  error: string;
  code: string;
  action?: string;
  postId?: string;
}

interface PostListProps {
  onEditPost: (post: Post) => void;
  refresh: number;
}

export default function PostList({ onEditPost, refresh }: PostListProps) {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchPosts = async (currentPage: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/posts?page=${currentPage}&limit=10`);
      const data = await response.json();

      if (response.ok) {
        setPosts(data.posts);
        setTotalPages(data.pagination.totalPages);
      } else {
        setError(data.error || '投稿の読み込みに失敗しました');
      }
    } catch (error) {
      setError('サーバーエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(page);
  }, [page, refresh]);

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, post: Post) => {
    setAnchorEl(event.currentTarget);
    setSelectedPost(post);
  };

  const handleMenuClose = () => {
    // メニューだけを閉じる（選択中の投稿は維持）
    setAnchorEl(null);
  };

  const handleEdit = () => {
    if (selectedPost) {
      window.location.href = `/posts/${selectedPost._id}/edit`;
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (!selectedPost) return;
    // 権限チェック - 管理者または投稿者のみ削除可能
    const canDelete =
      session?.user?.role === 'admin' ||
      session?.user?.id === selectedPost.author;
    if (!canDelete) {
      const errorMessage =
        session?.user?.role === 'admin'
          ? '削除権限がありません'
          : '自分が投稿した内容のみ削除できます';
      setError(errorMessage);
      handleMenuClose();
      return;
    }
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPost) return;

    console.log('削除開始 - 投稿ID:', selectedPost._id);
    console.log('選択された投稿:', selectedPost);

    setDeleting(true);
    setError(''); // エラーをクリア

    try {
      const deleteUrl = `/api/posts/${selectedPost._id}`;
      console.log('削除API呼び出し:', deleteUrl);

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
      });

      console.log('削除APIレスポンス status:', response.status);

      if (response.ok) {
        console.log('削除成功');
        // 削除成功時の処理
        setDeleteDialogOpen(false);
        setSelectedPost(null);
        // 一覧を再取得
        await fetchPosts(page);
      } else {
        const data = (await response.json()) as APIError;
        let errorMessage = data.error || '削除に失敗しました';

        // APIエラーコードに基づく詳細なエラーメッセージ
        switch (response.status) {
          case 403:
            errorMessage =
              data.code === 'PERMISSION_DENIED'
                ? data.error || 'この投稿を削除する権限がありません'
                : 'アクセスが拒否されました';
            break;
          case 404:
            errorMessage = '投稿が見つかりません';
            break;
          case 400:
            errorMessage =
              data.code === 'INVALID_POST_ID'
                ? '無効な投稿IDです'
                : '入力内容に問題があります';
            break;
          case 401:
            errorMessage = '認証が必要です。再度ログインしてください';
            break;
          default:
            errorMessage = data.error || 'サーバーエラーが発生しました';
        }

        setError(errorMessage);
        console.error('削除エラー:', errorMessage);
        console.error('エラーレスポンス:', data);
        // エラー時もダイアログを閉じる
        setDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error('削除処理エラー:', error);
      setError('サーバーエラーが発生しました');
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedPost(null);
  };

  if (loading && posts.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (posts.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        投稿がありません。最初の投稿をしてみましょう！
      </Alert>
    );
  }

  return (
    <Box>
      {posts.map((post) => (
        <Card key={post._id} sx={{ mb: 2 }}>
          <CardContent>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="flex-start"
            >
              <Box flex={1}>
                <Typography variant="h6" component="h2" gutterBottom>
                  {post.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  paragraph
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '150px',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 6,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {post.content}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {post.authorName} •{' '}
                  {formatDistanceToNow(new Date(post.createdAt), {
                    addSuffix: true,
                    locale: ja,
                  })}
                </Typography>
              </Box>

              <IconButton onClick={(e) => handleMenuOpen(e, post)} size="small">
                <MoreVert />
              </IconButton>
            </Box>
          </CardContent>
        </Card>
      ))}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedPost &&
          (session?.user?.id === selectedPost.author ||
            session?.user?.role === 'admin') && (
            <MenuItem onClick={handleEdit}>
              <Edit sx={{ mr: 1 }} fontSize="small" />
              編集
              {session?.user?.role === 'admin' &&
                session?.user?.id !== selectedPost.author && (
                  <Typography variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
                    （管理者）
                  </Typography>
                )}
            </MenuItem>
          )}
        {selectedPost &&
          (session?.user?.id === selectedPost.author ||
            session?.user?.role === 'admin') && (
            <MenuItem onClick={handleDeleteClick}>
              <Delete sx={{ mr: 1 }} fontSize="small" />
              削除
              {session?.user?.role === 'admin' &&
                session?.user?.id !== selectedPost.author && (
                  <Typography variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
                    （管理者）
                  </Typography>
                )}
            </MenuItem>
          )}
      </Menu>

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <Warning sx={{ mr: 1, color: 'warning.main' }} />
          投稿を削除
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            以下の投稿を削除しますか？
          </Typography>
          {selectedPost && (
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                {selectedPost.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedPost.content.substring(0, 100)}
                {selectedPost.content.length > 100 && '...'}
              </Typography>
            </Box>
          )}
          <Typography variant="body2" color="error.main" sx={{ mt: 2 }}>
            ※この操作は取り消すことができません
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            キャンセル
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : null}
          >
            {deleting ? '削除中...' : '削除する'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

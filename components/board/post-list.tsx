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
} from '@mui/material';
import { MoreVert, Edit, Delete } from '@mui/icons-material';
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
    setAnchorEl(null);
    setSelectedPost(null);
  };

  const handleEdit = () => {
    if (selectedPost) {
      onEditPost(selectedPost);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!selectedPost) return;

    const confirmMessage = `「${selectedPost.title}」を削除しますか？\n\n※この操作は取り消せません`;
    if (window.confirm(confirmMessage)) {
      try {
        const response = await fetch(`/api/posts/${selectedPost._id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          fetchPosts(page);
        } else {
          const data = await response.json();
          setError(data.error || '削除に失敗しました');
        }
      } catch (error) {
        setError('サーバーエラーが発生しました');
      }
    }
    handleMenuClose();
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

              {session?.user?.id === post.author && (
                <IconButton
                  onClick={(e) => handleMenuOpen(e, post)}
                  size="small"
                >
                  <MoreVert />
                </IconButton>
              )}
            </Box>
          </CardContent>
        </Card>
      ))}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <Edit sx={{ mr: 1 }} fontSize="small" />
          編集
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <Delete sx={{ mr: 1 }} fontSize="small" />
          削除
        </MenuItem>
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
    </Box>
  );
}

'use client';

import React, { useState } from 'react';
import { Box, Typography, Fab, Container, Paper } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import PostList from '../../components/board/post-list';
import PostForm from '../../components/board/post-form';

interface Post {
  _id: string;
  title: string;
  content: string;
  author: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export default function BoardPage() {
  const { data: session } = useSession();
  const [postFormOpen, setPostFormOpen] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreatePost = () => {
    if (!session) return;
    window.location.href = '/posts/new';
  };

  const handleEditPost = (post: Post) => {
    setEditPost(post);
    setPostFormOpen(true);
  };

  const handleCloseForm = () => {
    setPostFormOpen(false);
    setEditPost(null);
  };

  const handleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          📝 掲示板
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          会員同士で情報を共有し、交流を深めましょう！
        </Typography>

        {session && (
          <Typography variant="body2" color="text.secondary">
            こんにちは、{session.user?.name}さん 👋
          </Typography>
        )}
      </Paper>

      <PostList onEditPost={handleEditPost} refresh={refreshTrigger} />

      <PostForm
        open={postFormOpen}
        onClose={handleCloseForm}
        onSuccess={handleSuccess}
        editPost={editPost}
      />

      {session && (
        <Fab
          color="primary"
          aria-label="新規投稿"
          onClick={handleCreatePost}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            '&:hover': {
              transform: 'scale(1.1)',
            },
            transition: 'transform 0.2s ease-in-out',
          }}
        >
          <Add />
        </Fab>
      )}
    </Container>
  );
}

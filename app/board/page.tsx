'use client';

import React, { useState } from 'react';
import { Box, Typography, Fab } from '@mui/material';
import { Add } from '@mui/icons-material';
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
  const [postFormOpen, setPostFormOpen] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreatePost = () => {
    setEditPost(null);
    setPostFormOpen(true);
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
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        掲示板
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        みんなで情報を共有しましょう！
      </Typography>

      <PostList onEditPost={handleEditPost} refresh={refreshTrigger} />

      <PostForm
        open={postFormOpen}
        onClose={handleCloseForm}
        onSuccess={handleSuccess}
        editPost={editPost}
      />

      <Fab
        color="primary"
        aria-label="新規投稿"
        onClick={handleCreatePost}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
        }}
      >
        <Add />
      </Fab>
    </Box>
  );
}

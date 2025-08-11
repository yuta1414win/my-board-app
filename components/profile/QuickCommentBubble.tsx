'use client';

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { ChatBubble as ChatBubbleIcon } from '@mui/icons-material';

interface QuickCommentBubbleProps {
  comment: string;
}

export default function QuickCommentBubble({
  comment,
}: QuickCommentBubbleProps) {
  if (!comment.trim()) {
    return null;
  }

  return (
    <Box
      sx={{ position: 'relative', display: 'inline-block', maxWidth: '300px' }}
    >
      <Paper
        elevation={1}
        sx={{
          position: 'relative',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          borderRadius: '20px',
          px: 2,
          py: 1.5,
          '&::before': {
            content: '""',
            position: 'absolute',
            bottom: '-8px',
            left: '20px',
            width: 0,
            height: 0,
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            borderTop: '12px solid',
            borderTopColor: 'primary.main',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ChatBubbleIcon sx={{ fontSize: 16, opacity: 0.8 }} />
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              lineHeight: 1.4,
              wordBreak: 'break-word',
            }}
          >
            {comment}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

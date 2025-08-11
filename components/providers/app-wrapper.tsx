'use client';

import React from 'react';
import { Container } from '@mui/material';
import Navbar from '../navigation/navbar';

export default function AppWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {children}
      </Container>
    </>
  );
}

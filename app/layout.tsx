import type { Metadata } from 'next';
import CustomThemeProvider from '@/components/providers/theme-provider';
import Providers from '@/components/providers/session-provider';
import Navbar from '@/components/navigation/navbar';
import { Container, Box } from '@mui/material';

export const metadata: Metadata = {
  title: '掲示板アプリ',
  description: 'Next.js 15で作成した会員制掲示板システム',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <Providers>
          <CustomThemeProvider>
            <Navbar />
            <Container maxWidth="lg" sx={{ py: 3 }}>
              {children}
            </Container>
          </CustomThemeProvider>
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import CustomThemeProvider from '../components/providers/theme-provider';
import Providers from '../components/providers/session-provider';
import AppWrapper from '../components/providers/app-wrapper';
import EmotionRegistry from '../components/providers/emotion-registry';

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
        <EmotionRegistry>
          <Providers>
            <CustomThemeProvider>
              <AppWrapper>{children}</AppWrapper>
            </CustomThemeProvider>
          </Providers>
        </EmotionRegistry>
      </body>
    </html>
  );
}

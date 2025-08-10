import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Tailwind,
} from '@react-email/components';

interface WelcomeEmailProps {
  userName?: string;
  dashboardUrl: string;
}

export default function WelcomeEmail({ 
  userName = 'ユーザー様', 
  dashboardUrl = 'http://localhost:3001/board'
}: WelcomeEmailProps) {
  return (
    <Html lang="ja">
      <Head>
        <title>My Board Appへようこそ</title>
      </Head>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
            {/* ヘッダー */}
            <Section className="bg-gradient-to-r from-green-500 to-green-400 p-10 text-center">
              <Heading className="text-white text-3xl font-light m-0">
                🎉 ようこそ！
              </Heading>
            </Section>

            {/* メインコンテンツ */}
            <Section className="p-10">
              <Heading className="text-gray-800 text-xl mb-5">
                こんにちは、{userName}！
              </Heading>
              
              <Text className="text-gray-700 text-base leading-relaxed mb-8">
                My Board Appへのご登録ありがとうございます。アカウントが正常に作成されました。
              </Text>

              {/* 機能紹介ボックス */}
              <Section className="bg-gray-50 p-6 rounded-lg mb-10">
                <Heading className="text-gray-800 text-lg mb-4">
                  🚀 さあ、始めましょう！
                </Heading>
                <ul className="text-gray-700 text-sm space-y-2 ml-5">
                  <li>• ボードで投稿を作成・管理</li>
                  <li>• 他のユーザーと情報を共有</li>
                  <li>• プロフィールをカスタマイズ</li>
                </ul>
              </Section>

              {/* CTAボタン */}
              <Section className="text-center mb-10">
                <Button
                  href={dashboardUrl}
                  className="bg-gradient-to-r from-green-500 to-green-400 text-white px-8 py-4 rounded-md text-base font-medium inline-block no-underline"
                >
                  ダッシュボードを開く
                </Button>
              </Section>

              {/* フッター */}
              <Hr className="border-gray-200 my-8" />
              <Text className="text-gray-500 text-xs text-center m-0">
                ご質問やサポートが必要な場合は、お気軽にお問い合わせください。
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
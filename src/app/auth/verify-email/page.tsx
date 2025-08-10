'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Alert from '@/components/ui/Alert';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(
        `/api/auth/verify?token=${encodeURIComponent(token)}`,
        {
          method: 'GET',
        }
      );

      const result = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(result.message);

        // 3秒後にログインページへリダイレクト
        setTimeout(() => {
          router.push(
            '/auth/signin?message=メール認証が完了しました。ログインしてください。'
          );
        }, 3000);
      } else {
        setStatus('error');
        setMessage(result.error);

        // トークンが期限切れまたは無効な場合は再送信を提案
        if (
          result.error.includes('無効') ||
          result.error.includes('期限切れ')
        ) {
          setCanResend(true);
        }
      }
    } catch {
      setStatus('error');
      setMessage('メール確認中にエラーが発生しました');
    }
  };

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('確認トークンが見つかりません');
      return;
    }

    verifyEmail(token);
  }, [token, verifyEmail]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(
        `/api/auth/verify?token=${encodeURIComponent(token)}`,
        {
          method: 'GET',
        }
      );

      const result = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(result.message);

        // 3秒後にログインページへリダイレクト
        setTimeout(() => {
          router.push(
            '/auth/signin?message=メール認証が完了しました。ログインしてください。'
          );
        }, 3000);
      } else {
        setStatus('error');
        setMessage(result.error);

        // トークンが期限切れまたは無効な場合は再送信を提案
        if (
          result.error.includes('無効') ||
          result.error.includes('期限切れ')
        ) {
          setCanResend(true);
        }
      }
    } catch {
      setStatus('error');
      setMessage('メール確認中にエラーが発生しました');
    }
  };

  const handleResendEmail = async () => {
    const email = prompt(
      '確認メールを再送信するメールアドレスを入力してください:'
    );

    if (!email) return;

    setIsResending(true);
    setResendMessage('');

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        setResendMessage(
          '確認メールを再送信しました。メールボックスをご確認ください。'
        );
      } else {
        setResendMessage(result.error || '確認メールの再送信に失敗しました');
      }
    } catch {
      setResendMessage('ネットワークエラーが発生しました');
    } finally {
      setIsResending(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">
              メールアドレスを確認しています...
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-4">
              確認完了!
            </h2>
            <Alert type="success" className="mb-6">
              {message}
            </Alert>
            <p className="text-gray-600 mb-4">
              3秒後にログインページへ自動的に移動します...
            </p>
            <Link
              href="/auth/signin"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              今すぐログイン
            </Link>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-800 mb-4">
              確認に失敗しました
            </h2>
            <Alert type="error" className="mb-6">
              {message}
            </Alert>

            {canResend && (
              <div className="mb-6">
                <button
                  onClick={handleResendEmail}
                  disabled={isResending}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isResending ? '送信中...' : '確認メールを再送信'}
                </button>

                {resendMessage && (
                  <Alert
                    type={
                      resendMessage.includes('再送信しました')
                        ? 'success'
                        : 'error'
                    }
                    className="mt-4"
                  >
                    {resendMessage}
                  </Alert>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Link
                href="/auth/register"
                className="block px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                新規登録に戻る
              </Link>
              <Link
                href="/auth/signin"
                className="block px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                ログインページへ
              </Link>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
            メールアドレス確認
          </h1>

          {renderContent()}

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
            >
              ← ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

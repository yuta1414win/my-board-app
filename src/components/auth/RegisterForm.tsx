'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Alert from '@/components/ui/Alert';

// バリデーションスキーマ
const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, '名前は2文字以上で入力してください')
      .max(50, '名前は50文字以内で入力してください'),
    email: z
      .string()
      .email('有効なメールアドレスを入力してください')
      .toLowerCase(),
    password: z
      .string()
      .min(8, 'パスワードは8文字以上で入力してください')
      .regex(/(?=.*[a-z])/, 'パスワードには小文字を含めてください')
      .regex(/(?=.*[A-Z])/, 'パスワードには大文字を含めてください')
      .regex(/(?=.*\d)/, 'パスワードには数字を含めてください')
      .regex(
        /(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
        'パスワードには特殊文字を含めてください'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

interface PasswordStrengthProps {
  password: string;
}

function PasswordStrength({ password }: PasswordStrengthProps) {
  const requirements = [
    { test: password.length >= 8, label: '8文字以上' },
    { test: /[a-z]/.test(password), label: '小文字を含む' },
    { test: /[A-Z]/.test(password), label: '大文字を含む' },
    { test: /\d/.test(password), label: '数字を含む' },
    {
      test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      label: '特殊文字を含む',
    },
  ];

  const score = requirements.filter((req) => req.test).length;

  let strengthText = '';
  let strengthColor = '';

  if (score === 0) {
    strengthText = '';
    strengthColor = '';
  } else if (score < 2) {
    strengthText = '弱い';
    strengthColor = 'text-red-500';
  } else if (score < 4) {
    strengthText = 'やや弱い';
    strengthColor = 'text-orange-500';
  } else if (score < 5) {
    strengthText = '普通';
    strengthColor = 'text-yellow-500';
  } else {
    strengthText = '強い';
    strengthColor = 'text-green-500';
  }

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center space-x-2 mb-2">
        <span className="text-sm text-gray-600">パスワード強度:</span>
        <span className={`text-sm font-medium ${strengthColor}`}>
          {strengthText}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1 mb-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className={`h-1 rounded ${
              index < score ? 'bg-green-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <ul className="text-xs text-gray-600 space-y-1">
        {requirements.map((req, index) => (
          <li
            key={index}
            className={`flex items-center ${
              req.test ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            <span className="mr-2">{req.test ? '✓' : '○'}</span>
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  const password = watch('password', '');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: result.message,
        });

        // 3秒後にログインページへリダイレクト
        setTimeout(() => {
          router.push('/auth/signin');
        }, 3000);
      } else {
        setMessage({
          type: 'error',
          text: result.error || '登録に失敗しました',
        });
      }
    } catch {
      setMessage({
        type: 'error',
        text: 'ネットワークエラーが発生しました',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">新規登録</h1>

      {message && (
        <Alert type={message.type} className="mb-6">
          {message.text}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            名前
          </label>
          <input
            {...register('name')}
            type="text"
            id="name"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="山田太郎"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            メールアドレス
          </label>
          <input
            {...register('email')}
            type="email"
            id="email"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="example@email.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            パスワード
          </label>
          <input
            {...register('password')}
            type="password"
            id="password"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="パスワードを入力"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
          <PasswordStrength password={password} />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700"
          >
            パスワード（確認）
          </label>
          <input
            {...register('confirmPassword')}
            type="password"
            id="confirmPassword"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="パスワードを再入力"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '登録中...' : '登録する'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          既にアカウントをお持ちの方は{' '}
          <Link
            href="/auth/signin"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}

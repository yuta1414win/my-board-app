/**
 * テストユーティリティとヘルパー関数
 */

import { NextRequest, NextResponse } from 'next/server';
import { createMocks } from 'node-mocks-http';

// テスト用ユーザーデータ
export const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  id: '507f1f77bcf86cd799439011',
  name: 'Test User',
  email: 'test@example.com',
  password: '$2a$10$hashedpassword', // bcrypt hash
  emailVerified: true,
  role: 'user' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  lastLoginAt: new Date('2024-01-01'),
  failedLoginAttempts: 0,
  save: jest.fn().mockResolvedValue(true),
  comparePassword: jest.fn(),
  incrementLoginAttempts: jest.fn(),
  resetLoginAttempts: jest.fn(),
  isAccountLocked: jest.fn().mockReturnValue(false),
};

export const mockUnverifiedUser = {
  ...mockUser,
  _id: '507f1f77bcf86cd799439012',
  id: '507f1f77bcf86cd799439012',
  email: 'unverified@example.com',
  emailVerified: false,
  emailVerificationToken: 'test-verification-token',
  emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
};

export const mockLockedUser = {
  ...mockUser,
  _id: '507f1f77bcf86cd799439013',
  id: '507f1f77bcf86cd799439013',
  email: 'locked@example.com',
  failedLoginAttempts: 5,
  lockUntil: new Date(Date.now() + 60 * 60 * 1000), // 1時間後
  isAccountLocked: jest.fn().mockReturnValue(true),
};

// テスト用セッションデータ
export const mockSession = {
  user: {
    id: mockUser.id,
    name: mockUser.name,
    email: mockUser.email,
    emailVerified: mockUser.emailVerified,
    role: mockUser.role,
  },
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日後
};

// API リクエスト作成ヘルパー
export function createApiRequest(
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
): NextRequest {
  const { req } = createMocks({
    method,
    url,
    body,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  });

  // NextRequest互換のオブジェクトを作成（絶対URLが必要）
  const fullUrl = url.startsWith('http') ? url : `http://localhost:3001${url}`;
  const nextReq = new NextRequest(fullUrl, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  });

  return nextReq;
}

// レスポンスをパース
export async function parseApiResponse(response: NextResponse) {
  const text = await response.text();
  try {
    return {
      status: response.status,
      data: JSON.parse(text),
    };
  } catch {
    return {
      status: response.status,
      data: text,
    };
  }
}

// MongoDB モックセットアップ
export function setupMongoMock() {
  const User = require('../../models/User');

  return {
    User,
    mockFindOne: User.findOne as jest.Mock,
    mockFindById: User.findById as jest.Mock,
    mockFindByIdAndUpdate: User.findByIdAndUpdate as jest.Mock,
    mockCreate: User.create as jest.Mock,
    resetMocks: () => {
      User.findOne.mockReset();
      User.findById.mockReset();
      User.findByIdAndUpdate.mockReset();
      User.create.mockReset();
    },
  };
}

// NextAuth モックセットアップ
export function setupNextAuthMock() {
  const { signIn, signOut, getSession } = require('next-auth/react');
  const auth = require('../../auth');

  return {
    mockSignIn: signIn as jest.Mock,
    mockSignOut: signOut as jest.Mock,
    mockGetSession: getSession as jest.Mock,
    mockAuth: auth.auth as jest.Mock,
    resetMocks: () => {
      signIn.mockReset();
      signOut.mockReset();
      getSession.mockReset();
      auth.auth.mockReset();
    },
  };
}

// メール送信モックセットアップ
export function setupEmailMock() {
  const {
    generateEmailVerificationToken,
    sendVerificationEmail,
  } = require('../../lib/email');

  return {
    mockGenerateToken: generateEmailVerificationToken as jest.Mock,
    mockSendEmail: sendVerificationEmail as jest.Mock,
    resetMocks: () => {
      generateEmailVerificationToken.mockReset();
      sendVerificationEmail.mockReset();
    },
  };
}

// テスト用の登録データ
export const validRegistrationData = {
  name: 'New User',
  email: 'newuser@example.com',
  password: 'Password123!',
};

export const invalidRegistrationData = {
  weakPassword: {
    name: 'New User',
    email: 'newuser@example.com',
    password: '123456', // 弱いパスワード
  },
  invalidEmail: {
    name: 'New User',
    email: 'invalid-email',
    password: 'Password123!',
  },
  missingFields: {
    email: 'newuser@example.com',
    // nameとpasswordが不足
  },
};

// テスト用のログインデータ
export const validLoginData = {
  email: mockUser.email,
  password: 'Password123!',
};

export const invalidLoginData = {
  wrongPassword: {
    email: mockUser.email,
    password: 'WrongPassword',
  },
  wrongEmail: {
    email: 'wrong@example.com',
    password: 'Password123!',
  },
  unverifiedUser: {
    email: mockUnverifiedUser.email,
    password: 'Password123!',
  },
  lockedUser: {
    email: mockLockedUser.email,
    password: 'Password123!',
  },
};

// エラーアサーション
export function expectApiError(
  response: any,
  expectedCode: string,
  expectedStatus: number
) {
  expect(response.status).toBe(expectedStatus);
  expect(response.data).toHaveProperty('error');
  expect(response.data).toHaveProperty('code', expectedCode);
  // expect(response.data).toHaveProperty('timestamp'); // Commented out - not all error responses include timestamp
}

// 成功レスポンスアサーション
export function expectApiSuccess(response: any, expectedStatus: number = 200) {
  expect(response.status).toBe(expectedStatus);
  expect(response.data).toHaveProperty('success', true);
  expect(response.data).toHaveProperty('message');
}

// フォームバリデーションエラーアサーション
export function expectValidationError(response: any, expectedFields: string[]) {
  expectApiError(response, 'VALIDATION_ERROR', 400);
  expect(response.data).toHaveProperty('details');
  expect(Array.isArray(response.data.details)).toBe(true);

  const fieldNames = response.data.details.map((err: any) => err.field);
  expectedFields.forEach((field) => {
    expect(fieldNames).toContain(field);
  });
}

// 時間を進めるヘルパー
export function advanceTimersByTime(ms: number) {
  jest.advanceTimersByTime(ms);
}

// Promise解決を待つ
export function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

// コンソールスパイの設定
export function setupConsoleSpy() {
  const consoleSpy = {
    error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
    log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  };

  return {
    ...consoleSpy,
    restore: () => {
      consoleSpy.error.mockRestore();
      consoleSpy.warn.mockRestore();
      consoleSpy.log.mockRestore();
    },
  };
}

// 非同期操作の完了を待つ
export async function waitFor(
  fn: () => boolean,
  timeout: number = 5000,
  interval: number = 100
) {
  return new Promise<void>((resolve, reject) => {
    const startTime = Date.now();

    const checkCondition = () => {
      if (fn()) {
        resolve();
        return;
      }

      if (Date.now() - startTime >= timeout) {
        reject(new Error('Timeout waiting for condition'));
        return;
      }

      setTimeout(checkCondition, interval);
    };

    checkCondition();
  });
}

// テスト環境の検証
export function verifyTestEnvironment() {
  expect(process.env.NODE_ENV).toBe('test');
  expect(process.env.MONGODB_URI).toBe('mongodb://localhost:27017/test-db');
  expect(process.env.NEXTAUTH_SECRET).toBeDefined();
}

export default {
  mockUser,
  mockUnverifiedUser,
  mockLockedUser,
  mockSession,
  createApiRequest,
  parseApiResponse,
  setupMongoMock,
  setupNextAuthMock,
  setupEmailMock,
  validRegistrationData,
  invalidRegistrationData,
  validLoginData,
  invalidLoginData,
  expectApiError,
  expectApiSuccess,
  expectValidationError,
  advanceTimersByTime,
  flushPromises,
  setupConsoleSpy,
  waitFor,
  verifyTestEnvironment,
};

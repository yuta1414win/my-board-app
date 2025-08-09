import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '';
  },
}));

// Mock NextAuth.js
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  SessionProvider: ({ children }) => children,
}));

// Mock NextAuth.js server functions
jest.mock('../auth', () => ({
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  handlers: {
    GET: jest.fn(),
    POST: jest.fn(),
  },
}));

// Mock MongoDB connection
jest.mock('../lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({}),
}));

// Mock User model
jest.mock('../models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
}));

// Mock email functions
jest.mock('../lib/email', () => ({
  generateEmailVerificationToken: jest.fn(() => 'mock-token'),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  verifyEmailToken: jest.fn(),
}));

// Test environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
process.env.NEXTAUTH_SECRET = 'test-secret-key-32-characters-long';
process.env.NEXTAUTH_URL = 'http://localhost:3001';
process.env.JWT_SECRET = 'test-jwt-secret-key-32-characters';
process.env.NODE_ENV = 'test';

// Global fetch mock for API tests
global.fetch = jest.fn();

// Mock Response constructor
global.Response = class Response {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
    this.statusText = init?.statusText || 'OK';
    this.headers = new Map(Object.entries(init?.headers || {}));
  }

  json() {
    return Promise.resolve(JSON.parse(this.body));
  }

  text() {
    return Promise.resolve(this.body);
  }
};

// Mock Request constructor
global.Request = class Request {
  constructor(url, init) {
    this.url = url;
    this.method = init?.method || 'GET';
    this.headers = new Map(Object.entries(init?.headers || {}));
    this.body = init?.body;
  }

  json() {
    return Promise.resolve(JSON.parse(this.body));
  }

  text() {
    return Promise.resolve(this.body);
  }
};

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  fetch.mockClear();
});

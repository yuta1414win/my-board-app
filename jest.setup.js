import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { URL } from 'url';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.URL = URL;

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
jest.mock('./auth', () => ({
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  handlers: {
    GET: jest.fn(),
    POST: jest.fn(),
  },
}));

// Mock MongoDB connection
jest.mock('./lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({}),
}));

// Mock User model
jest.mock('./models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
}));

// Mock email functions
jest.mock('./lib/email', () => ({
  generateEmailVerificationToken: jest.fn(() => 'mock-token'),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  verifyEmailToken: jest.fn(),
}));

// Mock rate limiting
jest.mock('./lib/rate-limit', () => ({
  rateLimit: jest.fn(() => ({
    check: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Test environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
process.env.NEXTAUTH_SECRET = 'test-secret-key-32-characters-long';
process.env.NEXTAUTH_URL = 'http://localhost:3001';
process.env.JWT_SECRET = 'test-jwt-secret-key-32-characters';
process.env.NODE_ENV = 'test';

// Global fetch mock for API tests
global.fetch = jest.fn();

// Mock Headers constructor
global.Headers = class Headers {
  constructor(init) {
    this.headers = new Map();

    if (init) {
      if (init instanceof Headers) {
        for (const [key, value] of init.headers) {
          this.headers.set(key.toLowerCase(), value);
        }
      } else if (Array.isArray(init)) {
        for (const [key, value] of init) {
          this.headers.set(key.toLowerCase(), value);
        }
      } else if (typeof init === 'object') {
        for (const [key, value] of Object.entries(init)) {
          this.headers.set(key.toLowerCase(), value);
        }
      }
    }
  }

  get(name) {
    return this.headers.get(name.toLowerCase()) || null;
  }

  set(name, value) {
    this.headers.set(name.toLowerCase(), value);
  }

  has(name) {
    return this.headers.has(name.toLowerCase());
  }

  delete(name) {
    this.headers.delete(name.toLowerCase());
  }

  *[Symbol.iterator]() {
    for (const [key, value] of this.headers) {
      yield [key, value];
    }
  }
};

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

// Mock Request constructor - NextRequestと互換性を保つ
global.Request = class Request {
  constructor(url, init = {}) {
    Object.defineProperty(this, 'url', {
      value: url,
      writable: false,
      enumerable: true,
    });

    Object.defineProperty(this, 'nextUrl', {
      value: new URL(url),
      writable: false,
      enumerable: true,
    });

    this.method = init?.method || 'GET';
    this.headers = new Headers(init?.headers || {});
    this.body = init?.body;
  }

  async json() {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body);
    }
    return this.body;
  }

  async text() {
    return this.body?.toString() || '';
  }

  clone() {
    return new Request(this.url, {
      method: this.method,
      headers: this.headers,
      body: this.body,
    });
  }
};

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  fetch.mockClear();
});

import '@testing-library/jest-dom'

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
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db'

// Global fetch mock for API tests
global.fetch = jest.fn()

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
})
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/playwright/',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(next-auth|@auth|jose|oauth|openid-client|preact-render-to-string|preact)/)',
  ],
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/models/(.*)$': '<rootDir>/models/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    'pages/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'models/**/*.{js,jsx,ts,tsx}',
    'utils/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  testMatch: [
    '<rootDir>/**/__tests__/**/*.{spec,test}.{js,jsx,ts,tsx}',
    '<rootDir>/**/?(*.)(spec|test).{js,jsx,ts,tsx}',
    '!<rootDir>/**/__tests__/**/test-helpers.{js,jsx,ts,tsx}',
    '!<rootDir>/**/__tests__/**/helpers.{js,jsx,ts,tsx}',
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);

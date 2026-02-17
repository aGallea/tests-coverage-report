import baseConfig from './jest.config';

export default {
  ...baseConfig,
  testMatch: ['**/test/integration/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  testTimeout: 120000,
};

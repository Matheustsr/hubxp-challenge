module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts'],
  coverageThreshold: {
    global: {
      branches: 35,
      functions: 25,
      lines: 50,
      statements: 50
    }
  },
  testTimeout: 10000,
  forceExit: true,
  detectOpenHandles: true
};

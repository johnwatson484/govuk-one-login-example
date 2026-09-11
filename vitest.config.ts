import { defineConfig, configDefaults } from 'vitest/config'

const sharedEnv = {
  NODE_ENV: 'test'
}

export default defineConfig({
  test: {
    globals: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      clean: false,
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [...configDefaults.exclude, '**/test/**', 'coverage']
    },
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          clearMocks: true,
          environment: 'node',
          env: sharedEnv
        }
      },
      {
        test: {
          name: 'integration',
          include: ['test/integration/**/*.test.ts'],
          clearMocks: true,
          environment: 'node',
          env: sharedEnv
        }
      }
    ]
  }
})

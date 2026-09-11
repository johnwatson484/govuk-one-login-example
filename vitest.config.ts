import { generateKeyPairSync, randomBytes } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { defineConfig, configDefaults } from 'vitest/config'

// Generated per run so the repository never carries a key, and tests never depend on .env.
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })

const sharedEnv = {
  NODE_ENV: 'test',
  ONE_LOGIN_CLIENT_ID: 'test-client',
  ONE_LOGIN_REDIRECT_URL: 'http://localhost:3000/auth/callback',
  ONE_LOGIN_POST_LOGOUT_REDIRECT_URL: 'http://localhost:3000/signed-out',
  ONE_LOGIN_PRIVATE_KEY: Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(), 'utf8').toString('base64'),
  COOKIE_PASSWORD: randomBytes(32).toString('hex'),
  POSTGRES_PASSWORD: 'postgres'
}

// Unit tests never reach the network. Integration tests take their discovery URL
// from the stub that the global setup starts.
const unitEnv = {
  ...sharedEnv,
  ONE_LOGIN_DISCOVERY_URL: 'http://one-login.test/.well-known/openid-configuration'
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
          env: unitEnv
        }
      },
      {
        test: {
          name: 'integration',
          include: ['test/integration/**/*.test.ts'],
          clearMocks: true,
          environment: 'node',
          globalSetup: ['test/setup/global-services.ts'],
          testTimeout: 30000,
          hookTimeout: 120000,
          fileParallelism: false,
          env: sharedEnv
        }
      }
    ]
  }
})

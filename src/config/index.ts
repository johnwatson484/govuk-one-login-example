import convict from 'convict'
import convictFormatWithValidator from 'convict-format-with-validator'
import oneLogin from './one-login.ts'
import type { OneLoginConfig } from './one-login.ts'
import cache from './cache.ts'
import type { CacheConfig } from './cache.ts'
import postgres from './postgres.ts'
import type { PostgresConfig } from './postgres.ts'

convict.addFormats(convictFormatWithValidator)

convict.addFormat({
  name: 'cookie-password',
  validate: (value: unknown) => {
    if (typeof value !== 'string' || value.length < 32) {
      throw new Error('must be at least 32 characters. Run `npm run keys:generate` to create one.')
    }
  }
})

interface AppConfig {
  env: string
  isDev: boolean
  isProd: boolean
  host: string
  port: number
  logLevel: string
  appName: string
  cookie: {
    password: string
    isSecure: boolean
  }
  oneLogin: OneLoginConfig
  cache: CacheConfig
  postgres: PostgresConfig
}

const config = convict<AppConfig>({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  isDev: {
    doc: 'True if the application is in development mode.',
    format: Boolean,
    default: process.env.NODE_ENV === 'development'
  },
  isProd: {
    doc: 'True if the application is in production mode.',
    format: Boolean,
    default: process.env.NODE_ENV === 'production'
  },
  host: {
    doc: 'The host to bind.',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3000,
    env: 'PORT',
    arg: 'port'
  },
  logLevel: {
    doc: 'Pino log level.',
    format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
    default: 'info',
    env: 'LOG_LEVEL'
  },
  appName: {
    doc: 'The name of the application.',
    format: String,
    default: 'Manage your farming business',
    env: 'APP_NAME'
  },
  cookie: {
    password: {
      doc: 'The password used to encrypt cookies.',
      format: 'cookie-password',
      default: null,
      env: 'COOKIE_PASSWORD',
      sensitive: true
    },
    isSecure: {
      doc: 'True if cookies may only be sent over HTTPS.',
      format: Boolean,
      default: process.env.NODE_ENV !== 'development',
      env: 'COOKIE_IS_SECURE'
    }
  },
  oneLogin,
  cache,
  postgres
})

config.validate({ allowed: 'strict' })

export type { AppConfig }

export default config

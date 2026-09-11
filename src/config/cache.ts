import type convict from 'convict'

interface CacheConfig {
  name: string
  host: string
  port: number
  password: string
  useTls: boolean
  partition: string
  segment: string
  ttl: number
}

const schema: convict.Schema<CacheConfig> = {
  name: {
    doc: 'The catbox cache name.',
    format: String,
    default: 'redis'
  },
  host: {
    doc: 'The Redis host.',
    format: String,
    default: 'localhost',
    env: 'REDIS_HOST'
  },
  port: {
    doc: 'The Redis port.',
    format: 'port',
    default: 6379,
    env: 'REDIS_PORT'
  },
  password: {
    doc: 'The Redis password.',
    format: String,
    default: process.env.NODE_ENV === 'production' ? null : '',
    env: 'REDIS_PASSWORD',
    sensitive: true
  },
  useTls: {
    doc: 'True if the Redis connection should use TLS.',
    format: Boolean,
    default: process.env.NODE_ENV === 'production',
    env: 'REDIS_TLS'
  },
  partition: {
    doc: 'The Redis key prefix.',
    format: String,
    default: 'govuk-one-login-example'
  },
  segment: {
    doc: 'The catbox segment holding signed in sessions.',
    format: String,
    default: 'session'
  },
  ttl: {
    doc: 'Session lifetime in milliseconds. Defaults to one hour to match the GOV.UK One Login session.',
    format: Number,
    default: 1000 * 60 * 60,
    env: 'SESSION_TTL'
  }
}

export type { CacheConfig }

export default schema

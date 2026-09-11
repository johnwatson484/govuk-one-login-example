import type convict from 'convict'

interface PostgresConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl: boolean
  maxPoolSize: number
}

const schema: convict.Schema<PostgresConfig> = {
  host: {
    doc: 'The PostgreSQL host.',
    format: String,
    default: 'localhost',
    env: 'POSTGRES_HOST'
  },
  port: {
    doc: 'The PostgreSQL port.',
    format: 'port',
    default: 5432,
    env: 'POSTGRES_PORT'
  },
  database: {
    doc: 'The PostgreSQL database name.',
    format: String,
    default: 'farming_accounts',
    env: 'POSTGRES_DB'
  },
  user: {
    doc: 'The PostgreSQL user.',
    format: String,
    default: 'postgres',
    env: 'POSTGRES_USER'
  },
  password: {
    doc: 'The PostgreSQL password.',
    format: String,
    default: null,
    env: 'POSTGRES_PASSWORD',
    sensitive: true
  },
  ssl: {
    doc: 'True if the PostgreSQL connection should use TLS.',
    format: Boolean,
    default: process.env.NODE_ENV === 'production',
    env: 'POSTGRES_SSL'
  },
  maxPoolSize: {
    doc: 'The maximum number of pooled connections.',
    format: Number,
    default: 10,
    env: 'POSTGRES_MAX_POOL_SIZE'
  }
}

export type { PostgresConfig }

export default schema

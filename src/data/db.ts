import pg from 'pg'
import type { PoolClient, QueryResult, QueryResultRow } from 'pg'
import config from '../config/index.ts'

// Anything that can run a statement: the pool for single queries, a client inside a transaction.
export interface Queryable {
  query: <T extends QueryResultRow>(text: string, values?: unknown[]) => Promise<QueryResult<T>>
}

let pool: pg.Pool | undefined

function getPool (): pg.Pool {
  pool ??= new pg.Pool({
    host: config.get('postgres.host'),
    port: config.get('postgres.port'),
    database: config.get('postgres.database'),
    user: config.get('postgres.user'),
    password: config.get('postgres.password'),
    ssl: config.get('postgres.ssl') === true ? { rejectUnauthorized: true } : false,
    max: config.get('postgres.maxPoolSize')
  })

  return pool
}

function getDb (): Queryable {
  return getPool() as unknown as Queryable
}

async function withTransaction<T> (work: (client: Queryable) => Promise<T>): Promise<T> {
  const client: PoolClient = await getPool().connect()

  try {
    await client.query('BEGIN')
    const result = await work(client as unknown as Queryable)
    await client.query('COMMIT')

    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function closeDb (): Promise<void> {
  if (pool !== undefined) {
    const current = pool
    pool = undefined
    await current.end()
  }
}

export { getDb, withTransaction, closeDb }

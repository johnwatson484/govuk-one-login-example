import path from 'node:path'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { GenericContainer, Network, Wait } from 'testcontainers'
import type { StartedNetwork, StartedTestContainer } from 'testcontainers'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql'

const changelogDir = path.join(import.meta.dirname, '../../changelog')
const database = 'farming_accounts'
const username = 'postgres'
const password = 'postgres'

let network: StartedNetwork
let postgres: StartedPostgreSqlContainer
let redis: StartedTestContainer
let discovery: Server

// The app reads the discovery document when the auth plugin registers, so a
// static stand in is served rather than mocking the module in every test file.
async function startDiscoveryStub (): Promise<string> {
  const issuer = 'http://one-login.test'
  const document = {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    userinfo_endpoint: `${issuer}/userinfo`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    end_session_endpoint: `${issuer}/logout`
  }

  discovery = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'max-age=60' })
    res.end(JSON.stringify(document))
  })

  await new Promise<void>((resolve) => discovery.listen(0, '127.0.0.1', resolve))

  const { port } = discovery.address() as AddressInfo

  return `http://127.0.0.1:${port}/.well-known/openid-configuration`
}

// Integration tests run against real PostgreSQL and Redis so the SQL, the
// Liquibase changelog and the catbox session store are all exercised.
async function setup (): Promise<void> {
  network = await new Network().start()

  postgres = await new PostgreSqlContainer('postgres:16.6')
    .withNetwork(network)
    .withNetworkAliases('postgres')
    .withDatabase(database)
    .withUsername(username)
    .withPassword(password)
    .start()

  const liquibase = await new GenericContainer('liquibase/liquibase:4')
    .withNetwork(network)
    .withCopyDirectoriesToContainer([{ source: changelogDir, target: '/liquibase/changelog' }])
    .withCommand([
      '--url=jdbc:postgresql://postgres:5432/farming_accounts',
      `--username=${username}`,
      `--password=${password}`,
      '--changelog-file=changelog/db.changelog.xml',
      'update'
    ])
    .withWaitStrategy(Wait.forOneShotStartup())
    .start()

  await liquibase.stop()

  redis = await new GenericContainer('redis:7.4-alpine')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
    .start()

  process.env.POSTGRES_HOST = postgres.getHost()
  process.env.POSTGRES_PORT = String(postgres.getMappedPort(5432))
  process.env.POSTGRES_DB = database
  process.env.POSTGRES_USER = username
  process.env.POSTGRES_PASSWORD = password
  process.env.REDIS_HOST = redis.getHost()
  process.env.REDIS_PORT = String(redis.getMappedPort(6379))
  process.env.ONE_LOGIN_DISCOVERY_URL = await startDiscoveryStub()
}

async function teardown (): Promise<void> {
  await new Promise<void>((resolve) => discovery.close(() => { resolve() }))
  await redis?.stop()
  await postgres?.stop()
  await network?.stop()
}

export { setup, teardown }

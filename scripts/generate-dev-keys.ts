import { generateKeyPairSync, randomBytes } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = path.join(import.meta.dirname, '..')
const envPath = path.join(root, '.env')
const examplePath = path.join(root, '.env.example')

const managedKeys = ['ONE_LOGIN_PRIVATE_KEY', 'ONE_LOGIN_PUBLIC_KEY', 'COOKIE_PASSWORD']

function readEnvLines (): string[] {
  if (!existsSync(envPath)) {
    copyFileSync(examplePath, envPath)
  }

  return readFileSync(envPath, 'utf8').split('\n')
}

function readValue (lines: string[], key: string): string {
  const match = lines.find((line) => line.startsWith(`${key}=`))

  return match === undefined ? '' : match.slice(key.length + 1).trim()
}

function upsert (lines: string[], key: string, value: string): string[] {
  const index = lines.findIndex((line) => line.startsWith(`${key}=`))
  const entry = `${key}=${value}`

  if (index === -1) {
    return [...lines, entry]
  }

  return lines.map((line, position) => (position === index ? entry : line))
}

function generate (): Record<string, string> {
  // RSA rather than EC: the GOV.UK One Login simulator only accepts RSA signed
  // client assertions. The real service accepts RS256 and ES256.
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })

  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString()

  return {
    // Base64 so the multi line PEM survives .env and docker compose interpolation as one value.
    ONE_LOGIN_PRIVATE_KEY: Buffer.from(privateKeyPem, 'utf8').toString('base64'),
    // The simulator expects the PEM headers with no interior newlines.
    ONE_LOGIN_PUBLIC_KEY: publicKeyPem.replace(/\r?\n/g, ''),
    COOKIE_PASSWORD: randomBytes(32).toString('hex')
  }
}

function run (): void {
  const force = process.argv.includes('--force')
  const lines = readEnvLines()
  const alreadySet = managedKeys.every((key) => readValue(lines, key).length > 0)

  if (alreadySet && !force) {
    console.log('Development keys already present in .env. Use `npm run keys:generate -- --force` to replace them.')
    return
  }

  const generated = generate()
  const updated = managedKeys.reduce((acc, key) => upsert(acc, key, generated[key] ?? ''), lines)

  writeFileSync(envPath, updated.join('\n'), { mode: 0o600 })

  console.log(`Wrote ${managedKeys.join(', ')} to .env. These are for local development only and must never be committed.`)
}

run()

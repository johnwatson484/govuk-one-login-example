import { Buffer } from 'node:buffer'
import { createPrivateKey } from 'node:crypto'
import convict from 'convict'

const generateHint = 'Run `npm run keys:generate` to create a local development key pair.'

// The key is carried through the environment as base64 so it survives .env and compose as one line.
function decodePrivateKey (value: string): string {
  const trimmed = value.trim()

  if (trimmed.includes('-----BEGIN')) {
    return trimmed
  }

  return Buffer.from(trimmed, 'base64').toString('utf8')
}

convict.addFormat({
  name: 'private-key',
  validate: (value: unknown) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`is required. ${generateHint}`)
    }

    try {
      createPrivateKey(decodePrivateKey(value))
    } catch {
      throw new Error(`could not be parsed as a PKCS#8 private key. ${generateHint}`)
    }
  }
})

interface OneLoginConfig {
  discoveryUrl: string
  clientId: string
  privateKey: string
  redirectUrl: string
  postLogoutRedirectUrl: string
  scopes: string[]
  vectorOfTrust: string
  uiLocales: string
  clockToleranceSeconds: number
  discoveryCacheTtl: number
}

const schema: convict.Schema<OneLoginConfig> = {
  discoveryUrl: {
    doc: 'The GOV.UK One Login OpenID Connect discovery document URL.',
    format: String,
    default: 'http://localhost:3005/.well-known/openid-configuration',
    env: 'ONE_LOGIN_DISCOVERY_URL'
  },
  clientId: {
    doc: 'The client ID registered with GOV.UK One Login.',
    format: String,
    default: null,
    env: 'ONE_LOGIN_CLIENT_ID'
  },
  privateKey: {
    doc: 'The base64 encoded PKCS#8 private key used to sign client assertions.',
    format: 'private-key',
    default: null,
    env: 'ONE_LOGIN_PRIVATE_KEY',
    sensitive: true
  },
  redirectUrl: {
    doc: 'The redirect URI registered with GOV.UK One Login.',
    format: String,
    default: 'http://localhost:3000/auth/callback',
    env: 'ONE_LOGIN_REDIRECT_URL'
  },
  postLogoutRedirectUrl: {
    doc: 'Where GOV.UK One Login returns the user after signing out.',
    format: String,
    default: 'http://localhost:3000/signed-out',
    env: 'ONE_LOGIN_POST_LOGOUT_REDIRECT_URL'
  },
  scopes: {
    doc: 'The scopes requested from GOV.UK One Login.',
    format: Array,
    default: ['openid', 'email'],
    env: 'ONE_LOGIN_SCOPES'
  },
  vectorOfTrust: {
    doc: 'The vector of trust requested. Cl.Cm is multi-factor authentication without identity proving.',
    format: String,
    default: 'Cl.Cm',
    env: 'ONE_LOGIN_VECTOR_OF_TRUST'
  },
  uiLocales: {
    doc: 'The language GOV.UK One Login presents its pages in.',
    format: ['en', 'cy'],
    default: 'en',
    env: 'ONE_LOGIN_UI_LOCALES'
  },
  clockToleranceSeconds: {
    doc: 'Permitted clock skew when validating ID token claims.',
    format: Number,
    default: 60,
    env: 'ONE_LOGIN_CLOCK_TOLERANCE_SECONDS'
  },
  discoveryCacheTtl: {
    doc: 'Fallback TTL in milliseconds for the discovery document when no Cache-Control is returned.',
    format: Number,
    default: 1000 * 60 * 60,
    env: 'ONE_LOGIN_DISCOVERY_CACHE_TTL'
  }
}

export { decodePrivateKey }

export type { OneLoginConfig }

export default schema

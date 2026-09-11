import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { SignJWT, exportJWK, generateKeyPair } from 'jose'
import type { KeyObject } from 'node:crypto'

const issuer = 'http://one-login.test'
const clientId = 'test-client'

const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true })

vi.mock('../../../src/auth/discovery.ts', () => ({
  getOpenIdConfiguration: async () => ({
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    userinfo_endpoint: `${issuer}/userinfo`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    end_session_endpoint: `${issuer}/logout`
  })
}))

vi.mock('../../../src/auth/jwks.ts', async () => {
  const { createLocalJWKSet } = await import('jose')
  const jwk = await exportJWK(publicKey as unknown as KeyObject)

  return { getJwks: async () => createLocalJWKSet({ keys: [{ ...jwk, alg: 'ES256' }] }) }
})

const { verifyIdToken } = await import('../../../src/auth/verify-id-token.ts')

interface TokenOverrides {
  nonce?: string | undefined
  vot?: string | undefined
  audience?: string
  issuer?: string
  expiresIn?: string
}

async function idToken (overrides: TokenOverrides = {}): Promise<string> {
  const claims: Record<string, string> = {}

  if (overrides.nonce !== undefined) {
    claims.nonce = overrides.nonce
  }

  if (overrides.vot !== undefined) {
    claims.vot = overrides.vot
  }

  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'ES256' })
    .setSubject('urn:fdc:gov.uk:2022:person')
    .setIssuer(overrides.issuer ?? issuer)
    .setAudience(overrides.audience ?? clientId)
    .setIssuedAt()
    .setExpirationTime(overrides.expiresIn ?? '5m')
    .sign(privateKey)
}

describe('verifyIdToken', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('returns the claims for a valid token', async () => {
    const claims = await verifyIdToken(await idToken({ nonce: 'abc', vot: 'Cl.Cm' }), 'abc')

    expect(claims.sub).toBe('urn:fdc:gov.uk:2022:person')
  })

  test('rejects a token whose nonce does not match the one that was sent', async () => {
    await expect(verifyIdToken(await idToken({ nonce: 'abc', vot: 'Cl.Cm' }), 'different'))
      .rejects.toThrow(/nonce/)
  })

  test('rejects a token with no nonce', async () => {
    await expect(verifyIdToken(await idToken({ vot: 'Cl.Cm' }), 'abc')).rejects.toThrow()
  })

  test('rejects a token issued for another client', async () => {
    await expect(verifyIdToken(await idToken({ nonce: 'abc', vot: 'Cl.Cm', audience: 'someone-else' }), 'abc'))
      .rejects.toThrow()
  })

  test('rejects a token from another issuer', async () => {
    await expect(verifyIdToken(await idToken({ nonce: 'abc', vot: 'Cl.Cm', issuer: 'http://evil.test' }), 'abc'))
      .rejects.toThrow()
  })

  test('rejects an expired token', async () => {
    const token = await idToken({ nonce: 'abc', vot: 'Cl.Cm', expiresIn: '1s' })
    vi.setSystemTime(Date.now() + 120000)

    await expect(verifyIdToken(token, 'abc')).rejects.toThrow()
  })

  test('rejects a token that does not meet the requested vector of trust', async () => {
    await expect(verifyIdToken(await idToken({ nonce: 'abc', vot: 'Cl' }), 'abc'))
      .rejects.toThrow(/vector of trust/)
  })
})

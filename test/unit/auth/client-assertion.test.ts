import { Buffer } from 'node:buffer'
import { createPrivateKey, createPublicKey } from 'node:crypto'
import { describe, test, expect } from 'vitest'
import { createLocalJWKSet, exportJWK, jwtVerify } from 'jose'
import { createClientAssertion } from '../../../src/auth/client-assertion.ts'
import { decodePrivateKey } from '../../../src/config/one-login.ts'
import config from '../../../src/config/index.ts'

const tokenEndpoint = 'http://one-login.test/token'

async function verify (assertion: string): ReturnType<typeof jwtVerify> {
  const publicKey = createPublicKey(createPrivateKey(decodePrivateKey(config.get('oneLogin.privateKey'))))
  const jwk = await exportJWK(publicKey)
  const jwks = createLocalJWKSet({ keys: [{ ...jwk, alg: 'RS256' }] })

  return jwtVerify(assertion, jwks, { audience: tokenEndpoint, algorithms: ['RS256'] })
}

describe('createClientAssertion', () => {
  test('is signed with the configured private key', async () => {
    const { payload } = await verify(createClientAssertion(tokenEndpoint))

    expect(payload.iss).toBe(config.get('oneLogin.clientId'))
    expect(payload.sub).toBe(config.get('oneLogin.clientId'))
    expect(payload.aud).toBe(tokenEndpoint)
  })

  test('declares the algorithm that matches the key', () => {
    const [header] = createClientAssertion(tokenEndpoint).split('.')
    const decoded = JSON.parse(Buffer.from(header as string, 'base64url').toString('utf8'))

    expect(decoded).toEqual({ alg: 'RS256', typ: 'JWT' })
  })

  test('uses a fresh jti and a short lifetime each time', () => {
    const first = createClientAssertion(tokenEndpoint)
    const second = createClientAssertion(tokenEndpoint)

    const claims = (jwt: string): Record<string, number | string> =>
      JSON.parse(Buffer.from(jwt.split('.')[1] as string, 'base64url').toString('utf8'))

    expect(claims(first).jti).not.toBe(claims(second).jti)
    expect(Number(claims(first).exp) - Number(claims(first).iat)).toBe(300)
  })

  test('is built synchronously because bell resolves tokenParams synchronously', () => {
    expect(typeof createClientAssertion(tokenEndpoint)).toBe('string')
  })
})

describe('decodePrivateKey', () => {
  test('accepts a base64 encoded PEM', () => {
    const pem = '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n'

    expect(decodePrivateKey(Buffer.from(pem, 'utf8').toString('base64'))).toBe(pem)
  })

  test('accepts a plain PEM', () => {
    const pem = '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----'

    expect(decodePrivateKey(pem)).toBe(pem)
  })
})

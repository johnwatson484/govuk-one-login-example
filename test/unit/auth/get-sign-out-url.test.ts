import { describe, test, expect, vi, afterEach } from 'vitest'
import { getSignOutUrl } from '../../../src/auth/get-sign-out-url.ts'

vi.mock('../../../src/auth/discovery.ts', () => ({
  getOpenIdConfiguration: async () => ({
    issuer: 'http://one-login.test',
    authorization_endpoint: 'http://one-login.test/authorize',
    token_endpoint: 'http://one-login.test/token',
    userinfo_endpoint: 'http://one-login.test/userinfo',
    jwks_uri: 'http://one-login.test/.well-known/jwks.json',
    end_session_endpoint: 'http://one-login.test/logout'
  })
}))

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getSignOutUrl', () => {
  test('sends the id token hint, the return url and a state value', async () => {
    const url = new URL(await getSignOutUrl('the-id-token', 'the-state'))

    expect(url.origin + url.pathname).toBe('http://one-login.test/logout')
    expect(url.searchParams.get('id_token_hint')).toBe('the-id-token')
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe('http://localhost:3000/signed-out')
    expect(url.searchParams.get('state')).toBe('the-state')
  })

  test('encodes values rather than concatenating them', async () => {
    const url = await getSignOutUrl('token with spaces & symbols', 'a/b')

    expect(url).toContain('id_token_hint=token+with+spaces+%26+symbols')
    expect(url).toContain('state=a%2Fb')
  })
})

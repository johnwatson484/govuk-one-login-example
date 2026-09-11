import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import Wreck from '@hapi/wreck'
import { getOpenIdConfiguration, resetOpenIdConfigurationCache } from '../../../src/auth/discovery.ts'

const document = {
  issuer: 'http://one-login.test',
  authorization_endpoint: 'http://one-login.test/authorize',
  token_endpoint: 'http://one-login.test/token',
  userinfo_endpoint: 'http://one-login.test/userinfo',
  jwks_uri: 'http://one-login.test/.well-known/jwks.json',
  end_session_endpoint: 'http://one-login.test/logout'
}

function respond (headers: Record<string, string> = {}, statusCode = 200): unknown {
  return { res: { statusCode, headers }, payload: document }
}

describe('getOpenIdConfiguration', () => {
  beforeEach(() => {
    resetOpenIdConfigurationCache()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('fetches the document once and caches it', async () => {
    const get = vi.spyOn(Wreck, 'get').mockResolvedValue(respond({ 'cache-control': 'max-age=600' }) as never)

    await getOpenIdConfiguration()
    const second = await getOpenIdConfiguration()

    expect(get).toHaveBeenCalledTimes(1)
    expect(second.token_endpoint).toBe(document.token_endpoint)
  })

  test('refetches once the cache-control max-age has passed', async () => {
    const get = vi.spyOn(Wreck, 'get').mockResolvedValue(respond({ 'cache-control': 'max-age=60' }) as never)

    await getOpenIdConfiguration()
    vi.setSystemTime(Date.now() + 61000)
    await getOpenIdConfiguration()

    expect(get).toHaveBeenCalledTimes(2)
  })

  test('keeps serving the previous document when a refresh fails', async () => {
    const get = vi.spyOn(Wreck, 'get').mockResolvedValueOnce(respond({ 'cache-control': 'max-age=60' }) as never)

    await getOpenIdConfiguration()

    get.mockRejectedValueOnce(new Error('GOV.UK One Login is unavailable'))
    vi.setSystemTime(Date.now() + 61000)

    await expect(getOpenIdConfiguration()).resolves.toMatchObject({ issuer: document.issuer })
  })

  test('throws when the first fetch fails', async () => {
    vi.spyOn(Wreck, 'get').mockRejectedValue(new Error('GOV.UK One Login is unavailable'))

    await expect(getOpenIdConfiguration()).rejects.toThrow('GOV.UK One Login is unavailable')
  })

  test('throws on a non 200 response', async () => {
    vi.spyOn(Wreck, 'get').mockResolvedValue(respond({}, 500) as never)

    await expect(getOpenIdConfiguration()).rejects.toThrow('status 500')
  })
})

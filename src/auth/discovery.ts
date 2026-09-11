import Wreck from '@hapi/wreck'
import config from '../config/index.ts'

interface OpenIdConfiguration {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
  jwks_uri: string
  end_session_endpoint: string
}

interface CachedDocument {
  document: OpenIdConfiguration
  expiresAt: number
}

let cached: CachedDocument | undefined

function getMaxAge (cacheControl: string | string[] | undefined): number | undefined {
  const header = Array.isArray(cacheControl) ? cacheControl.join(',') : cacheControl

  if (header === undefined) {
    return undefined
  }

  const match = /max-age=(\d+)/i.exec(header)

  return match?.[1] === undefined ? undefined : Number(match[1]) * 1000
}

async function fetchOpenIdConfiguration (): Promise<CachedDocument> {
  const { res, payload } = await Wreck.get<OpenIdConfiguration>(config.get('oneLogin.discoveryUrl'), { json: true })

  if (res.statusCode !== 200) {
    throw new Error(`Discovery document request failed with status ${res.statusCode}`)
  }

  const ttl = getMaxAge(res.headers['cache-control']) ?? config.get('oneLogin.discoveryCacheTtl')

  return { document: payload, expiresAt: Date.now() + ttl }
}

// Serves the previous document if GOV.UK One Login is briefly unavailable, so an
// outage on a cache refresh does not take the whole service down.
async function getOpenIdConfiguration (): Promise<OpenIdConfiguration> {
  if (cached !== undefined && cached.expiresAt > Date.now()) {
    return cached.document
  }

  try {
    cached = await fetchOpenIdConfiguration()
  } catch (err) {
    if (cached === undefined) {
      throw err
    }
  }

  return cached.document
}

function resetOpenIdConfigurationCache (): void {
  cached = undefined
}

export { getOpenIdConfiguration, resetOpenIdConfigurationCache }
export type { OpenIdConfiguration }

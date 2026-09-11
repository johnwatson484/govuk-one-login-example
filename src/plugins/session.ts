import Yar from '@hapi/yar'
import type { ServerRegisterPluginObject } from '@hapi/hapi'
import config from '../config/index.ts'

// maxCookieSize 0 keeps every value server side in Redis, so nothing about the
// journey (including the OIDC nonce) is readable or replayable from the browser.
const plugin: ServerRegisterPluginObject<any> = {
  plugin: Yar,
  options: {
    storeBlank: false,
    maxCookieSize: 0,
    cache: {
      cache: config.get('cache.name'),
      segment: 'session-temp',
      expiresIn: config.get('cache.ttl')
    },
    cookieOptions: {
      password: config.get('cookie.password'),
      isSecure: config.get('cookie.isSecure'),
      isHttpOnly: true,
      // Lax so the cookie survives the top level redirect back from GOV.UK One Login.
      isSameSite: 'Lax',
      path: '/',
      ttl: config.get('cache.ttl')
    }
  }
}

export default plugin

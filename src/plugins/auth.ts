import Bell from '@hapi/bell'
import Cookie from '@hapi/cookie'
import type { Plugin, Request, ServerOptions } from '@hapi/hapi'
import config from '../config/index.ts'
import { createClientAssertion } from '../auth/client-assertion.ts'
import { getOpenIdConfiguration } from '../auth/discovery.ts'
import { createNonce, nonceKey } from '../auth/nonce.ts'
import { getSession } from '../auth/session-store.ts'
import { getPersonById } from '../data/person.ts'

const clientAssertionType = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'

// Paths a signed in but not yet registered person is allowed to reach.
const registrationPaths = ['/register', '/auth', '/sign-out', '/signed-out']

function isAllowedBeforeRegistration (path: string): boolean {
  return registrationPaths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

const plugin: Plugin<ServerOptions> = {
  name: 'auth',
  register: async (server) => {
    await server.register([Bell, Cookie])

    const openIdConfiguration = await getOpenIdConfiguration()

    server.auth.strategy('one-login', 'bell', {
      provider: {
        name: 'one-login',
        protocol: 'oauth2',
        auth: openIdConfiguration.authorization_endpoint,
        token: openIdConfiguration.token_endpoint,
        scope: config.get('oneLogin.scopes'),
        pkce: 'S256',
        // GOV.UK One Login requires a User-Agent on the token request.
        headers: { 'User-Agent': 'govuk-one-login-example' },
        useParamsAuth: true
      },
      password: config.get('cookie.password'),
      clientId: config.get('oneLogin.clientId'),
      // An empty object makes bell send neither a client_secret parameter nor a
      // Basic authorization header, leaving private_key_jwt as the only client
      // authentication on the token request.
      clientSecret: {},
      isSecure: config.get('cookie.isSecure'),
      isSameSite: 'Lax',
      // Must match the redirect URI registered with GOV.UK One Login exactly.
      location: () => config.get('oneLogin.redirectUrl'),
      // The ID token is verified in the callback handler, where the nonce is reachable.
      skipProfile: true,
      providerParams: (request: Request) => {
        const nonce = createNonce()
        request.yar.set(nonceKey, nonce)

        return {
          nonce,
          vtr: JSON.stringify([config.get('oneLogin.vectorOfTrust')]),
          ui_locales: config.get('oneLogin.uiLocales')
        }
      },
      tokenParams: () => ({
        client_assertion_type: clientAssertionType,
        client_assertion: createClientAssertion(openIdConfiguration.token_endpoint)
      })
    })

    server.auth.strategy('session', 'cookie', {
      cookie: {
        name: 'sid',
        password: config.get('cookie.password'),
        isSecure: config.get('cookie.isSecure'),
        isHttpOnly: true,
        isSameSite: 'Lax',
        path: '/',
        ttl: config.get('cache.ttl')
      },
      redirectTo: '/auth/sign-in',
      appendNext: 'redirect',
      validate: async (request: Request, session: { sessionId?: string }) => {
        if (typeof session.sessionId !== 'string') {
          return { isValid: false }
        }

        const record = await getSession(request.server, session.sessionId)

        if (record === null) {
          return { isValid: false }
        }

        const person = record.personId === null ? undefined : await getPersonById(record.personId)

        return {
          isValid: true,
          credentials: {
            sessionId: session.sessionId,
            session: record,
            ...(person === undefined ? {} : { person })
          }
        }
      }
    })

    server.auth.default('session')

    // Anyone signed in with GOV.UK One Login but without a farming account is
    // funnelled into registration, and cannot skip it by guessing a URL.
    server.ext('onPostAuth', (request, h) => {
      if (!request.auth.isAuthenticated || request.auth.strategy !== 'session') {
        return h.continue
      }

      const isRegistered = request.auth.credentials.person !== undefined
      const path = request.path

      if (!isRegistered && !isAllowedBeforeRegistration(path)) {
        if (request.method === 'get') {
          // Remembered so an invitation link still works after registering.
          request.yar.set('redirectTo', path)
        }

        return h.redirect('/register/your-name').takeover()
      }

      if (isRegistered && path.startsWith('/register') && request.route.settings.plugins?.registrationGuard !== false) {
        return h.redirect('/organisations').takeover()
      }

      return h.continue
    })
  }
}

export default plugin

import type { Server } from '@hapi/hapi'
import Inert from '@hapi/inert'
import Crumb from '@hapi/crumb'
import Scooter from '@hapi/scooter'
import csp from './content-security-policy.ts'
import headers from './headers.ts'
import logging from './logging.ts'
import errors from './errors.ts'
import views from './views.ts'
import session from './session.ts'
import auth from './auth.ts'
import postgres from './postgres.ts'
import router from './router.ts'
import pulse from './pulse.ts'
import config from '../config/index.ts'

async function registerPlugins (server: Server): Promise<void> {
  const plugins: any[] = [
    Inert,
    Scooter,
    csp,
    logging,
    errors,
    headers,
    views,
    postgres,
    // yar must come before auth: bell reads the OIDC nonce out of request.yar.
    session,
    auth,
    {
      plugin: Crumb,
      options: {
        key: 'crumb',
        cookieOptions: {
          isSecure: config.get('cookie.isSecure'),
          isHttpOnly: true,
          isSameSite: 'Lax',
          path: '/'
        }
      }
    },
    router,
    pulse
  ]

  if (config.get('isDev')) {
    plugins.push(await import('blipp'))
  }

  await server.register(plugins)
}

export { registerPlugins }

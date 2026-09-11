import { randomBytes } from 'node:crypto'
import type { ServerRoute } from '@hapi/hapi'
import { getOpenIdConfiguration } from '../auth/discovery.ts'
import { getSignOutUrl } from '../auth/get-sign-out-url.ts'
import { nonceKey } from '../auth/nonce.ts'
import { createSession, dropSession } from '../auth/session-store.ts'
import { getUserInfo } from '../auth/userinfo.ts'
import { verifyIdToken } from '../auth/verify-id-token.ts'
import { findRegisteredPerson } from '../services/registration.ts'
import { getSafeRedirect } from '../utils/get-safe-redirect.ts'

const redirectKey = 'redirectTo'

const routes: ServerRoute[] = [{
  method: 'GET',
  path: '/auth/sign-in',
  options: {
    auth: false
  },
  handler: (request, h) => {
    request.yar.set(redirectKey, getSafeRedirect(request.query.redirect))

    return h.redirect('/auth/callback')
  }
}, {
  method: 'GET',
  path: '/auth/callback',
  options: {
    auth: { strategy: 'one-login', mode: 'try' }
  },
  handler: async (request, h) => {
    const expectedNonce = request.yar.get(nonceKey)
    request.yar.clear(nonceKey)

    if (!request.auth.isAuthenticated) {
      request.log('error', { message: 'GOV.UK One Login authentication failed', error: request.auth.error?.message })
      return h.view('unauthorised').code(401)
    }

    const artifacts = request.auth.artifacts as { id_token?: string } | undefined
    const idToken = artifacts?.id_token
    const accessToken = request.auth.credentials.token

    if (typeof idToken !== 'string' || typeof accessToken !== 'string' || typeof expectedNonce !== 'string') {
      request.log('error', { message: 'GOV.UK One Login response was missing a token or the stored nonce' })
      return h.view('unauthorised').code(401)
    }

    try {
      const claims = await verifyIdToken(idToken, expectedNonce)
      const userInfo = await getUserInfo(accessToken)

      if (userInfo.sub !== claims.sub) {
        throw new Error('Userinfo subject does not match the ID token subject')
      }

      const { issuer } = await getOpenIdConfiguration()
      const person = await findRegisteredPerson({ issuer, subject: claims.sub })

      const sessionId = await createSession(request.server, {
        subject: claims.sub,
        personId: person?.id ?? null,
        email: userInfo.email ?? '',
        idToken,
        accessToken,
        refreshToken: request.auth.credentials.refreshToken ?? null,
        expiresAt: Date.now() + (request.auth.credentials.expiresIn ?? 0) * 1000
      })

      request.cookieAuth.set({ sessionId })

      if (person === undefined) {
        return h.redirect('/register/your-name')
      }

      const redirect = getSafeRedirect(request.yar.get(redirectKey))
      request.yar.clear(redirectKey)

      return h.redirect(redirect === '/' ? '/organisations' : redirect)
    } catch (err) {
      request.log('error', { message: 'Could not complete GOV.UK One Login sign in', error: (err as Error).message })
      return h.view('unauthorised').code(401)
    }
  }
}, {
  method: 'GET',
  path: '/sign-out',
  handler: (_request, h) => {
    return h.view('sign-out')
  }
}, {
  method: 'POST',
  path: '/sign-out',
  handler: async (request, h) => {
    const { sessionId, session } = request.auth.credentials

    if (sessionId !== undefined) {
      await dropSession(request.server, sessionId)
    }

    request.cookieAuth.clear()

    if (session === undefined) {
      return h.redirect('/signed-out')
    }

    const state = randomBytes(16).toString('base64url')
    request.yar.set('signOutState', state)

    return h.redirect(await getSignOutUrl(session.idToken, state))
  }
}, {
  method: 'GET',
  path: '/signed-out',
  options: {
    auth: false
  },
  handler: (request, h) => {
    request.yar.reset()

    return h.view('signed-out')
  }
}]

export default routes

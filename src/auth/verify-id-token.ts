import { jwtVerify } from 'jose'
import type { JWTPayload } from 'jose'
import config from '../config/index.ts'
import { getOpenIdConfiguration } from './discovery.ts'
import { getJwks } from './jwks.ts'

interface IdTokenClaims extends JWTPayload {
  sub: string
  nonce?: string
  vot?: string
  sid?: string
}

// jose checks the `kid`, algorithm, signature, issuer, audience and expiry.
// The nonce and vector of trust are specific to this integration.
async function verifyIdToken (idToken: string, expectedNonce: string): Promise<IdTokenClaims> {
  const { issuer } = await getOpenIdConfiguration()
  const jwks = await getJwks()

  const { payload } = await jwtVerify<IdTokenClaims>(idToken, jwks, {
    issuer,
    audience: config.get('oneLogin.clientId'),
    algorithms: ['ES256'],
    clockTolerance: config.get('oneLogin.clockToleranceSeconds'),
    requiredClaims: ['sub', 'iat', 'exp', 'nonce']
  })

  if (payload.nonce !== expectedNonce) {
    throw new Error('ID token nonce does not match the nonce sent to GOV.UK One Login')
  }

  const expectedVot = config.get('oneLogin.vectorOfTrust')

  if (payload.vot !== expectedVot) {
    throw new Error(`ID token vector of trust was "${String(payload.vot)}", expected "${expectedVot}"`)
  }

  return payload
}

export { verifyIdToken }
export type { IdTokenClaims }

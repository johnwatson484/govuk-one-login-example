import { Buffer } from 'node:buffer'
import { createPrivateKey, randomUUID, sign } from 'node:crypto'
import type { KeyObject } from 'node:crypto'
import config from '../config/index.ts'
import { decodePrivateKey } from '../config/one-login.ts'

const assertionLifetimeSeconds = 300

let privateKey: KeyObject | undefined

function getPrivateKey (): KeyObject {
  privateKey ??= createPrivateKey(decodePrivateKey(config.get('oneLogin.privateKey')))

  return privateKey
}

function encodeSegment (value: object): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
}

// Built with node:crypto rather than jose because bell resolves `tokenParams`
// synchronously. GOV.UK One Login accepts RS256 and ES256; the algorithm is
// derived from the key so either can be configured.
function createClientAssertion (audience: string): string {
  const clientId = config.get('oneLogin.clientId')
  const issuedAt = Math.floor(Date.now() / 1000)
  const key = getPrivateKey()
  const isEc = key.asymmetricKeyType === 'ec'

  const signingInput = [
    encodeSegment({ alg: isEc ? 'ES256' : 'RS256', typ: 'JWT' }),
    encodeSegment({
      iss: clientId,
      sub: clientId,
      aud: audience,
      jti: randomUUID(),
      iat: issuedAt,
      exp: issuedAt + assertionLifetimeSeconds
    })
  ].join('.')

  // ECDSA JWS signatures are the raw r||s form, not the DER form node defaults to.
  const signature = sign('sha256', Buffer.from(signingInput, 'utf8'), {
    key,
    ...(isEc ? { dsaEncoding: 'ieee-p1363' as const } : {})
  })

  return `${signingInput}.${signature.toString('base64url')}`
}

export { createClientAssertion }

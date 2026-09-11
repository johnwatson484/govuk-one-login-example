import { createRemoteJWKSet } from 'jose'
import { getOpenIdConfiguration } from './discovery.ts'

type RemoteJWKSet = ReturnType<typeof createRemoteJWKSet>

let keySet: RemoteJWKSet | undefined
let keySetUri: string | undefined

// createRemoteJWKSet matches on `kid`, caches the key set and refetches when an
// unknown `kid` appears, which is what GOV.UK One Login key rotation needs.
async function getJwks (): Promise<RemoteJWKSet> {
  const { jwks_uri: jwksUri } = await getOpenIdConfiguration()

  if (keySet === undefined || keySetUri !== jwksUri) {
    keySet = createRemoteJWKSet(new URL(jwksUri), { cooldownDuration: 30000 })
    keySetUri = jwksUri
  }

  return keySet
}

function resetJwksCache (): void {
  keySet = undefined
  keySetUri = undefined
}

export { getJwks, resetJwksCache }

import { randomBytes } from 'node:crypto'

const nonceKey = 'oneLoginNonce'

function createNonce (): string {
  return randomBytes(32).toString('base64url')
}

export { createNonce, nonceKey }

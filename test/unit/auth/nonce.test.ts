import { describe, test, expect } from 'vitest'
import { createNonce, nonceKey } from '../../../src/auth/nonce.ts'

describe('createNonce', () => {
  test('is long enough to be unguessable and url safe', () => {
    expect(createNonce()).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  test('is different every time', () => {
    const nonces = new Set(Array.from({ length: 100 }, createNonce))

    expect(nonces.size).toBe(100)
  })

  test('has a stable session key', () => {
    expect(nonceKey).toBe('oneLoginNonce')
  })
})

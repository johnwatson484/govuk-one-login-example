import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestClient } from './helpers/test-client.ts'
import { resetDatabase } from './helpers/database.ts'
import { registerPerson } from '../../src/services/registration.ts'

describe('home page', () => {
  let client: TestClient

  beforeAll(async () => {
    client = await TestClient.create()
  })

  afterAll(async () => {
    await client.stop()
  })

  beforeEach(async () => {
    await resetDatabase()
    client.signOut()
  })

  test('the start page is available without signing in', async () => {
    const response = await client.inject({ method: 'GET', url: '/' })

    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('Start now')
  })

  test('a signed in person is taken to their businesses', async () => {
    const person = await registerPerson(
      { issuer: 'http://one-login.test', subject: 'urn:test:home' },
      { givenName: 'Alice', familyName: 'Farmer', email: 'alice@example.com', telephone: null }
    )

    await client.signIn({ subject: 'urn:test:home', email: person.email, person })

    const response = await client.inject({ method: 'GET', url: '/' })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/organisations')
  })

  test('a protected page redirects an anonymous visitor to sign in', async () => {
    const response = await client.inject({ method: 'GET', url: '/organisations' })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toContain('/auth/sign-in')
  })
})

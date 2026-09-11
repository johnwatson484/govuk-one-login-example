import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestClient } from './helpers/test-client.ts'
import { resetDatabase } from './helpers/database.ts'
import { findRegisteredPerson } from '../../src/services/registration.ts'

const identity = { issuer: 'http://one-login.test', subject: 'urn:fdc:gov.uk:2022:register-test' }

describe('registration journey', () => {
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
    await client.signIn({ subject: identity.subject, email: 'new.farmer@example.com' })
  })

  test('an unregistered person is sent to the first registration page', async () => {
    const response = await client.inject({ method: 'GET', url: '/organisations' })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/register/your-name')
  })

  test('the name page rejects missing answers', async () => {
    const response = await client.post('/register/your-name', { givenName: '', familyName: '' })

    expect(response.statusCode).toBe(400)
    expect(response.payload).toContain('Enter your first name')
    expect(response.payload).toContain('Enter your last name')
  })

  test('the contact page rejects an invalid email address', async () => {
    const response = await client.post('/register/contact-details', { email: 'nope', telephone: '' })

    expect(response.statusCode).toBe(400)
    expect(response.payload).toContain('Enter an email address in the correct format')
  })

  test('a person can register and is then linked to their GOV.UK One Login identity', async () => {
    await client.post('/register/your-name', { givenName: 'Alice', familyName: 'Farmer' })

    const check = await client.post('/register/contact-details', {
      email: 'new.farmer@example.com',
      telephone: '07000000001'
    })

    expect(check.headers.location).toBe('/register/check-answers')

    const answers = await client.inject({ method: 'GET', url: '/register/check-answers' })
    expect(answers.payload).toContain('Alice Farmer')

    const confirmation = await client.post('/register/check-answers')
    expect(confirmation.headers.location).toBe('/register/confirmation')

    const person = await findRegisteredPerson(identity)
    expect(person?.givenName).toBe('Alice')
    expect(person?.email).toBe('new.farmer@example.com')
  })

  test('the same GOV.UK One Login identity cannot register twice', async () => {
    await client.post('/register/your-name', { givenName: 'Alice', familyName: 'Farmer' })
    await client.post('/register/contact-details', { email: 'new.farmer@example.com', telephone: '' })
    await client.post('/register/check-answers')

    const person = await findRegisteredPerson(identity)
    expect(person).toBeDefined()

    // A replayed journey with the same identity is turned away rather than creating a duplicate.
    await client.post('/register/your-name', { givenName: 'Alice', familyName: 'Impostor' })
    await client.post('/register/contact-details', { email: 'new.farmer@example.com', telephone: '' })
    const again = await client.post('/register/check-answers')

    expect(again.statusCode).toBe(302)
    expect(again.headers.location).toBe('/organisations')

    const unchanged = await findRegisteredPerson(identity)
    expect(unchanged?.familyName).toBe('Farmer')
  })
})

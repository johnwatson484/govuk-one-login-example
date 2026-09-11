import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestClient } from './helpers/test-client.ts'
import { resetDatabase } from './helpers/database.ts'
import { registerPerson } from '../../src/services/registration.ts'
import { createOrganisationWithOwner } from '../../src/services/organisations.ts'
import type { Person } from '../../src/data/types.ts'

const issuer = 'http://one-login.test'

async function registerOwner (email: string): Promise<Person> {
  return registerPerson({ issuer, subject: `urn:test:${email}` }, {
    givenName: 'Alice',
    familyName: 'Farmer',
    email,
    telephone: null
  })
}

describe('organisations', () => {
  let client: TestClient
  let owner: Person

  beforeAll(async () => {
    client = await TestClient.create()
  })

  afterAll(async () => {
    await client.stop()
  })

  beforeEach(async () => {
    await resetDatabase()
    client.signOut()
    owner = await registerOwner('owner@example.com')
    await client.signIn({ subject: `urn:test:${owner.email}`, email: owner.email, person: owner })
  })

  test('a person with no businesses is told so', async () => {
    const response = await client.inject({ method: 'GET', url: '/organisations' })

    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('You are not linked to any businesses yet')
  })

  test('the create form rejects an SBI that is not 9 numbers', async () => {
    const response = await client.post('/organisations/create', { name: 'Green Acres', sbi: '123' })

    expect(response.statusCode).toBe(400)
    expect(response.payload).toContain('Single business identifier (SBI) must be 9 numbers')
  })

  test('the first person to create a business becomes its owner', async () => {
    const created = await client.post('/organisations/create', {
      name: 'Green Acres Farm',
      sbi: '123456789',
      addressLine1: '1 Field Lane',
      town: 'Exeter',
      postcode: 'EX1 1AA'
    })

    expect(created.statusCode).toBe(302)
    const location = created.headers.location as string
    expect(location).toMatch(/^\/organisations\/[0-9a-f-]{36}$/)

    const details = await client.inject({ method: 'GET', url: location })
    expect(details.statusCode).toBe(200)
    expect(details.payload).toContain('Green Acres Farm')
    expect(details.payload).toContain('123456789')
    expect(details.payload).toContain('Invite someone')
  })

  test('two businesses cannot share an SBI', async () => {
    await client.post('/organisations/create', { name: 'Green Acres Farm', sbi: '123456789' })

    const duplicate = await client.post('/organisations/create', { name: 'Other Farm', sbi: '123456789' })

    expect(duplicate.statusCode).toBe(400)
    expect(duplicate.payload).toContain('A business with this single business identifier already exists')
  })

  test('a person who is not a member gets a 404 rather than a 403', async () => {
    const { id: organisationId } = await createOrganisationWithOwner(owner.id, {
      name: 'Somebody Elses Farm',
      sbi: '987654321',
      addressLine1: null,
      addressLine2: null,
      town: null,
      county: null,
      postcode: null
    })

    const outsider = await registerPerson({ issuer, subject: 'urn:test:outsider' }, {
      givenName: 'Mallory',
      familyName: 'Stranger',
      email: 'outsider@example.com',
      telephone: null
    })

    client.signOut()
    await client.signIn({ subject: 'urn:test:outsider', email: outsider.email, person: outsider })

    const response = await client.inject({ method: 'GET', url: `/organisations/${organisationId}` })

    expect(response.statusCode).toBe(404)
  })

  test('an organisation id that is not a uuid is a 404', async () => {
    const response = await client.inject({ method: 'GET', url: '/organisations/not-a-uuid' })

    expect(response.statusCode).toBe(404)
  })
})

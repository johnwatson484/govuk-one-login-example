import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestClient } from './helpers/test-client.ts'
import { resetDatabase } from './helpers/database.ts'
import { registerPerson } from '../../src/services/registration.ts'
import { createOrganisationWithOwner } from '../../src/services/organisations.ts'
import { listOrganisationsForPerson } from '../../src/data/organisation.ts'
import type { Organisation, Person } from '../../src/data/types.ts'

const issuer = 'http://one-login.test'

async function register (subject: string, email: string, familyName: string): Promise<Person> {
  return registerPerson({ issuer, subject }, { givenName: 'Test', familyName, email, telephone: null })
}

function inviteLinkToken (payload: string): string {
  const match = /\/invitations\/([A-Za-z0-9_-]+)/.exec(payload)

  return match?.[1] as string
}

describe('invitations', () => {
  let client: TestClient
  let owner: Person
  let organisation: Organisation

  beforeAll(async () => {
    client = await TestClient.create()
  })

  afterAll(async () => {
    await client.stop()
  })

  beforeEach(async () => {
    await resetDatabase()
    client.signOut()
    owner = await register('urn:test:owner', 'owner@example.com', 'Owner')
    organisation = await createOrganisationWithOwner(owner.id, {
      name: 'Green Acres Farm',
      sbi: '123456789',
      addressLine1: null,
      addressLine2: null,
      town: null,
      county: null,
      postcode: null
    })
    await client.signIn({ subject: 'urn:test:owner', email: owner.email, person: owner })
  })

  test('an owner can invite someone and the raw token is never stored', async () => {
    const response = await client.post(`/organisations/${organisation.id}/invite`, {
      email: 'member@example.com',
      permission: 'member'
    })

    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('Invitation created')
    expect(inviteLinkToken(response.payload)).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  test('the invite form requires a permission', async () => {
    const response = await client.post(`/organisations/${organisation.id}/invite`, {
      email: 'member@example.com',
      permission: ''
    })

    expect(response.statusCode).toBe(400)
    expect(response.payload).toContain('Select a permission level')
  })

  test('an invited person joins the business with the nominated permission', async () => {
    const invite = await client.post(`/organisations/${organisation.id}/invite`, {
      email: 'member@example.com',
      permission: 'member'
    })
    const token = inviteLinkToken(invite.payload)

    const member = await register('urn:test:member', 'member@example.com', 'Member')
    client.signOut()
    await client.signIn({ subject: 'urn:test:member', email: member.email, person: member })

    const view = await client.inject({ method: 'GET', url: `/invitations/${token}` })
    expect(view.statusCode).toBe(200)
    expect(view.payload).toContain('Join Green Acres Farm')

    const accepted = await client.post(`/invitations/${token}`)
    expect(accepted.statusCode).toBe(302)
    expect(accepted.headers.location).toBe(`/organisations/${organisation.id}`)

    const memberships = await listOrganisationsForPerson(member.id)
    expect(memberships).toHaveLength(1)
    expect(memberships[0]?.permission).toBe('member')
  })

  test('an invitation cannot be accepted twice', async () => {
    const invite = await client.post(`/organisations/${organisation.id}/invite`, {
      email: 'member@example.com',
      permission: 'owner'
    })
    const token = inviteLinkToken(invite.payload)

    const member = await register('urn:test:member', 'member@example.com', 'Member')
    client.signOut()
    await client.signIn({ subject: 'urn:test:member', email: member.email, person: member })

    await client.post(`/invitations/${token}`)
    const replay = await client.post(`/invitations/${token}`)

    expect(replay.statusCode).toBe(404)
    expect(await listOrganisationsForPerson(member.id)).toHaveLength(1)
  })

  test('an invitation cannot be used by a different email address', async () => {
    const invite = await client.post(`/organisations/${organisation.id}/invite`, {
      email: 'member@example.com',
      permission: 'member'
    })
    const token = inviteLinkToken(invite.payload)

    const other = await register('urn:test:other', 'someone.else@example.com', 'Other')
    client.signOut()
    await client.signIn({ subject: 'urn:test:other', email: other.email, person: other })

    const response = await client.inject({ method: 'GET', url: `/invitations/${token}` })

    expect(response.statusCode).toBe(403)
    expect(response.payload).toContain('sent to a different email address')
    expect(await listOrganisationsForPerson(other.id)).toHaveLength(0)
  })

  test('a member cannot invite other people', async () => {
    const invite = await client.post(`/organisations/${organisation.id}/invite`, {
      email: 'member@example.com',
      permission: 'member'
    })
    const token = inviteLinkToken(invite.payload)

    const member = await register('urn:test:member', 'member@example.com', 'Member')
    client.signOut()
    await client.signIn({ subject: 'urn:test:member', email: member.email, person: member })
    await client.post(`/invitations/${token}`)

    const response = await client.inject({ method: 'GET', url: `/organisations/${organisation.id}/invite` })

    expect(response.statusCode).toBe(403)
  })

  test('an unknown token is not valid', async () => {
    const response = await client.inject({ method: 'GET', url: `/invitations/${'a'.repeat(43)}` })

    expect(response.statusCode).toBe(404)
    expect(response.payload).toContain('This invitation is no longer valid')
  })
})

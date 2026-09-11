import { getDb } from './db.ts'
import type { Queryable } from './db.ts'
import type { OrganisationPerson, Permission } from './types.ts'

async function addMembership (db: Queryable, organisationId: string, personId: string, permission: Permission): Promise<void> {
  await db.query(
    'INSERT INTO organisation_person (organisation_id, person_id, permission) VALUES ($1, $2, $3)',
    [organisationId, personId, permission]
  )
}

async function listPeopleInOrganisation (organisationId: string, db: Queryable = getDb()): Promise<OrganisationPerson[]> {
  const { rows } = await db.query<OrganisationPerson>(
    `SELECT p.id,
            p.given_name AS "givenName",
            p.family_name AS "familyName",
            p.email,
            p.telephone,
            op.permission
     FROM organisation_person op
     JOIN person p ON p.id = op.person_id
     WHERE op.organisation_id = $1
     ORDER BY p.family_name, p.given_name`,
    [organisationId]
  )

  return rows
}

export { addMembership, listPeopleInOrganisation }

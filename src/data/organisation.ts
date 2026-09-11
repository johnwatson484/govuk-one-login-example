import { getDb } from './db.ts'
import type { Queryable } from './db.ts'
import type { Organisation, OrganisationDetails, OrganisationMembership } from './types.ts'

const organisationColumns = `
  o.id,
  o.name,
  o.sbi,
  o.address_line_1 AS "addressLine1",
  o.address_line_2 AS "addressLine2",
  o.town,
  o.county,
  o.postcode
`

async function createOrganisation (db: Queryable, details: OrganisationDetails): Promise<Organisation> {
  const { rows } = await db.query<Organisation>(
    `INSERT INTO organisation (name, sbi, address_line_1, address_line_2, town, county, postcode)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, sbi,
               address_line_1 AS "addressLine1",
               address_line_2 AS "addressLine2",
               town, county, postcode`,
    [details.name, details.sbi, details.addressLine1, details.addressLine2, details.town, details.county, details.postcode]
  )

  return rows[0] as Organisation
}

// Always scoped by person, so a business the caller is not a member of is simply not found.
async function getOrganisationForPerson (organisationId: string, personId: string, db: Queryable = getDb()): Promise<OrganisationMembership | undefined> {
  const { rows } = await db.query<OrganisationMembership>(
    `SELECT ${organisationColumns}, op.permission
     FROM organisation o
     JOIN organisation_person op ON op.organisation_id = o.id
     WHERE o.id = $1 AND op.person_id = $2`,
    [organisationId, personId]
  )

  return rows[0]
}

async function listOrganisationsForPerson (personId: string, db: Queryable = getDb()): Promise<OrganisationMembership[]> {
  const { rows } = await db.query<OrganisationMembership>(
    `SELECT ${organisationColumns}, op.permission
     FROM organisation o
     JOIN organisation_person op ON op.organisation_id = o.id
     WHERE op.person_id = $1
     ORDER BY o.name`,
    [personId]
  )

  return rows
}

export { createOrganisation, getOrganisationForPerson, listOrganisationsForPerson }

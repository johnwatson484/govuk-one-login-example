import { getDb } from './db.ts'
import type { Queryable } from './db.ts'
import type { Person } from './types.ts'

async function findPersonByExternalIdentity (issuer: string, subject: string, db: Queryable = getDb()): Promise<Person | undefined> {
  const { rows } = await db.query<Person>(
    `SELECT p.id,
            p.given_name AS "givenName",
            p.family_name AS "familyName",
            p.email,
            p.telephone
     FROM external_identity ei
     JOIN person p ON p.id = ei.person_id
     WHERE ei.issuer = $1 AND ei.subject = $2`,
    [issuer, subject]
  )

  return rows[0]
}

async function linkExternalIdentity (db: Queryable, personId: string, issuer: string, subject: string): Promise<void> {
  await db.query(
    'INSERT INTO external_identity (person_id, issuer, subject) VALUES ($1, $2, $3)',
    [personId, issuer, subject]
  )
}

export { findPersonByExternalIdentity, linkExternalIdentity }

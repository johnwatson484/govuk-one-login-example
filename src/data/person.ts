import { getDb } from './db.ts'
import type { Queryable } from './db.ts'
import type { Person, PersonDetails } from './types.ts'

const personColumns = `
  id,
  given_name AS "givenName",
  family_name AS "familyName",
  email,
  telephone
`

async function createPerson (db: Queryable, details: PersonDetails): Promise<Person> {
  const { rows } = await db.query<Person>(
    `INSERT INTO person (given_name, family_name, email, telephone)
     VALUES ($1, $2, $3, $4)
     RETURNING ${personColumns}`,
    [details.givenName, details.familyName, details.email, details.telephone]
  )

  return rows[0] as Person
}

async function getPersonById (id: string, db: Queryable = getDb()): Promise<Person | undefined> {
  const { rows } = await db.query<Person>(
    `SELECT ${personColumns} FROM person WHERE id = $1`,
    [id]
  )

  return rows[0]
}

async function updatePerson (id: string, details: PersonDetails, db: Queryable = getDb()): Promise<Person | undefined> {
  const { rows } = await db.query<Person>(
    `UPDATE person
     SET given_name = $2, family_name = $3, email = $4, telephone = $5, updated_at = now()
     WHERE id = $1
     RETURNING ${personColumns}`,
    [id, details.givenName, details.familyName, details.email, details.telephone]
  )

  return rows[0]
}

export { createPerson, getPersonById, updatePerson }

import { getDb } from '../../../src/data/db.ts'

async function resetDatabase (): Promise<void> {
  await getDb().query('TRUNCATE audit_event, invitation, organisation_person, organisation, external_identity, person CASCADE')
}

export { resetDatabase }

import { withTransaction } from '../data/db.ts'
import { recordAuditEvent } from '../data/audit.ts'
import { findPersonByExternalIdentity, linkExternalIdentity } from '../data/external-identity.ts'
import { createPerson } from '../data/person.ts'
import { AlreadyRegisteredError, isUniqueViolation } from './errors.ts'
import type { Person, PersonDetails } from '../data/types.ts'

interface ExternalIdentity {
  issuer: string
  subject: string
}

async function findRegisteredPerson (identity: ExternalIdentity): Promise<Person | undefined> {
  return findPersonByExternalIdentity(identity.issuer, identity.subject)
}

// The unique constraint on (issuer, subject) is what actually prevents a second registration,
// so a concurrent duplicate fails here rather than slipping through a prior read.
async function registerPerson (identity: ExternalIdentity, details: PersonDetails): Promise<Person> {
  try {
    return await withTransaction(async (client) => {
      const person = await createPerson(client, details)
      await linkExternalIdentity(client, person.id, identity.issuer, identity.subject)
      await recordAuditEvent({ eventType: 'person.registered', personId: person.id }, client)

      return person
    })
  } catch (err) {
    if (isUniqueViolation(err, 'external_identity_issuer_subject_key')) {
      throw new AlreadyRegisteredError('This GOV.UK One Login account has already been registered')
    }

    throw err
  }
}

export { findRegisteredPerson, registerPerson }
export type { ExternalIdentity }

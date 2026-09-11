import { withTransaction } from '../data/db.ts'
import { recordAuditEvent } from '../data/audit.ts'
import { addMembership } from '../data/membership.ts'
import { createOrganisation } from '../data/organisation.ts'
import { DuplicateSbiError, isUniqueViolation } from './errors.ts'
import type { Organisation, OrganisationDetails } from '../data/types.ts'

// The person who creates a business always becomes its owner.
async function createOrganisationWithOwner (personId: string, details: OrganisationDetails): Promise<Organisation> {
  try {
    return await withTransaction(async (client) => {
      const organisation = await createOrganisation(client, details)
      await addMembership(client, organisation.id, personId, 'owner')
      await recordAuditEvent({
        eventType: 'organisation.created',
        personId,
        organisationId: organisation.id
      }, client)

      return organisation
    })
  } catch (err) {
    if (isUniqueViolation(err, 'organisation_sbi_key')) {
      throw new DuplicateSbiError('A business with this single business identifier already exists')
    }

    throw err
  }
}

export { createOrganisationWithOwner }

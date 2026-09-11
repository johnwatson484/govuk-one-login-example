import Boom from '@hapi/boom'
import type { Request } from '@hapi/hapi'
import { getOrganisationForPerson } from '../data/organisation.ts'
import type { OrganisationMembership, Permission } from '../data/types.ts'

// Returns 404 rather than 403 for a business the caller is not a member of, so
// the response does not confirm that the business exists.
function requireMembership (permissions?: Permission[]) {
  return async (request: Request): Promise<OrganisationMembership> => {
    const person = request.auth.credentials.person
    const organisationId = request.params.organisationId

    if (person === undefined || typeof organisationId !== 'string') {
      throw Boom.notFound()
    }

    const organisation = await getOrganisationForPerson(organisationId, person.id)

    if (organisation === undefined) {
      throw Boom.notFound()
    }

    if (permissions !== undefined && !permissions.includes(organisation.permission)) {
      throw Boom.forbidden()
    }

    return organisation
  }
}

export { requireMembership }

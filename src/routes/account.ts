import Boom from '@hapi/boom'
import type { ServerRoute } from '@hapi/hapi'
import { listOrganisationsForPerson } from '../data/organisation.ts'

const route: ServerRoute = {
  method: 'GET',
  path: '/account',
  handler: async (request, h) => {
    const person = request.auth.credentials.person

    if (person === undefined) {
      throw Boom.unauthorized()
    }

    const organisations = await listOrganisationsForPerson(person.id)

    return h.view('account', {
      person,
      organisations,
      signInEmail: request.auth.credentials.session?.email,
      backLink: '/organisations'
    })
  }
}

export default route

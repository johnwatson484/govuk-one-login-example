import Joi from 'joi'
import Boom from '@hapi/boom'
import type { ServerRoute } from '@hapi/hapi'
import { requireMembership } from '../auth/require-membership.ts'
import { listPendingInvitations } from '../data/invitation.ts'
import { listPeopleInOrganisation } from '../data/membership.ts'
import { listOrganisationsForPerson, getOrganisationForPerson } from '../data/organisation.ts'
import type { OrganisationDetails, OrganisationMembership } from '../data/types.ts'
import { createOrganisationWithOwner } from '../services/organisations.ts'
import { inviteToOrganisation } from '../services/invitations.ts'
import { DuplicateSbiError } from '../services/errors.ts'
import { buildViewErrors, renderValidationErrors } from '../utils/view-errors.ts'

const organisationIdParams = Joi.object({
  organisationId: Joi.string().uuid().required()
})

const notFoundOnBadParams = () => {
  throw Boom.notFound()
}

const createSchema = Joi.object({
  crumb: Joi.any().optional(),
  name: Joi.string().trim().max(255).required().messages({
    'string.empty': 'Enter the name of the business',
    'any.required': 'Enter the name of the business',
    'string.max': 'Business name must be 255 characters or fewer'
  }),
  sbi: Joi.string().trim().pattern(/^\d{9}$/).required().messages({
    'string.empty': 'Enter the single business identifier (SBI)',
    'any.required': 'Enter the single business identifier (SBI)',
    'string.pattern.base': 'Single business identifier (SBI) must be 9 numbers'
  }),
  addressLine1: Joi.string().trim().allow('').max(255),
  addressLine2: Joi.string().trim().allow('').max(255),
  town: Joi.string().trim().allow('').max(255),
  county: Joi.string().trim().allow('').max(255),
  postcode: Joi.string().trim().allow('').max(10)
})

const inviteSchema = Joi.object({
  crumb: Joi.any().optional(),
  email: Joi.string().trim().email({ tlds: false }).max(320).required().messages({
    'string.empty': 'Enter an email address',
    'any.required': 'Enter an email address',
    'string.email': 'Enter an email address in the correct format, like name@example.com'
  }),
  permission: Joi.string().valid('owner', 'member').required().messages({
    'any.only': 'Select a permission level',
    'any.required': 'Select a permission level',
    'string.empty': 'Select a permission level'
  })
})

function toOrganisationDetails (payload: Record<string, string>): OrganisationDetails {
  const optional = (value: string | undefined): string | null => (value === undefined || value === '' ? null : value)

  return {
    name: payload.name as string,
    sbi: payload.sbi as string,
    addressLine1: optional(payload.addressLine1),
    addressLine2: optional(payload.addressLine2),
    town: optional(payload.town),
    county: optional(payload.county),
    postcode: optional(payload.postcode)
  }
}

const routes: ServerRoute[] = [{
  method: 'GET',
  path: '/organisations',
  handler: async (request, h) => {
    const person = request.auth.credentials.person

    if (person === undefined) {
      throw Boom.unauthorized()
    }

    const organisations = await listOrganisationsForPerson(person.id)

    return h.view('organisations/index', { organisations })
  }
}, {
  method: 'GET',
  path: '/organisations/create',
  handler: (_request, h) => {
    return h.view('organisations/create', { backLink: '/organisations' })
  }
}, {
  method: 'POST',
  path: '/organisations/create',
  options: {
    validate: {
      payload: createSchema,
      failAction: renderValidationErrors('organisations/create', () => ({ backLink: '/organisations' }))
    }
  },
  handler: async (request, h) => {
    const person = request.auth.credentials.person

    if (person === undefined) {
      throw Boom.unauthorized()
    }

    try {
      const organisation = await createOrganisationWithOwner(person.id, toOrganisationDetails(request.payload as Record<string, string>))

      return h.redirect(`/organisations/${organisation.id}`)
    } catch (err) {
      if (err instanceof DuplicateSbiError) {
        return h.view('organisations/create', {
          backLink: '/organisations',
          values: request.payload,
          errors: buildViewErrors({
            details: [{ path: ['sbi'], message: 'A business with this single business identifier already exists' }]
          })
        }).code(400)
      }

      throw err
    }
  }
}, {
  method: 'GET',
  path: '/organisations/{organisationId}',
  options: {
    validate: {
      params: organisationIdParams,
      failAction: notFoundOnBadParams
    },
    pre: [{ method: requireMembership(), assign: 'organisation' }]
  },
  handler: async (request, h) => {
    const organisation = request.pre.organisation as OrganisationMembership
    const people = await listPeopleInOrganisation(organisation.id)
    const invitations = organisation.permission === 'owner' ? await listPendingInvitations(organisation.id) : []

    return h.view('organisations/details', {
      organisation,
      people,
      invitations,
      backLink: '/organisations'
    })
  }
}, {
  method: 'GET',
  path: '/organisations/{organisationId}/invite',
  options: {
    validate: {
      params: organisationIdParams,
      failAction: notFoundOnBadParams
    },
    pre: [{ method: requireMembership(['owner']), assign: 'organisation' }]
  },
  handler: (request, h) => {
    const organisation = request.pre.organisation as OrganisationMembership

    return h.view('organisations/invite', {
      organisation,
      backLink: `/organisations/${organisation.id}`
    })
  }
}, {
  method: 'POST',
  path: '/organisations/{organisationId}/invite',
  options: {
    validate: {
      params: organisationIdParams,
      payload: inviteSchema,
      failAction: renderValidationErrors('organisations/invite', async (request) => {
        const person = request.auth.credentials.person
        const organisation = person === undefined
          ? undefined
          : await getOrganisationForPerson(String(request.params.organisationId), person.id)

        if (organisation === undefined) {
          throw Boom.notFound()
        }

        return { organisation, backLink: `/organisations/${organisation.id}` }
      })
    },
    pre: [{ method: requireMembership(['owner']), assign: 'organisation' }]
  },
  handler: async (request, h) => {
    const organisation = request.pre.organisation as OrganisationMembership
    const person = request.auth.credentials.person
    const { email, permission } = request.payload as { email: string, permission: 'owner' | 'member' }

    if (person === undefined) {
      throw Boom.unauthorized()
    }

    const token = await inviteToOrganisation({
      organisationId: organisation.id,
      invitedByPersonId: person.id,
      email,
      permission
    })

    // A real service would email this link. Showing it once keeps the example self contained.
    return h.view('organisations/invite-sent', {
      organisation,
      email,
      permission,
      invitationUrl: `${request.server.info.protocol}://${request.info.host}/invitations/${token}`
    })
  }
}]

export default routes

import Joi from 'joi'
import Boom from '@hapi/boom'
import type { ServerRoute } from '@hapi/hapi'
import { acceptInvitation, getInvitationByToken } from '../services/invitations.ts'
import {
  AlreadyMemberError,
  InvitationEmailMismatchError,
  InvitationNotValidError
} from '../services/errors.ts'

const tokenParams = Joi.object({
  token: Joi.string().pattern(/^[A-Za-z0-9_-]{20,64}$/).required()
})

const notFoundOnBadParams = () => {
  throw Boom.notFound()
}

const routes: ServerRoute[] = [{
  method: 'GET',
  path: '/invitations/{token}',
  options: {
    validate: {
      params: tokenParams,
      failAction: notFoundOnBadParams
    }
  },
  handler: async (request, h) => {
    const person = request.auth.credentials.person
    const invitation = await getInvitationByToken(String(request.params.token))

    if (person === undefined) {
      throw Boom.unauthorized()
    }

    if (invitation === undefined || invitation.acceptedAt !== null || invitation.expiresAt.getTime() <= Date.now()) {
      return h.view('invitations/not-valid').code(404)
    }

    if (invitation.email !== person.email.toLowerCase()) {
      return h.view('invitations/wrong-account', { invitation }).code(403)
    }

    return h.view('invitations/accept', { invitation })
  }
}, {
  method: 'POST',
  path: '/invitations/{token}',
  options: {
    validate: {
      params: tokenParams,
      failAction: notFoundOnBadParams
    }
  },
  handler: async (request, h) => {
    const person = request.auth.credentials.person

    if (person === undefined) {
      throw Boom.unauthorized()
    }

    try {
      const invitation = await acceptInvitation(String(request.params.token), person)

      return h.redirect(`/organisations/${invitation.organisationId}`)
    } catch (err) {
      if (err instanceof AlreadyMemberError) {
        return h.redirect('/organisations')
      }

      if (err instanceof InvitationEmailMismatchError) {
        return h.view('invitations/wrong-account').code(403)
      }

      if (err instanceof InvitationNotValidError) {
        return h.view('invitations/not-valid').code(404)
      }

      throw err
    }
  }
}]

export default routes

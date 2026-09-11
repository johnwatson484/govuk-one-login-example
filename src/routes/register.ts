import Joi from 'joi'
import type { Request, ServerRoute } from '@hapi/hapi'
import { updateSession } from '../auth/session-store.ts'
import { getOpenIdConfiguration } from '../auth/discovery.ts'
import { registerPerson } from '../services/registration.ts'
import { AlreadyRegisteredError } from '../services/errors.ts'
import { getSafeRedirect } from '../utils/get-safe-redirect.ts'
import { renderValidationErrors } from '../utils/view-errors.ts'

const answersKey = 'registration'

interface RegistrationAnswers {
  givenName?: string | undefined
  familyName?: string | undefined
  email?: string | undefined
  telephone?: string | undefined
}

function getAnswers (request: Request): RegistrationAnswers {
  return (request.yar.get(answersKey) ?? {}) as RegistrationAnswers
}

function setAnswers (request: Request, answers: RegistrationAnswers): void {
  request.yar.set(answersKey, { ...getAnswers(request), ...answers })
}

const nameSchema = Joi.object({
  crumb: Joi.any().optional(),
  givenName: Joi.string().trim().max(255).required().messages({
    'string.empty': 'Enter your first name',
    'any.required': 'Enter your first name',
    'string.max': 'First name must be 255 characters or fewer'
  }),
  familyName: Joi.string().trim().max(255).required().messages({
    'string.empty': 'Enter your last name',
    'any.required': 'Enter your last name',
    'string.max': 'Last name must be 255 characters or fewer'
  })
})

const contactSchema = Joi.object({
  crumb: Joi.any().optional(),
  email: Joi.string().trim().email({ tlds: false }).max(320).required().messages({
    'string.empty': 'Enter an email address',
    'any.required': 'Enter an email address',
    'string.email': 'Enter an email address in the correct format, like name@example.com',
    'string.max': 'Email address must be 320 characters or fewer'
  }),
  telephone: Joi.string().trim().allow('').max(30).messages({
    'string.max': 'Telephone number must be 30 characters or fewer'
  })
})

const routes: ServerRoute[] = [{
  method: 'GET',
  path: '/register/your-name',
  handler: (request, h) => {
    return h.view('register/your-name', { values: getAnswers(request), backLink: '/' })
  }
}, {
  method: 'POST',
  path: '/register/your-name',
  options: {
    validate: {
      payload: nameSchema,
      failAction: renderValidationErrors('register/your-name', () => ({ backLink: '/' }))
    }
  },
  handler: (request, h) => {
    const { givenName, familyName } = request.payload as RegistrationAnswers
    setAnswers(request, { givenName, familyName })

    return h.redirect('/register/contact-details')
  }
}, {
  method: 'GET',
  path: '/register/contact-details',
  handler: (request, h) => {
    const answers = getAnswers(request)

    return h.view('register/contact-details', {
      values: { email: answers.email ?? request.auth.credentials.session?.email, telephone: answers.telephone },
      backLink: '/register/your-name'
    })
  }
}, {
  method: 'POST',
  path: '/register/contact-details',
  options: {
    validate: {
      payload: contactSchema,
      failAction: renderValidationErrors('register/contact-details', () => ({ backLink: '/register/your-name' }))
    }
  },
  handler: (request, h) => {
    const { email, telephone } = request.payload as RegistrationAnswers
    setAnswers(request, { email, telephone })

    return h.redirect('/register/check-answers')
  }
}, {
  method: 'GET',
  path: '/register/check-answers',
  handler: (request, h) => {
    const answers = getAnswers(request)

    if (answers.givenName === undefined || answers.email === undefined) {
      return h.redirect('/register/your-name')
    }

    return h.view('register/check-answers', { values: answers, backLink: '/register/contact-details' })
  }
}, {
  method: 'POST',
  path: '/register/check-answers',
  handler: async (request, h) => {
    const answers = getAnswers(request)
    const { sessionId, session } = request.auth.credentials

    if (answers.givenName === undefined || answers.familyName === undefined || answers.email === undefined || session === undefined || sessionId === undefined) {
      return h.redirect('/register/your-name')
    }

    const { issuer } = await getOpenIdConfiguration()

    try {
      const person = await registerPerson({ issuer, subject: session.subject }, {
        givenName: answers.givenName,
        familyName: answers.familyName,
        email: answers.email,
        telephone: answers.telephone === undefined || answers.telephone === '' ? null : answers.telephone
      })

      await updateSession(request.server, sessionId, { personId: person.id })
      request.yar.clear(answersKey)

      return h.redirect('/register/confirmation')
    } catch (err) {
      if (err instanceof AlreadyRegisteredError) {
        // Another tab or a replayed submission already created the account.
        return h.redirect('/organisations')
      }

      throw err
    }
  }
}, {
  method: 'GET',
  path: '/register/confirmation',
  options: {
    // The person now exists, so the registration guard would otherwise redirect this page away.
    plugins: { registrationGuard: false }
  },
  handler: (request, h) => {
    const continueUrl = getSafeRedirect(request.yar.get('redirectTo'))
    request.yar.clear('redirectTo')

    return h.view('register/confirmation', {
      continueUrl: continueUrl === '/' ? '/organisations' : continueUrl
    })
  }
}]

export default routes

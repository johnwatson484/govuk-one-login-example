import { describe, test, expect } from 'vitest'
import Joi from 'joi'
import { buildViewErrors } from '../../../src/utils/view-errors.ts'

const schema = Joi.object({
  givenName: Joi.string().required().messages({ 'string.empty': 'Enter your first name' }),
  familyName: Joi.string().required().messages({ 'string.empty': 'Enter your last name' })
})

describe('buildViewErrors', () => {
  test('builds an error summary list and per field messages', () => {
    const { error } = schema.validate({ givenName: '', familyName: '' }, { abortEarly: false })
    const errors = buildViewErrors(error)

    expect(errors.errorList).toEqual([
      { text: 'Enter your first name', href: '#givenName' },
      { text: 'Enter your last name', href: '#familyName' }
    ])
    expect(errors.fields.givenName).toEqual({ text: 'Enter your first name' })
  })

  test('keeps only the first message for a field', () => {
    const { error } = Joi.object({
      sbi: Joi.string().length(9).pattern(/^\d+$/).required()
    }).validate({ sbi: 'abc' }, { abortEarly: false })

    const errors = buildViewErrors(error)

    expect(errors.errorList).toHaveLength(1)
  })

  test('returns empty collections when there is no error', () => {
    const errors = buildViewErrors(undefined)

    expect(errors.errorList).toEqual([])
    expect(errors.fields).toEqual({})
  })
})

import { describe, test, expect } from 'vitest'
import { getSafeRedirect } from '../../../src/utils/get-safe-redirect.ts'

describe('getSafeRedirect', () => {
  test.each([
    ['/organisations', '/organisations'],
    ['/organisations/123?tab=people', '/organisations/123?tab=people'],
    ['/', '/']
  ])('keeps the relative path %s', (input, expected) => {
    expect(getSafeRedirect(input)).toBe(expected)
  })

  test.each([
    'https://evil.example.com',
    '//evil.example.com',
    '/\\evil.example.com',
    'http://localhost:3000/organisations',
    'organisations',
    '',
    undefined,
    null,
    123
  ])('rejects %s', (input) => {
    expect(getSafeRedirect(input as string)).toBe('/')
  })
})

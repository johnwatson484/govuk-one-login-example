import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import type { Server } from '@hapi/hapi'
import { createServer } from '../../src/server.ts'

describe('home test', () => {
  let server: Server

  beforeEach(async () => {
    server = await createServer()
    await server.initialize()
  })

  test('GET /home route returns 200', async () => {
    const response = await server.inject({ method: 'GET', url: '/' })
    expect(response.statusCode).toBe(200)
  })

  afterEach(async () => {
    await server.stop()
  })
})

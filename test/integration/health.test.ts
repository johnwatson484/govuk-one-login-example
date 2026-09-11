import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { TestClient } from './helpers/test-client.ts'

describe('health', () => {
  let client: TestClient

  beforeAll(async () => {
    client = await TestClient.create()
  })

  afterAll(async () => {
    await client.stop()
  })

  test('GET /healthy returns 200 without signing in', async () => {
    const response = await client.inject({ method: 'GET', url: '/healthy' })
    expect(response.statusCode).toBe(200)
  })

  test('GET /healthz returns 200 without signing in', async () => {
    const response = await client.inject({ method: 'GET', url: '/healthz' })
    expect(response.statusCode).toBe(200)
  })
})

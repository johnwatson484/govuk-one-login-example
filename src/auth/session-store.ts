import { randomUUID } from 'node:crypto'
import type { Server } from '@hapi/hapi'

interface SessionRecord {
  subject: string
  personId: string | null
  email: string
  idToken: string
  accessToken: string
  refreshToken: string | null
  expiresAt: number
}

// The browser only ever holds an opaque session id. Tokens stay in Redis.
async function createSession (server: Server, record: SessionRecord): Promise<string> {
  const sessionId = randomUUID()
  await server.app.cache.set(sessionId, record, 0)

  return sessionId
}

async function getSession (server: Server, sessionId: string): Promise<SessionRecord | null> {
  return server.app.cache.get(sessionId) as Promise<SessionRecord | null>
}

async function updateSession (server: Server, sessionId: string, changes: Partial<SessionRecord>): Promise<void> {
  const existing = await getSession(server, sessionId)

  if (existing === null) {
    return
  }

  await server.app.cache.set(sessionId, { ...existing, ...changes }, 0)
}

async function dropSession (server: Server, sessionId: string): Promise<void> {
  await server.app.cache.drop(sessionId)
}

export { createSession, dropSession, getSession, updateSession }
export type { SessionRecord }

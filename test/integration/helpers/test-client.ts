import type { Server, ServerInjectOptions, ServerInjectResponse } from '@hapi/hapi'
import { createServer } from '../../../src/server.ts'
import type { Person } from '../../../src/data/types.ts'
import { createSession, getSession } from '../../../src/auth/session-store.ts'
import type { SessionRecord } from '../../../src/auth/session-store.ts'

async function getSessionRecord (server: Server, sessionId: string): Promise<SessionRecord> {
  return (await getSession(server, sessionId)) as SessionRecord
}

interface SignedInAs {
  subject: string
  email: string
  person?: Person | undefined
}

// Keeps cookies between injections so yar and crumb behave as they do in a browser.
class TestClient {
  readonly server: Server
  private readonly cookies = new Map<string, string>()
  private signedInAs: SignedInAs | undefined
  private sessionId: string | undefined

  constructor (server: Server) {
    this.server = server
  }

  static async create (): Promise<TestClient> {
    const server = await createServer()
    await server.initialize()

    return new TestClient(server)
  }

  // Mirrors what the callback handler does, minus the OpenID Connect round trip.
  async signIn (as: SignedInAs): Promise<void> {
    this.signedInAs = as
    this.sessionId = await createSession(this.server, {
      subject: as.subject,
      personId: as.person?.id ?? null,
      email: as.email,
      idToken: 'test-id-token',
      accessToken: 'test-access-token',
      refreshToken: null,
      expiresAt: Date.now() + 60000
    })
  }

  signOut (): void {
    this.signedInAs = undefined
    this.sessionId = undefined
    this.cookies.clear()
  }

  async inject (options: ServerInjectOptions): Promise<ServerInjectResponse> {
    const cookieHeader = [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ')
    const signedInAs = this.signedInAs
    const sessionId = this.sessionId

    const response = await this.server.inject({
      ...options,
      headers: {
        ...(cookieHeader.length > 0 ? { cookie: cookieHeader } : {}),
        ...options.headers
      },
      ...(signedInAs === undefined || sessionId === undefined
        ? {}
        : {
            auth: {
              strategy: 'session',
              credentials: {
                sessionId,
                session: await getSessionRecord(this.server, sessionId),
                ...(signedInAs.person === undefined ? {} : { person: signedInAs.person })
              },
              artifacts: {}
            }
          })
    })

    for (const header of response.headers['set-cookie'] ?? []) {
      const [pair] = header.split(';')
      const separator = (pair ?? '').indexOf('=')

      if (separator > 0) {
        this.cookies.set((pair as string).slice(0, separator), (pair as string).slice(separator + 1))
      }
    }

    return response
  }

  async crumb (url = '/'): Promise<string> {
    if (!this.cookies.has('crumb')) {
      await this.inject({ method: 'GET', url })
    }

    return this.cookies.get('crumb') as string
  }

  async post (url: string, payload: Record<string, string> = {}): Promise<ServerInjectResponse> {
    const crumb = await this.crumb(url)

    return this.inject({ method: 'POST', url, payload: { ...payload, crumb } })
  }

  async stop (): Promise<void> {
    await this.server.stop()
  }
}

export { TestClient }
export type { SignedInAs }

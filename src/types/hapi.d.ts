import type { SessionRecord } from '../auth/session-store.ts'
import type { Person } from '../data/types.ts'

declare module '@hapi/hapi' {
  interface PluginSpecificConfiguration {
    registrationGuard?: boolean
  }

  interface ServerApplicationState {
    cache: {
      get: (key: string) => Promise<unknown>
      set: (key: string, value: unknown, ttl?: number) => Promise<void>
      drop: (key: string) => Promise<void>
    }
  }

  interface AuthCredentials {
    sessionId?: string
    session?: SessionRecord
    person?: Person
    token?: string
    refreshToken?: string
    expiresIn?: number
  }
}

export {}

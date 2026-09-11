import { getDb } from './db.ts'
import type { Queryable } from './db.ts'

interface AuditEvent {
  eventType: string
  personId?: string | null
  organisationId?: string | null
  detail?: Record<string, unknown> | null
}

async function recordAuditEvent (event: AuditEvent, db: Queryable = getDb()): Promise<void> {
  await db.query(
    'INSERT INTO audit_event (event_type, person_id, organisation_id, detail) VALUES ($1, $2, $3, $4)',
    [
      event.eventType,
      event.personId ?? null,
      event.organisationId ?? null,
      event.detail === undefined || event.detail === null ? null : JSON.stringify(event.detail)
    ]
  )
}

export { recordAuditEvent }
export type { AuditEvent }

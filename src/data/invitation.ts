import { getDb } from './db.ts'
import type { Queryable } from './db.ts'
import type { Invitation, Permission } from './types.ts'

interface NewInvitation {
  organisationId: string
  invitedByPersonId: string
  email: string
  permission: Permission
  tokenHash: string
  expiresAt: Date
}

async function createInvitation (db: Queryable, invitation: NewInvitation): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO invitation (organisation_id, invited_by_person_id, email, permission, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      invitation.organisationId,
      invitation.invitedByPersonId,
      invitation.email,
      invitation.permission,
      invitation.tokenHash,
      invitation.expiresAt
    ]
  )

  return (rows[0] as { id: string }).id
}

async function findInvitationByTokenHash (tokenHash: string, db: Queryable = getDb()): Promise<Invitation | undefined> {
  const { rows } = await db.query<Invitation>(
    `SELECT i.id,
            i.organisation_id AS "organisationId",
            o.name AS "organisationName",
            i.email,
            i.permission,
            i.expires_at AS "expiresAt",
            i.accepted_at AS "acceptedAt"
     FROM invitation i
     JOIN organisation o ON o.id = i.organisation_id
     WHERE i.token_hash = $1`,
    [tokenHash]
  )

  return rows[0]
}

// Conditional update so two concurrent requests cannot both consume the same invitation.
async function markInvitationAccepted (db: Queryable, invitationId: string): Promise<boolean> {
  const { rows } = await db.query<{ id: string }>(
    `UPDATE invitation
     SET accepted_at = now()
     WHERE id = $1 AND accepted_at IS NULL AND expires_at > now()
     RETURNING id`,
    [invitationId]
  )

  return rows.length === 1
}

async function listPendingInvitations (organisationId: string, db: Queryable = getDb()): Promise<Invitation[]> {
  const { rows } = await db.query<Invitation>(
    `SELECT i.id,
            i.organisation_id AS "organisationId",
            o.name AS "organisationName",
            i.email,
            i.permission,
            i.expires_at AS "expiresAt",
            i.accepted_at AS "acceptedAt"
     FROM invitation i
     JOIN organisation o ON o.id = i.organisation_id
     WHERE i.organisation_id = $1 AND i.accepted_at IS NULL AND i.expires_at > now()
     ORDER BY i.created_at DESC`,
    [organisationId]
  )

  return rows
}

export { createInvitation, findInvitationByTokenHash, markInvitationAccepted, listPendingInvitations }
export type { NewInvitation }

import { createHash, randomBytes } from 'node:crypto'
import { withTransaction } from '../data/db.ts'
import { recordAuditEvent } from '../data/audit.ts'
import { createInvitation, findInvitationByTokenHash, markInvitationAccepted } from '../data/invitation.ts'
import { addMembership } from '../data/membership.ts'
import {
  AlreadyMemberError,
  InvitationEmailMismatchError,
  InvitationNotValidError,
  isUniqueViolation
} from './errors.ts'
import type { Invitation, Permission, Person } from '../data/types.ts'

const invitationLifetimeDays = 7

function hashToken (token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

interface NewInvitationRequest {
  organisationId: string
  invitedByPersonId: string
  email: string
  permission: Permission
}

// The raw token is returned once and never stored. Only its hash reaches the database.
async function inviteToOrganisation (request: NewInvitationRequest): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + invitationLifetimeDays * 24 * 60 * 60 * 1000)

  await withTransaction(async (client) => {
    const invitationId = await createInvitation(client, {
      organisationId: request.organisationId,
      invitedByPersonId: request.invitedByPersonId,
      email: request.email.toLowerCase(),
      permission: request.permission,
      tokenHash: hashToken(token),
      expiresAt
    })

    await recordAuditEvent({
      eventType: 'invitation.created',
      personId: request.invitedByPersonId,
      organisationId: request.organisationId,
      detail: { invitationId, permission: request.permission }
    }, client)
  })

  return token
}

async function getInvitationByToken (token: string): Promise<Invitation | undefined> {
  return findInvitationByTokenHash(hashToken(token))
}

async function acceptInvitation (token: string, person: Person): Promise<Invitation> {
  const invitation = await getInvitationByToken(token)

  if (invitation === undefined || invitation.acceptedAt !== null || invitation.expiresAt.getTime() <= Date.now()) {
    throw new InvitationNotValidError('This invitation is no longer valid')
  }

  if (invitation.email !== person.email.toLowerCase()) {
    throw new InvitationEmailMismatchError('This invitation was sent to a different email address')
  }

  try {
    await withTransaction(async (client) => {
      const claimed = await markInvitationAccepted(client, invitation.id)

      if (!claimed) {
        throw new InvitationNotValidError('This invitation is no longer valid')
      }

      await addMembership(client, invitation.organisationId, person.id, invitation.permission)
      await recordAuditEvent({
        eventType: 'invitation.accepted',
        personId: person.id,
        organisationId: invitation.organisationId,
        detail: { invitationId: invitation.id, permission: invitation.permission }
      }, client)
    })
  } catch (err) {
    if (isUniqueViolation(err, 'organisation_person_organisation_id_person_id_key')) {
      throw new AlreadyMemberError('You are already linked to this business')
    }

    throw err
  }

  return invitation
}

export { acceptInvitation, getInvitationByToken, hashToken, inviteToOrganisation }
export type { NewInvitationRequest }

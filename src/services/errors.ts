class DomainError extends Error {
  constructor (message: string) {
    super(message)
    this.name = new.target.name
  }
}

class AlreadyRegisteredError extends DomainError {}
class DuplicateSbiError extends DomainError {}
class InvitationNotValidError extends DomainError {}
class InvitationEmailMismatchError extends DomainError {}
class AlreadyMemberError extends DomainError {}

const uniqueViolation = '23505'

function isUniqueViolation (err: unknown, constraint: string): boolean {
  const candidate = err as { code?: string, constraint?: string }

  return candidate?.code === uniqueViolation && candidate?.constraint === constraint
}

export {
  DomainError,
  AlreadyRegisteredError,
  DuplicateSbiError,
  InvitationNotValidError,
  InvitationEmailMismatchError,
  AlreadyMemberError,
  isUniqueViolation
}

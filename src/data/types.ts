export type Permission = 'owner' | 'member'

export interface Person {
  id: string
  givenName: string
  familyName: string
  email: string
  telephone: string | null
}

export interface Organisation {
  id: string
  name: string
  sbi: string
  addressLine1: string | null
  addressLine2: string | null
  town: string | null
  county: string | null
  postcode: string | null
}

export interface OrganisationMembership extends Organisation {
  permission: Permission
}

export interface OrganisationPerson extends Person {
  permission: Permission
}

export interface Invitation {
  id: string
  organisationId: string
  organisationName: string
  email: string
  permission: Permission
  expiresAt: Date
  acceptedAt: Date | null
}

export interface PersonDetails {
  givenName: string
  familyName: string
  email: string
  telephone: string | null
}

export interface OrganisationDetails {
  name: string
  sbi: string
  addressLine1: string | null
  addressLine2: string | null
  town: string | null
  county: string | null
  postcode: string | null
}

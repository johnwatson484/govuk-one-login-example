import Wreck from '@hapi/wreck'
import { getOpenIdConfiguration } from './discovery.ts'

interface UserInfo {
  sub: string
  email?: string
  email_verified?: boolean
  phone_number?: string
  phone_number_verified?: boolean
}

async function getUserInfo (accessToken: string): Promise<UserInfo> {
  const { userinfo_endpoint: userInfoEndpoint } = await getOpenIdConfiguration()

  const { res, payload } = await Wreck.get<UserInfo>(userInfoEndpoint, {
    json: true,
    headers: { authorization: `Bearer ${accessToken}` }
  })

  if (res.statusCode !== 200) {
    throw new Error(`Userinfo request failed with status ${res.statusCode}`)
  }

  return payload
}

export { getUserInfo }
export type { UserInfo }

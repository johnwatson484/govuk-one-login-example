import config from '../config/index.ts'
import { getOpenIdConfiguration } from './discovery.ts'

// URLSearchParams escapes the ID token correctly. Concatenating and calling
// encodeURI would leave `&`, `=` and `+` intact and corrupt the request.
async function getSignOutUrl (idToken: string, state: string): Promise<string> {
  const { end_session_endpoint: endSessionEndpoint } = await getOpenIdConfiguration()

  const params = new URLSearchParams({
    id_token_hint: idToken,
    post_logout_redirect_uri: config.get('oneLogin.postLogoutRedirectUrl'),
    state
  })

  return `${endSessionEndpoint}?${params.toString()}`
}

export { getSignOutUrl }

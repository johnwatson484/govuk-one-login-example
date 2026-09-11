import type { Plugin, ServerOptions } from '@hapi/hapi'
import home from '../routes/home.ts'
import assets from '../routes/assets.ts'
import health from '../routes/health.ts'
import auth from '../routes/auth.ts'
import register from '../routes/register.ts'
import organisations from '../routes/organisations.ts'
import invitations from '../routes/invitations.ts'
import account from '../routes/account.ts'

const plugin: Plugin<ServerOptions> = {
  name: 'router',
  register: (server) => {
    server.route([
      home,
      account,
      ...assets,
      ...health,
      ...auth,
      ...register,
      ...organisations,
      ...invitations
    ])
  }
}

export default plugin

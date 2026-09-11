import type { Plugin, ServerOptions } from '@hapi/hapi'
import home from '../routes/home.ts'
import assets from '../routes/assets.ts'
import health from '../routes/health.ts'

const plugin: Plugin<ServerOptions> = {
  name: 'router',
  register: (server) => {
    server.route([home, assets, ...health])
  }
}

export default plugin

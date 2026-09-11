import { getDb, closeDb } from '../data/db.ts'
import type { Plugin, ServerOptions } from '@hapi/hapi'

const plugin: Plugin<ServerOptions> = {
  name: 'postgres',
  register: async (server) => {
    await getDb().query('SELECT 1')

    server.events.on('stop', () => {
      closeDb().catch((err: unknown) => {
        server.logger.error(err, 'failed to close the PostgreSQL pool')
      })
    })
  }
}

export default plugin

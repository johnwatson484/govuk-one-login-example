import { Server } from '@hapi/hapi'
import { Engine as CatboxRedis } from '@hapi/catbox-redis'
import Joi from 'joi'
import { registerPlugins } from './plugins/index.ts'
import config from './config/index.ts'

async function createServer (): Promise<Server> {
  const server = new Server({
    host: config.get('host'),
    port: config.get('port'),
    cache: [{
      name: config.get('cache.name'),
      provider: {
        constructor: CatboxRedis,
        options: {
          partition: config.get('cache.partition'),
          host: config.get('cache.host'),
          port: config.get('cache.port'),
          ...(config.get('cache.password') === '' ? {} : { password: config.get('cache.password') }),
          ...(config.get('cache.useTls') === true ? { tls: {} } : {})
        }
      }
    }],
    routes: {
      validate: {
        options: {
          abortEarly: false
        }
      }
    },
    router: {
      stripTrailingSlash: true
    }
  })

  server.app.cache = server.cache({
    cache: config.get('cache.name'),
    segment: config.get('cache.segment'),
    expiresIn: config.get('cache.ttl')
  })

  server.validator(Joi)
  await registerPlugins(server)

  return server
}

export { createServer }

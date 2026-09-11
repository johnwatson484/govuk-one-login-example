import type { ServerRegisterPluginObject } from '@hapi/hapi'
import HapiPino from 'hapi-pino'
import logger from '../logger.ts'

const plugin: ServerRegisterPluginObject<any> = {
  plugin: HapiPino,
  options: {
    instance: logger,
    logPayload: true,
    level: 'warn'
  }
}

export default plugin

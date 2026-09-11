import path from 'node:path'
import nunjucks from 'nunjucks'
import type { Template } from 'nunjucks'
import Vision from '@hapi/vision'
import type { ServerRegisterPluginObject } from '@hapi/hapi'
import config from '../config.ts'

const plugin: ServerRegisterPluginObject<any> = {
  plugin: Vision,
  options: {
    engines: {
      njk: {
        compile: (src: string, options: any) => {
          const template: Template = nunjucks.compile(src, options.environment)

          return (context: any) => {
            return template.render(context)
          }
        },
        prepare: (options: any, next: (err?: Error) => void) => {
          options.compileOptions.environment = nunjucks.configure(path.join(options.relativeTo || process.cwd(), options.path), {
            autoescape: true
          })

          return next()
        }
      }
    },
    path: '../views',
    relativeTo: import.meta.dirname,
    isCached: !config.get('isDev'),
    context: {
      assetPath: '/assets',
      appName: config.get('appName')
    }
  }
}

export default plugin

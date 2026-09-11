import path from 'node:path'
import { fileURLToPath } from 'node:url'
import nunjucks from 'nunjucks'
import type { Template } from 'nunjucks'
import Vision from '@hapi/vision'
import type { Request, ServerRegisterPluginObject } from '@hapi/hapi'
import config from '../config/index.ts'

const govukFrontendRoot = path.dirname(fileURLToPath(import.meta.resolve('govuk-frontend/package.json')))

const searchPaths = [
  path.join(import.meta.dirname, '../views'),
  path.join(govukFrontendRoot, 'dist')
]

function buildNavigation (request: Request): Array<Record<string, string>> {
  if (request.auth.credentials?.person === undefined) {
    return []
  }

  return [
    { href: '/organisations', text: 'Your businesses' },
    { href: '/account', text: 'Your details' },
    { href: '/sign-out', text: 'Sign out' }
  ]
}

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
          const environment = nunjucks.configure(searchPaths, {
            autoescape: true
          })

          environment.addFilter('date', (value: Date | string) => {
            return new Intl.DateTimeFormat('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }).format(new Date(value))
          })

          options.compileOptions.environment = environment

          return next()
        }
      }
    },
    path: searchPaths,
    isCached: !config.get('isDev'),
    context: (request: Request | null) => ({
      assetPath: '/assets',
      appName: config.get('appName'),
      serviceName: config.get('appName'),
      navigation: request === null ? [] : buildNavigation(request)
    })
  }
}

export default plugin

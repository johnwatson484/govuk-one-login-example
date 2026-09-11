import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ServerRoute } from '@hapi/hapi'

const govukFrontendRoot = path.dirname(fileURLToPath(import.meta.resolve('govuk-frontend/package.json')))
const govukDist = path.join(govukFrontendRoot, 'dist/govuk')

const assetsRoute: ServerRoute = {
  method: 'GET',
  path: '/assets/{path*}',
  options: {
    auth: false
  },
  handler: {
    directory: {
      path: [
        path.join(import.meta.dirname, '../assets/css'),
        path.join(import.meta.dirname, '../assets/images'),
        path.join(import.meta.dirname, '../assets/js'),
        // Supplies fonts, images and manifest.json referenced by the GOV.UK Frontend stylesheet.
        path.join(govukDist, 'assets')
      ]
    }
  }
}

const frontendRoutes: ServerRoute[] = ['govuk-frontend.min.css', 'govuk-frontend.min.js'].map((file) => ({
  method: 'GET',
  path: `/assets/${file}`,
  options: {
    auth: false
  },
  handler: {
    file: path.join(govukDist, file)
  }
}))

export default [...frontendRoutes, assetsRoute]

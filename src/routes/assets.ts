import type { ServerRoute } from '@hapi/hapi'

const route: ServerRoute = {
  method: 'GET',
  path: '/assets/{path*}',
  handler: {
    directory: {
      path: [
        'src/assets/css',
        'src/assets/images',
        'src/assets/js'
      ]
    }
  }
}

export default route

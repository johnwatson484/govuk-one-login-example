import type { ServerRoute } from '@hapi/hapi'

const route: ServerRoute = {
  method: 'GET',
  path: '/',
  handler: (_request, h) => {
    return h.view('home')
  }
}

export default route

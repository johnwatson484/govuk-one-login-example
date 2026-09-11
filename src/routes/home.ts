import type { ServerRoute } from '@hapi/hapi'

const route: ServerRoute = {
  method: 'GET',
  path: '/',
  options: {
    auth: { mode: 'try' }
  },
  handler: (request, h) => {
    if (request.auth.isAuthenticated) {
      return h.redirect('/organisations')
    }

    return h.view('home')
  }
}

export default route

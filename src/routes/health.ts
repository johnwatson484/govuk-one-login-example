import type { ServerRoute } from '@hapi/hapi'

const routes: ServerRoute[] = [{
  method: 'GET',
  path: '/healthy',
  handler: (_request, h) => {
    return h.response('ok')
  }
}, {
  method: 'GET',
  path: '/healthz',
  handler: (_request, h) => {
    return h.response('ok')
  }
}]

export default routes

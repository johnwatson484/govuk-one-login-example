import type { ServerRegisterPluginObject } from '@hapi/hapi'
import Blankie from 'blankie'

const plugin: ServerRegisterPluginObject<any> = {
  plugin: Blankie,
  options: {
    fontSrc: ['self'],
    imgSrc: ['self'],
    scriptSrc: ['self'],
    styleSrc: ['self', 'cdn.jsdelivr.net'],
    frameAncestors: ['self'],
    formAction: ['self'],
    generateNonces: false
  }
}

export default plugin

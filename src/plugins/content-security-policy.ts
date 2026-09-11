import type { ServerRegisterPluginObject } from '@hapi/hapi'
import Blankie from 'blankie'

const plugin: ServerRegisterPluginObject<any> = {
  plugin: Blankie,
  options: {
    defaultSrc: ['self'],
    fontSrc: ['self'],
    imgSrc: ['self'],
    scriptSrc: ['self'],
    styleSrc: ['self'],
    connectSrc: ['self'],
    objectSrc: ['none'],
    baseUri: ['self'],
    frameAncestors: ['none'],
    formAction: ['self'],
    // Blankie puts the generated value on the view context as `nonce`, which _layout.njk
    // passes to the GOV.UK template as `cspNonce`.
    generateNonces: 'script'
  }
}

export default plugin

import glob from 'glob'
import Router from 'koa-router'

module.exports = function (app, socket) {
  const matches = glob.sync(`${__dirname}/*`, { ignore: '**/index.js' })

  matches.forEach((mod) => {
    mod = '.' + mod.split('server/src/modules')[1]
    if (mod === './deployments' || mod === './project-detail' || mod === './release-detail' || mod === './story-detail') {
      const io = require(`${mod}/router`).io
      io(socket)
    }
    app.use(async (ctx, next) => {
      const router = require(`${mod}/router`)

      const routes = router.default
      const baseUrl = router.baseUrl
      const baseInstance = new Router()
      const instance = new Router({ prefix: baseUrl })

      routes.forEach((config) => {
        const {
          method = '',
          route = '',
          handlers = []
        } = config
        const _handlers = handlers.slice(0)
        const lastHandler = _handlers.pop()

        if (lastHandler) {
          instance[method.toLowerCase()](route, ..._handlers, async function(ctx) {
            return await lastHandler(ctx)
          })
        }
      })
      baseInstance.use('/api', instance.routes(), instance.allowedMethods())
      await baseInstance.routes()(ctx, next)
    })
  })
}

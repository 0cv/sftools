export function errorMiddleware() {
  return async (ctx, next) => {
    try {
      await next()
    } catch (err) {
      ctx.status = err && err.status || 500
      ctx.body = err &&  err.message
      ctx.app.emit('error', err, ctx)
    }
  }
}

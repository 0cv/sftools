export async function ensureAuthenticated(ctx, next) {
  console.log('ctx.isAuthenticated', ctx.isAuthenticated)
  if (ctx.isAuthenticated()) {
    return next()
  } else {
    ctx.throw(401)
  }
}

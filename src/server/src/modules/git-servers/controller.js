import { GitServer } from '../../models'

export async function createGitserver(ctx) {
  delete ctx.request.body._id
  const gitServer = new GitServer(ctx.request.body)
  gitServer.user = ctx.session.passport.user._id

  try {
    await gitServer.save()
    ctx.body = gitServer.toJSON()
  } catch (err) {
    ctx.throw(422, err.message)
  }
}

export async function updateGitserver(ctx) {
  const gitServer = ctx.body.gitServer

  Object.assign(gitServer, ctx.request.body)

  await gitServer.save()

  ctx.body = {
    success: true
  }
}

export async function getGitserver(ctx, next) {
  try {
    const gitServer = await GitServer.find({ _id: ctx.params._id, user: ctx.session.passport.user._id })

    if (!gitServer.length) {
      ctx.throw(404)
    }

    ctx.body = {
      gitServer: gitServer[0]
    }
  } catch (err) {
    if (err === 404 || err.name === 'CastError') {
      ctx.throw(404)
    }

    ctx.throw(500)
  }

  next && next()
}

export async function getGitservers(ctx) {
  const gitServer = await GitServer.find({ user: ctx.session.passport.user._id })
  ctx.body = gitServer
}

export async function deleteGitserver(ctx) {
  const gitServer = new GitServer({_id: ctx.params._id})

  await gitServer.remove()

  ctx.body = {
    success: true
  }
}

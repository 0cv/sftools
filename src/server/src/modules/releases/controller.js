import { Release } from '../../models'

export async function createRelease(ctx) {
  delete ctx.request.body._id
  const release = new Release(ctx.request.body)
  release.user = ctx.session.passport.user._id

  try {
    await release.save()
    ctx.body = release.toJSON()
  } catch (err) {
    ctx.throw(422, err.message)
  }
}

export async function updateRelease(ctx) {
  const release = ctx.body.release

  Object.assign(release, ctx.request.body)

  await release.save()

  ctx.body = {
    success: true
  }
}

export async function getRelease(ctx, next) {
  try {
    const release = await Release.find({
      _id: ctx.params._id,
      $or: [{
        sharedWith: ctx.session.passport.user._id
      }, {
        user: ctx.session.passport.user._id
      }]
    })

    if (!release.length) {
      ctx.throw(404)
    }

    ctx.body = {
      release: release[0]
    }
  } catch (err) {
    if (err === 404 || err.name === 'CastError') {
      ctx.throw(404)
    }

    ctx.throw(500)
  }

  next && next()
}

export async function getReleases(ctx) {
  const release = await Release.find({
    $or: [{
      sharedWith: ctx.session.passport.user._id
    }, {
      user: ctx.session.passport.user._id
    }]
  })
  ctx.body = release
}

export async function deleteRelease(ctx) {
  const release = new Release({_id: ctx.params._id})

  await release.remove()

  ctx.body = {
    success: true
  }
}

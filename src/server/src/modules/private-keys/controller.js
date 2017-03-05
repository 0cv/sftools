import { PrivateKey } from '../../models'

export async function createPrivatekey(ctx) {
  delete ctx.request.body._id
  const privateKey = new PrivateKey(ctx.request.body)
  privateKey.user = ctx.session.passport.user._id

  try {
    await privateKey.save()
    ctx.body = privateKey.toJSON()
  } catch (err) {
    ctx.throw(422, err.message)
  }
}

export async function updatePrivatekey(ctx) {
  const privateKey = ctx.body.privateKey

  Object.assign(privateKey, ctx.request.body)

  await privateKey.save()

  ctx.body = {
    success: true
  }
}

export async function getPrivatekey(ctx, next) {
  try {
    const privateKey = await PrivateKey.find({ _id: ctx.params._id, user: ctx.session.passport.user._id })

    if (!privateKey.length) {
      ctx.throw(404)
    }

    ctx.body = {
      privateKey: privateKey[0]
    }
  } catch (err) {
    if (err === 404 || err.name === 'CastError') {
      ctx.throw(404)
    }

    ctx.throw(500)
  }

  next && next()
}

export async function getPrivatekeys(ctx) {
  const privateKey = await PrivateKey.find({ user: ctx.session.passport.user._id })
  ctx.body = privateKey
}

export async function deletePrivatekey(ctx) {
  const privateKey = new PrivateKey({_id: ctx.params._id})

  await privateKey.remove()

  ctx.body = {
    success: true
  }
}

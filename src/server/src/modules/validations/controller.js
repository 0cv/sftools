import { Validation } from '../../models'

export async function createValidation(ctx) {
  delete ctx.request.body._id
  const validation = new Validation(ctx.request.body)
  validation.user = ctx.session.passport.user._id

  try {
    await validation.save()
    ctx.body = validation.toJSON()
  } catch (err) {
    ctx.throw(422, err.message)
  }
}

export async function updateValidation(ctx) {
  const validation = ctx.body.validation

  Object.assign(validation, ctx.request.body)

  await validation.save()

  ctx.body = {
    success: true
  }
}

export async function getValidation(ctx, next) {
  try {
    const validation = await Validation.find({
      _id: ctx.params._id,
      $or: [{
        sharedWith: ctx.session.passport.user._id
      }, {
        user: ctx.session.passport.user._id
      }]
    })

    if (!validation.length) {
      ctx.throw(404)
    }

    ctx.body = {
      validation: validation[0]
    }
  } catch (err) {
    if (err === 404 || err.name === 'CastError') {
      ctx.throw(404)
    }

    ctx.throw(500)
  }

  next && next()
}

export async function getValidations(ctx) {
  const validation = await Validation.find({
    $or: [{
      sharedWith: ctx.session.passport.user._id
    }, {
      user: ctx.session.passport.user._id
    }]
  })
  ctx.body = validation
}

export async function deleteValidation(ctx) {
  const validation = new Validation({_id: ctx.params._id})

  await validation.remove()

  ctx.body = {
    success: true
  }
}

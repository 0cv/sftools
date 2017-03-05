import { Story } from '../../models'

export async function createStory(ctx) {
  delete ctx.request.body._id
  const story = new Story(ctx.request.body)
  story.user = ctx.session.passport.user._id

  try {
    await story.save()
    ctx.body = story.toJSON()
  } catch (err) {
    ctx.throw(422, err.message)
  }
}

export async function updateStory(ctx) {
  const story = ctx.body.story

  Object.assign(story, ctx.request.body)

  await story.save()

  ctx.body = {
    success: true
  }
}

export async function getStory(ctx, next) {
  try {
    const story = await Story.find({
      _id: ctx.params._id,
      $or: [{
        sharedWith: ctx.session.passport.user._id
      }, {
        user: ctx.session.passport.user._id
      }]
    })

    if (!story.length) {
      ctx.throw(404)
    }

    ctx.body = {
      story: story[0]
    }
  } catch (err) {
    if (err === 404 || err.name === 'CastError') {
      ctx.throw(404)
    }

    ctx.throw(500)
  }

  next && next()
}

export async function getStories(ctx) {
  const story = await Story.find({
    $or: [{
      sharedWith: ctx.session.passport.user._id
    }, {
      user: ctx.session.passport.user._id
    }]
  })
  ctx.body = story
}

export async function deleteStory(ctx) {
  const story = new Story({_id: ctx.params._id})

  await story.remove()

  ctx.body = {
    success: true
  }
}

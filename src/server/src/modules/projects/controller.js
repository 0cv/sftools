import { Project } from '../../models'

export async function createProject(ctx) {
  delete ctx.request.body._id
  const project = new Project(ctx.request.body)
  project.user = ctx.session.passport.user._id

  try {
    await project.save()
    ctx.body = project.toJSON()
  } catch (err) {
    ctx.throw(422, err.message)
  }
}

export async function updateProject(ctx) {
  const project = ctx.body.project

  Object.assign(project, ctx.request.body)

  await project.save()

  ctx.body = {
    success: true
  }
}

export async function getProject(ctx, next) {
  try {
    const project = await Project.find({
      _id: ctx.params._id,
      $or: [{
        sharedWith: ctx.session.passport.user._id
      }, {
        user: ctx.session.passport.user._id
      }]
    })

    if (!project.length) {
      ctx.throw(404)
    }

    ctx.body = {
      project: project[0]
    }
  } catch (err) {
    if (err === 404 || err.name === 'CastError') {
      ctx.throw(404)
    }

    ctx.throw(500)
  }

  next && next()
}

export async function getProjects(ctx) {
  const project = await Project.find({
    $or: [{
      sharedWith: ctx.session.passport.user._id
    }, {
      user: ctx.session.passport.user._id
    }]
  })
  ctx.body = project
}

export async function deleteProject(ctx) {
  const project = new Project({_id: ctx.params._id})

  await project.remove()

  ctx.body = {
    success: true
  }
}

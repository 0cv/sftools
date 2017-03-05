import {User} from '../../models'
import passport from 'koa-passport'
import {sendMail} from '../../utils'
/**
 * @api {post} /users Create a new user
 * @apiPermission
 * @apiVersion 1.0.0
 * @apiName Create
 * @apiGroup Users
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X POST -d '{ "user": { "username": "johndoe", "password": "secretpasas" } }' localhost:8000/users
 *
 * @apiParam {Object} user          User object (required)
 * @apiParam {String} user.username Username.
 * @apiParam {String} user.password Password.
 *
 * @apiSuccess {Object}   users           User object
 * @apiSuccess {ObjectId} users._id       User id
 * @apiSuccess {String}   users.name      User name
 * @apiSuccess {String}   users.username  User username
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "user": {
 *          "_id": "56bd1da600a526986cf65c80"
 *          "name": "John Doe"
 *          "username": "johndoe"
 *       }
 *     }
 *
 * @apiError UnprocessableEntity Missing required parameters
 *
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 422 Unprocessable Entity
 *     {
 *       "status": 422,
 *       "error": "Unprocessable Entity"
 *     }
 */
export async function createUser(ctx) {
  const user = new User(ctx.request.body)
  try {
    await user.save()
    sendMail({
      to: user.email,
      subject: 'SF Tools',
      text: `Thanks for signing up!\n\nYour username: ${ctx.request.body.username}.\n\nFor issues or getting started, have a look at the GitHub page: https://github.com/Krisa/sftools`
    })
  } catch (err) {
    let errorMessage = err.message
    if(err.errors) {
      errorMessage = err.errors[Object.keys(err.errors)[0]].message
    }
    ctx.throw(422, errorMessage)
  }

  const token = user.generateToken()
  const response = user.toJSON()

  delete response.password

  ctx.body = {
    user: response,
    token
  }
}

export async function resetPassword(ctx) {
  let user = await User.find({'$or':[{email: ctx.request.body.email}, {username: ctx.request.body.email}]})
  if (!user.length) {
    ctx.throw(404)
  }
  user = user[0]
  user.password = Math.floor(Math.random() * 1000000000000000);
  try {
    console.log('user', user)
    sendMail({
      to: user.email,
      subject: 'Your new password',
      text: `Your new password: ${user.password}`
    })
    await user.save()
  } catch (err) {
    ctx.throw(422, err.message)
  }
  ctx.body = {
    success: true
  }
}

/**
 * @apiDefine TokenError
 * @apiError Unauthorized Invalid JWT token
 *
 * @apiErrorExample {json} Unauthorized-Error:
 *     HTTP/1.1 401 Unauthorized
 *     {
 *       "status": 401,
 *       "error": "Unauthorized"
 *     }
 */

/**
 * @api {post} /users/login Authenticate user
 * @apiVersion 1.0.0
 * @apiName Create
 * @apiGroup Users
 *
 * @apiParam {String} username  User username.
 * @apiParam {String} password  User password.
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X POST -d '{ "username": "johndoe@gmail.com", "password": "foo" }' localhost:8000/auth
 *
 * @apiSuccess {Object}   user           User object
 * @apiSuccess {ObjectId} user._id       User id
 * @apiSuccess {String}   user.name      User name
 * @apiSuccess {String}   user.username  User username
 * @apiSuccess {String}   token          Encoded JWT
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "user": {
 *          "_id": "56bd1da600a526986cf65c80"
 *          "username": "johndoe"
 *        },
 *       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ"
 *     }
 *
 * @apiError Unauthorized Incorrect credentials
 *
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *     {
 *       "status": 401,
 *       "error": "Unauthorized"
 *     }
 */

export function login(ctx, next) {
  console.log('login...', ctx.request.body)
  return passport.authenticate('local', (err, user) => {
    if (!user) {
      ctx.throw(401)
    }

    const token = user.generateToken()

    const response = user.toJSON()

    delete response.password

    ctx.body = {
      token,
      user: response
    }
    return ctx.login(user)
  })(ctx, next)
}

/**
 * @api {get} /User/isAuthenticated
 * @apiPermission user
 * @apiVersion 1.0.0
 * @apiName isAuthenticated
 * @apiGroup Users
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X GET localhost:8000/User/isAuthenticated
 *
 * @apiSuccess {Boolean}
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *       true|false
 *
 * @apiUse TokenError
 */
export function isAuthenticated(ctx) {
  ctx.body = ctx.isAuthenticated()
}

/**
 * @api {get} /User/logout
 * @apiPermission user
 * @apiVersion 1.0.0
 * @apiName logout
 * @apiGroup Users
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X GET localhost:8000/User/logout
 *
 * @apiSuccess {Boolean}
 *
 * @apiSuccessExample {boolean} Success-Response:
 *     HTTP/1.1 200 OK
 *       true|false
 *
 * @apiUse TokenError
 */
export function logout(ctx) {
  ctx.logout()
  ctx.body = true
}

export async function getUser(ctx) {
  ctx.body = ctx.session.passport.user
}

/**
 * @api {put} /users/:id Update a user
 * @apiPermission
 * @apiVersion 1.0.0
 * @apiName UpdateUser
 * @apiGroup Users
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X PUT -d '{ "user": { "name": "Cool new Name" } }' localhost:8000/users/56bd1da600a526986cf65c80
 *
 * @apiParam {Object} user          User object (required)
 * @apiParam {String} user.name     Name.
 * @apiParam {String} user.username Username.
 *
 * @apiSuccess {Object}   users           User object
 * @apiSuccess {ObjectId} users._id       User id
 * @apiSuccess {String}   users.name      Updated name
 * @apiSuccess {String}   users.username  Updated username
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "user": {
 *          "_id": "56bd1da600a526986cf65c80"
 *          "name": "Cool new name"
 *          "username": "johndoe"
 *       }
 *     }
 *
 * @apiError UnprocessableEntity Missing required parameters
 *
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 422 Unprocessable Entity
 *     {
 *       "status": 422,
 *       "error": "Unprocessable Entity"
 *     }
 *
 * @apiUse TokenError
 */
export async function updateUser(ctx) {
  let user = await User.findById(ctx.request.body._id)
  Object.assign(user, ctx.request.body)
  await user.save()
  user.password = null
  ctx.body = user
}

/**
 * @api {delete} /users/:id Delete a user
 * @apiPermission
 * @apiVersion 1.0.0
 * @apiName DeleteUser
 * @apiGroup Users
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X DELETE localhost:8000/users/56bd1da600a526986cf65c80
 *
 * @apiSuccess {StatusCode} 200
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true
 *     }
 *
 * @apiUse TokenError
 */

export async function deleteUser(ctx) {
  const user = ctx.body.user

  await user.remove()

  ctx.body = {
    success: true
  }
}

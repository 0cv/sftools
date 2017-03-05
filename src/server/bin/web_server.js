import Koa from 'koa'
import views from 'koa-views'
import bodyParser from 'koa-bodyparser'
import convert from 'koa-convert'
import logger from 'koa-logger'
import mongoose from 'mongoose'
import session from 'koa-session2'
import IO from 'koa-socket'
import Cookies from 'cookies'

import passport from 'koa-passport'
import serveStatic from 'koa-static'
import { RedisStore } from '../src/utils'
import { config } from '../config'
import { errorMiddleware } from '../src/middleware'
import Promise from 'bluebird'
import conditional from 'koa-conditional-get'
import etag from 'koa-etag'

global.Promise = Promise
mongoose.Promise = global.Promise
mongoose.connect(config.database)

require('../config/passport')

const app = new Koa()
const socket = new IO( 'Socket' )

socket.attach( app )

socket.on( 'connection', async (ctx) => {

  const cookies = new Cookies( ctx.socket.handshake, null, {keys: app.keys } )
  if(!cookies.get('koa:sess', {signed: true})) {
    ctx.socket.disconnect()
  }
})

//Use Etag for Assets
app.use(conditional())
app.use(etag())

app.use(views('client/', {
  extension: 'html'
}))

const oneYear = 31557600000
app.use(serveStatic('client/', {
  maxage: oneYear
}))

app.use(convert(logger()))
app.use(bodyParser())

app.keys = [config.session]
app.use(session({
  store: new RedisStore(),
  signed: true
}))

app.use(errorMiddleware())
app.use(passport.initialize())
app.use(passport.session())

//FORCE HTTPS
app.use(async(ctx, next) => {
  if(process.env.NODE_ENV === 'production' && ctx.headers['x-forwarded-proto'] === 'http') {
    ctx.redirect('https://' + ctx.hostname + ctx.url)
    return
  }
  await next()
})

require('../src/modules')(app, socket)

app.use(async(ctx, next) => {
  await next()
  const status = ctx.status || 404
  if(status === 404) {
    console.log('sending the index.html')
    await ctx.render('index')
  }
})


app.listen(config.port, function() {
  console.log(`Server started on ${config.port}`)
})

export default app

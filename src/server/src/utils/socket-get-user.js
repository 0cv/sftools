import Cookies from 'cookies'
import { config } from '../../config'
import { RedisStore } from './store'

export async function getUserId(ctx) {
  const cookies = new Cookies( ctx.socket.socket.handshake, null, {keys: [config.session] } )
  const cookieId = cookies.get('koa:sess', {signed: true})
  const store = new RedisStore()
  const cookie = await store.get(cookieId)
  store.close()
  return cookie.passport.user._id
}

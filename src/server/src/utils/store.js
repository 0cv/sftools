import Redis from 'ioredis'
import {Store} from 'koa-session2'
import { config } from '../../config'

export class RedisStore extends Store {
  constructor() {
    super()
    this.redis = new Redis(config.redis)
  }

  async get(sid) {
    let session = await this.redis.get(`SESSION:${sid}`)
    session = session && JSON.parse(session)
    return session
  }

  async set(session, opts) {
    if (!opts.sid) {
      opts.sid = this.getID(24)
    }
    if(session.passport && session.passport.user) {
      await this.redis.set(`SESSION:${opts.sid}`, JSON.stringify(session))
    }
    return opts.sid
  }

  async destroy(sid) {
    console.log('destroying session')
    await this.redis.del(`SESSION:${sid}`)
  }

  close() {
    this.redis.end()
  }
}

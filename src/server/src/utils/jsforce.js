import _jsforce from 'jsforce'
import { config } from '../../config'

export function jsforce(connection) {
  const conn = new _jsforce.Connection({
    oauth2: {
      clientId: config.client_id,
      clientSecret: config.client_secret,
      redirectUri: config.redirect_uri,
      loginUrl: connection.instanceurl
    },
    instanceUrl: connection.instanceurl,
    accessToken: connection.accesstoken,
    refreshToken: connection.refreshtoken,
    version: config.apiVersion
  })
  conn.on('refresh', async function(accessToken) {
    console.log('access token refreshed', accessToken)
    connection.accesstoken = accessToken
    await connection.save()
  })
  conn._destroy = function() {
    conn.removeAllListeners('refresh')
  }
  console.log('event names: ', conn.eventNames())
  return conn
}

export let production = {
  session: process.env.session,
  token: process.env.token,
  database: process.env.database,
  redis: process.env.redis,
  redirect_uri: process.env.redirect_uri,
  client_id: process.env.client_id,
  client_secret: process.env.client_secret,
  sendgrid_apikey: process.env.sendgrid_apikey
}

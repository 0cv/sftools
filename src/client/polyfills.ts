import 'core-js/es7/reflect'
import 'zone.js/dist/zone'

// Typescript emit helpers polyfill
import 'ts-helpers'

if ('production' === process.env.ENV) {
  // Production

} else {
  // Development
  require('zone.js/dist/long-stack-trace-zone')
}

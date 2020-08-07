/**
 * `var` instead of `let` is important to not break UglifyJS (client side) which does not yet support
 * ES6
 */

export var common = {
  port: process.env.PORT || 4201,
  apiVersion: '49.0'
}

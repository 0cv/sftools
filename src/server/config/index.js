import { common } from './env/common'

const env = process.env.NODE_ENV || 'development'
import { development } from './env/development';
import { production } from './env/production';
import { test } from './env/test';

export const config = env === 'development' ? Object.assign({}, common, development) :
                      env === 'production' ? Object.assign({}, common, production) :
                      env === 'test' ? Object.assign({}, common, test) : {}

import './polyfills.ts'

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'
import { enableProdMode } from '@angular/core'
import { environment } from './environments/environment'
import { AppModule } from './app'
import { hmrBootstrap } from './hmr'

if (environment.production) {
  enableProdMode()
}

const bootstrap = () => {
  return platformBrowserDynamic().bootstrapModule(AppModule);
}

if (environment.hmr) {
  console.log('Building in HMR mode')
  if (module['hot']) {
    hmrBootstrap(module, bootstrap)
  } else {
    console.error('HMR is not enabled for webpack-dev-server!')
    console.info('Are you using the --hmr flag for ng serve?')
  }
} else {
  console.log('Building in normal mode')
  bootstrap()
}

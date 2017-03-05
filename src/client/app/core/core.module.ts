import { ModuleWithProviders, NgModule, Optional, SkipSelf } from '@angular/core'
import { Http, RequestOptions, XHRBackend } from '@angular/http'
import { httpFactory } from './http.factory'
import { CommonModule } from '@angular/common'
import { LoadingSpinnerService } from './loading-spinner.service'
import { StoreService } from './store.service'
import {
  Connection,
  Deployment,
  GitServer,
  PrivateKey,
  Project,
  ProjectDetail,
  Release,
  ReleaseDetail,
  Story,
  StoryDetail,
  User,
  Validation
  } from './lb-services'

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [ ],
  exports: [ ],
  providers: [
    Connection,
    Deployment,
    GitServer,
    PrivateKey,
    Project,
    ProjectDetail,
    Release,
    ReleaseDetail,
    Story,
    StoryDetail,
    User,
    Validation,

    LoadingSpinnerService,
    StoreService,
    {
      provide: Http,
      useFactory: httpFactory,
      deps: [XHRBackend, RequestOptions, LoadingSpinnerService]
    }
  ]
})

export class CoreModule {
  constructor (@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import it in the AppModule only')
    }
  }
}

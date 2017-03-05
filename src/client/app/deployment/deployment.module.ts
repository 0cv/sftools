import { NgModule } from '@angular/core'
import { DeploymentComponent } from './deployment.component'
import { routing } from './deployment.routing'
import { SharedModule } from 'shared'

@NgModule({
  imports: [
    routing,
    SharedModule
  ],
  declarations: [
    DeploymentComponent
  ]
})
export class DeploymentModule {}

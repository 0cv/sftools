import { ModuleWithProviders }  from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { DeploymentComponent } from './deployment.component'

const routes: Routes = [
  { path: 'deployment', component: DeploymentComponent }
]

export const routing: ModuleWithProviders = RouterModule.forRoot(routes)

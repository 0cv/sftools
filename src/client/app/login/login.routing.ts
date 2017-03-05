import { ModuleWithProviders }  from '@angular/core'
import { Routes, RouterModule } from '@angular/router'

import { LoginComponent } from './login.component'
import { NewUserComponent } from './new-user'
import { ResetPasswordComponent } from './reset-password'

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'new-user', component: NewUserComponent },
]

export const routing: ModuleWithProviders = RouterModule.forRoot(routes)

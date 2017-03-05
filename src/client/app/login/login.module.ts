import { NgModule } from '@angular/core'

import { LoginComponent } from './login.component'
import { NewUserComponent } from './new-user'
import { ResetPasswordComponent } from './reset-password'
import { routing } from './login.routing'
import { SharedModule } from 'shared'

@NgModule({
  imports: [
    routing,
    SharedModule
  ],
  declarations: [
    LoginComponent,
    NewUserComponent,
    ResetPasswordComponent
  ],
  providers: []
})
export class LoginModule {}

import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { routing } from './app.routing'
import { AppComponent } from './app.component'
import { ConnectionsModule } from './connections'
import { CoreModule } from './core'
import { DeploymentModule } from './deployment'
import { GitServersModule } from './git-servers'
import { LoginModule } from './login'
import { SettingsModule } from './settings'
import { PrivateKeysModule } from './private-keys'
import { ProjectManagementModule } from './project-management'
import { SharedModule } from 'shared'

declare var ENV: any
/*
* App Component
* our top level component that holds all of our components
*/

@NgModule({
  imports: [
    BrowserModule,
    CoreModule,
    SharedModule,
    ConnectionsModule,
    DeploymentModule,
    GitServersModule,
    LoginModule,
    SettingsModule,
    PrivateKeysModule,
    ProjectManagementModule,
    routing
  ],
  declarations: [
    AppComponent
  ],
  bootstrap: [ AppComponent ],
  providers: []
})
export class AppModule {}

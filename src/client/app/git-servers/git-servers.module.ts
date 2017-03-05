import { NgModule } from '@angular/core'

import { GitServersComponent } from './git-servers.component'
import { EditGitServerComponent } from './edit-git-server'
import { routing } from './git-servers.routing'
import { SharedModule } from 'shared'

@NgModule({
  imports: [
    routing,
    SharedModule
  ],
  declarations: [
    GitServersComponent,
    EditGitServerComponent
  ],
  providers: []
})
export class GitServersModule {}

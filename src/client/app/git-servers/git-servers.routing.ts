import { ModuleWithProviders }  from '@angular/core'
import { Routes, RouterModule } from '@angular/router'

import { GitServersComponent } from './git-servers.component'
import { EditGitServerComponent } from './edit-git-server'

const routes: Routes = [
  { path: 'git-servers', component: GitServersComponent },
  { path: 'git-server/:_id', component: EditGitServerComponent },
]

export const routing: ModuleWithProviders = RouterModule.forRoot(routes)

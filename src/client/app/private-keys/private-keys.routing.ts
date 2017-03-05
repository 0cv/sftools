import { ModuleWithProviders }  from '@angular/core'
import { Routes, RouterModule } from '@angular/router'

import { PrivateKeysComponent } from './private-keys.component'
import { EditPrivateKeyComponent } from './edit-private-key'

const routes: Routes = [
  { path: 'private-keys', component: PrivateKeysComponent },
  { path: 'private-key/:_id', component: EditPrivateKeyComponent }
]

export const routing: ModuleWithProviders = RouterModule.forRoot(routes)

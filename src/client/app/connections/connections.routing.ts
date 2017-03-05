import { ModuleWithProviders }  from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { ConnectionsComponent } from './connections.component'
import { EditConnectionComponent } from './edit-connection'

const routes: Routes = [
  { path: 'connections', component: ConnectionsComponent },
  { path: 'connection/:_id', component: EditConnectionComponent }
]

export const routing: ModuleWithProviders = RouterModule.forRoot(routes)

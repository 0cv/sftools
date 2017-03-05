import { NgModule } from '@angular/core'
import { ConnectionsComponent } from './connections.component'
import { EditConnectionComponent } from './edit-connection'
import { routing } from './connections.routing'
import { SharedModule } from 'shared'

@NgModule({
  imports: [
    routing,
    SharedModule
  ],
  declarations: [
    ConnectionsComponent,
    EditConnectionComponent
  ]
})
export class ConnectionsModule {}

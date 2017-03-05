import { NgModule } from '@angular/core'

import { PrivateKeysComponent } from './private-keys.component'
import { EditPrivateKeyComponent } from './edit-private-key'
import { routing } from './private-keys.routing'
import { SharedModule } from 'shared'

@NgModule({
  imports: [
    routing,
    SharedModule
  ],
  declarations: [
    PrivateKeysComponent,
    EditPrivateKeyComponent
  ]
})
export class PrivateKeysModule {}

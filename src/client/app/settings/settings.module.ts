import { NgModule } from '@angular/core'

import { EditSettingsComponent } from './edit-settings'
import { SettingsComponent } from './settings.component'
import { routing } from './settings.routing'
import { SharedModule } from 'shared'

@NgModule({
  imports: [
    routing,
    SharedModule
  ],
  declarations: [
    EditSettingsComponent,
    SettingsComponent
  ],
  providers: []
})
export class SettingsModule {}

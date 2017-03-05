import { ModuleWithProviders }  from '@angular/core'
import { Routes, RouterModule } from '@angular/router'

import { EditSettingsComponent } from './edit-settings'
import { SettingsComponent } from './settings.component'


const routes: Routes = [
  { path: 'settings/:edit', component: EditSettingsComponent },
  { path: 'settings', component: SettingsComponent }
]

export const routing: ModuleWithProviders = RouterModule.forRoot(routes)

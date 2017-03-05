import { ModuleWithProviders }  from '@angular/core'
import { Routes, RouterModule } from '@angular/router'

//anything not maching a registered URL will go to the login page
const routes: Routes = [
  { path: '**', redirectTo: '/login', pathMatch: 'full' }
]

export const routing: ModuleWithProviders = RouterModule.forRoot(routes)

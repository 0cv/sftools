import { ModuleWithProviders }  from '@angular/core'
import { Routes, RouterModule } from '@angular/router'

import { DetailProjectComponent, EditProjectComponent, ProjectsComponent } from './projects'
import { DetailReleaseComponent, EditReleaseComponent, ReleasesComponent } from './releases'
import { DetailStoryComponent, EditStoryComponent, StoriesComponent } from './stories'
import { EditValidationComponent, ValidationsComponent } from './validations'
import { ProjectManagementComponent } from './project-management.component'

const routes: Routes = [{
  path: 'project-management',
  component: ProjectManagementComponent,
  children: [
    {path: 'projects', component: ProjectsComponent },
    {path: 'project/:_id', component: EditProjectComponent },
    {path: 'project/detail/:_id', component: DetailProjectComponent },
    {path: 'releases', component: ReleasesComponent },
    {path: 'release/:_id', component: EditReleaseComponent },
    {path: 'release/detail/:_id', component: DetailReleaseComponent },
    {path: 'stories', component: StoriesComponent },
    {path: 'story/:_id', component: EditStoryComponent },
    {path: 'story/detail/:_id', component: DetailStoryComponent },
    {path: 'validations', component: ValidationsComponent },
    {path: 'validation/:_id', component: EditValidationComponent }
  ]
}]

export const routing: ModuleWithProviders = RouterModule.forRoot(routes)

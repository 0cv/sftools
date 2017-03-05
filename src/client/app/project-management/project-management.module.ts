import { NgModule } from '@angular/core'
import { ProjectManagementComponent } from './project-management.component'
import { routing } from './project-management.routing'
import { DetailProjectComponent, EditProjectComponent, ProjectsComponent } from './projects'
import { DetailReleaseComponent, EditReleaseComponent, ReleasesComponent } from './releases'
import { SharedModule } from 'shared'
import { DetailStoryComponent, EditStoryComponent, StoriesComponent } from './stories'
import { DialogGitDiffComponent, DialogStoriesComponent } from './utils'
import { EditValidationComponent, ValidationsComponent } from './validations'

@NgModule({
  imports: [
    routing,
    SharedModule
  ],
  declarations: [
    DetailProjectComponent,
    DetailReleaseComponent,
    DetailStoryComponent,
    DialogGitDiffComponent,
    DialogStoriesComponent,
    EditProjectComponent,
    EditReleaseComponent,
    EditStoryComponent,
    EditValidationComponent,
    ProjectsComponent,
    ReleasesComponent,
    StoriesComponent,
    ValidationsComponent,
    ProjectManagementComponent
  ],
  entryComponents: [
    DialogGitDiffComponent,
    DialogStoriesComponent
  ]
})
export class ProjectManagementModule {}

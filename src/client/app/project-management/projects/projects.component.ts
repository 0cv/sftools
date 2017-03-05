import { Component, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Project } from 'core/lb-services'
import { StoreService } from 'core/store.service'

@Component({
  selector: 'projects',
  styleUrls: [
    './projects.scss'
  ],
  templateUrl: './projects.html'
})

export class ProjectsComponent implements OnInit {
  connections = {}
  projects = []

  constructor(
    public router: Router,
    public project: Project,
    public store: StoreService
  ) {}

  ngOnInit() {
    this.getProjects()
    this.getConnections()
  }

  delete(project) {
    this.project.deleteById(project._id).subscribe((res) => {
      this.store.delete('project', project._id)
      this.getProjects()
    })
  }

  getConnections() {
    this.store.read('connection').subscribe((connections) => {
      for(let connection of connections) {
        this.connections[connection._id] = connection
      }
    })
  }

  getProjects() {
    this.store.read('project').subscribe((projects) => {
      console.log('projects', projects)
      this.projects = projects
    })
  }
}

import { Component, OnDestroy, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { FormControl, FormGroup } from '@angular/forms'
import { Project } from 'core/lb-services'
import { StoreService } from 'core/store.service'

@Component({
  selector: 'edit-project',
  styleUrls: [
    './edit-project.scss'
  ],
  templateUrl: './edit-project.html'
})

export class EditProjectComponent implements OnDestroy, OnInit {
  connections = []
  form: FormGroup = new FormGroup({
    _id: new FormControl(),
    name: new FormControl(),
    connection: new FormControl(),
    sharedWith: new FormControl()
  })
  sub: any
  type: string

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private project: Project,
    private store: StoreService
  ) {}

  ngOnDestroy() {
    this.sub.unsubscribe()
  }

  ngOnInit() {
    this.sub = this.route.params.subscribe(params => {
      const _id = params['_id']
      if (_id === 'new') {
        this.type = 'New'
      } else {
        this.type = 'Edit'
        this.store.read('project').subscribe((projects) => {
          const project = projects && projects.find((it) => it._id === _id)
          if(project) {
            this.form.patchValue(project)
          }
        })
      }

      //get connection now we have the type (edit / new)
      this.getConnections()
    })
  }

  getConnections() {
    this.store.read('connection').subscribe((connections) => {
      this.connections = connections

      //prefill
      if(this.type === 'New' && this.connections.length) {
        this.form.patchValue({
          connection: this.connections[0]._id
        })
      }
    })
  }

  save() {
    console.log('project', this.form.value)
    if (this.form.get('_id').value) {
      this.project.updateAttributes(this.form.get('_id').value, this.form.value).subscribe((res) => {
        this.store.update('project', this.form.value)
        this.router.navigate(['/project-management/projects'])
      })
    } else {
      this.project.create(this.form.value).subscribe((res) => {
        console.log('res...', res)
        this.store.create('project', res)
        this.router.navigate(['/project-management/projects'])
      })
    }
  }
}

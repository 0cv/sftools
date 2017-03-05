import { Component, OnDestroy, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { FormControl, FormGroup } from '@angular/forms'
import { Validation } from 'core/lb-services'
import { StoreService } from 'core/store.service'

@Component({
  selector: 'edit-validation',
  styleUrls: [
    './edit-validation.scss'
  ],
  templateUrl: './edit-validation.html'
})

export class EditValidationComponent implements OnInit {
  type: string
  connections = []
  stories = []
  releases = []

  testLevels = [
    'NoTestRun',
    'RunLocalTests',
    'RunAllTestsInOrg'
  ]
  frequencies = [
    'ASAP',
    '1h',
    '6h',
    '24h'
  ]

  form: FormGroup = new FormGroup({
    _id: new FormControl(),
    name: new FormControl(),
    type: new FormControl(),
    story: new FormControl(),
    release: new FormControl(),
    target: new FormControl(),
    testLevel: new FormControl(),
    frequency: new FormControl(),
    emails: new FormControl()
  })

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private validation: Validation,
    private store: StoreService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const _id = params['_id']
      if (_id === 'new') {
        this.type = 'New'
      } else {
        this.type = 'Edit'
        this.store.read('validation').subscribe((validations) => {
          const validation = validations && validations.find((it) => it._id === _id)
          if(validation) {
            this.form.patchValue(validation)
            if(validation.story) {
              this.form.controls['release'].disable()
            } else if(validation.release) {
              this.form.controls['story'].disable()
            }
          }
        })
      }

      //get connection now we have the type (edit / new)
      this.getConnections()
      this.getStories()
      this.getReleases()
    })
  }

  getConnections() {
    this.store.read('connection').subscribe((connections) => {
      this.connections = connections
    })
  }

  getReleases() {
    this.store.read('release').subscribe((releases) => {
      this.releases = releases
    })
  }

  getStories() {
    this.store.read('story').subscribe((stories) => {
      this.stories = stories
    })
  }

  save() {
    console.log('validation', this.form.value)
    if (this.form.get('_id').value) {
      this.validation.updateAttributes(this.form.get('_id').value, this.form.value).subscribe((res) => {
        this.store.update('validation', this.form.value)
        this.router.navigate(['/project-management/validations'])
      })
    } else {
      this.validation.create(this.form.value).subscribe((res) => {
        console.log('res...', res)
        this.store.create('validation', res)
        this.router.navigate(['/project-management/validations'])
      })
    }
  }
}

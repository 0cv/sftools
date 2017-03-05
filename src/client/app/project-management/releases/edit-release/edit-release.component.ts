import { Component, OnDestroy, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { FormControl, FormGroup } from '@angular/forms'
import { Release } from 'core/lb-services'
import { StoreService } from 'core/store.service'

@Component({
  selector: 'edit-release',
  styleUrls: [
    './edit-release.scss'
  ],
  templateUrl: './edit-release.html'
})

export class EditReleaseComponent implements OnDestroy, OnInit {
  sub: any
  type: string
  stories = []
  form: FormGroup = new FormGroup({
    _id: new FormControl(),
    name: new FormControl(),
    stories: new FormControl(),
    sharedWith: new FormControl()
  })

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private release: Release,
    private store: StoreService
  ) {}

  ngOnInit() {
    this.sub = this.route.params.subscribe(params => {
      const _id = params['_id']
      if (_id === 'new') {
        this.type = 'New'
      } else {
        this.type = 'Edit'
        this.store.read('release').subscribe((releases) => {
          const release = releases && releases.find((it) => it._id === _id)
          if(release) {
            this.form.patchValue(release)
          }
        })
      }

      //get story now we have the type (edit / new)
      this.getStories()
    })
  }

  ngOnDestroy() {
    this.sub.unsubscribe()
  }

  getStories() {
    this.store.read('story').subscribe((stories) => {
      this.stories = stories
    })
  }

  save() {
    console.log('release', this.form.value)
    if (this.form.get('_id').value) {
      this.release.updateAttributes(this.form.get('_id').value, this.form.value).subscribe((res) => {
        this.store.update('release', this.form.value)
        this.router.navigate(['/project-management/releases'])
      })
    } else {
      this.release.create(this.form.value).subscribe((res) => {
        console.log('res...', res)
        this.store.create('release', res)
        this.router.navigate(['/project-management/releases'])
      })
    }
  }
}

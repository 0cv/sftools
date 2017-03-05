import { Component, OnDestroy, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { FormControl, FormGroup } from '@angular/forms'
import { Story } from 'core/lb-services'
import { StoreService } from 'core/store.service'

@Component({
  selector: 'edit-story',
  styleUrls: [
    './edit-story.scss'
  ],
  templateUrl: './edit-story.html'
})

export class EditStoryComponent implements OnDestroy, OnInit {
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
    private story: Story,
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
        this.store.read('story').subscribe((stories) => {
          const story = stories && stories.find((it) => it._id === _id)
          if(story) {
            this.form.patchValue(story)
          }
        })
      }
    })
  }

  save() {
    console.log('story', this.form.value)
    if (this.form.get('_id').value) {
      this.story.updateAttributes(this.form.get('_id').value, this.form.value).subscribe((res) => {
        this.store.update('story', this.form.value)
        this.router.navigate(['/project-management/stories'])
      })
    } else {
      this.story.create(this.form.value).subscribe((res) => {
        console.log('res...', res)
        this.store.create('story', res)
        this.router.navigate(['/project-management/stories'])
      })
    }
  }
}

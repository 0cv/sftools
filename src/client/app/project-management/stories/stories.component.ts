import { Component, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Story } from 'core/lb-services'
import { StoreService } from 'core/store.service'

@Component({
  selector: 'stories',
  styleUrls: [
    './stories.scss'
  ],
  templateUrl: './stories.html'
})

export class StoriesComponent implements OnInit {
  stories = []

  constructor(
    private router: Router,
    public story: Story,
    public store: StoreService
  ) {}

  ngOnInit() {
    this.getStories()
  }

  getStories() {
    this.store.read('story').subscribe((stories) => {
      this.stories = stories
    })
  }

  delete(story) {
    this.story.deleteById(story._id).subscribe((res) => {
      this.store.delete('story', story._id)
      this.getStories()
    })
  }
}

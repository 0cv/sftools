import { Component, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Release } from 'core/lb-services'
import { StoreService } from 'core/store.service'

@Component({
  selector: 'releases',
  styleUrls: [
    './releases.scss'
  ],
  templateUrl: './releases.html'
})

export class ReleasesComponent implements OnInit {
  releases = []
  stories = {}

  constructor(
    public router: Router,
    public release: Release,
    public store: StoreService
  ) {}

  ngOnInit() {
    this.getReleases()
    this.getStories()
  }

  getReleases() {
    this.store.read('release').subscribe((releases) => {
      console.log('releases', releases)
      this.releases = releases
    })
  }

  getStories() {
    this.store.read('story').subscribe((stories) => {
      for(let story of stories) {
        this.stories[story._id] = story
      }
    })
  }

  delete(release) {
    this.release.deleteById(release._id).subscribe((res) => {
      this.store.delete('release', release._id)
      this.getReleases()
    })
  }
}

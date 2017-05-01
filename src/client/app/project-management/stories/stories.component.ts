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
  projects = {}
  gitServers = {}
  privateKeys = {}
  stories = []

  constructor(
    private router: Router,
    public story: Story,
    public store: StoreService
  ) { }

  ngOnInit() {
    this.getStories()
    this.loadProjects()
    this.loadGitServers()
    this.loadPrivateKeys()
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

  loadProjects() {
    this.store.read('project').subscribe(projects => {
      for (let project of projects) {
        this.projects[project._id] = project
      }
    })
  }

  loadGitServers() {
    this.store.read('gitserver').subscribe(gitServers => {
      for (let gitServer of gitServers) {
        this.gitServers[gitServer._id] = gitServer
      }
    })
  }

  loadPrivateKeys() {
    this.store.read('privatekey').subscribe(privateKeys => {
      for (let privateKey of privateKeys) {
        this.privateKeys[privateKey._id] = privateKey
      }
    })
  }
}

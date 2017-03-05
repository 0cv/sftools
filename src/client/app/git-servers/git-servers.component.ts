import { Component, OnInit } from '@angular/core'
import { GitServer } from 'core/lb-services'
import { StoreService } from 'core/store.service'

@Component({
  selector: 'git-servers',
  styleUrls: [
    './git-servers.scss'
  ],
  templateUrl: './git-servers.html'
})

export class GitServersComponent implements OnInit {
  gitServers = []

  constructor(
    private gitServer: GitServer,
    private store: StoreService
  ) {}

  ngOnInit() {
    this.getGitServers()
  }

  getGitServers() {
    this.store.read('gitserver').subscribe(gitServers => {
      this.gitServers = gitServers
    })
  }

  delete(gitServer) {
    this.gitServer.deleteById(gitServer._id).subscribe((res) => {
      this.store.delete('gitserver', gitServer._id)
      this.getGitServers()
    })
  }
}

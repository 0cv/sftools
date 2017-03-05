import { Component, OnDestroy, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { GitServer } from 'core/lb-services'
import { StoreService } from 'core/store.service'
import { FormGroup, FormControl } from '@angular/forms'

@Component({
  selector: 'edit-git-server',
  styleUrls: [
    './edit-git-server.scss'
  ],
  templateUrl: './edit-git-server.html'
})

export class EditGitServerComponent implements OnDestroy, OnInit {
  sub: any
  type: string

  form = new FormGroup({
    _id: new FormControl(),
    name: new FormControl(),
    gitserver: new FormControl('Bitbucket'),
    username: new FormControl(),
    password: new FormControl()
  })

  options = [
    'Bitbucket',
    'GitHub'
  ]

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gitServer: GitServer,
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
        this.store.read('gitserver').subscribe((gitServers) => {
          const gitServer = gitServers && gitServers.find((it) => it['_id'] === _id)
          if (gitServer) {
            this.form.patchValue(gitServer)
          }
        })
      }
    })
  }

  save() {
    if (this.form.value._id) {
      this.gitServer.updateAttributes(this.form.value._id, this.form.value).subscribe((res) => {
        this.store.update('gitserver', this.form.value)
        this.router.navigate(['/git-servers'])
      })
    } else {
      this.gitServer.create(this.form.value).subscribe((res) => {
        this.store.create('gitserver', res)
        this.router.navigate(['/git-servers'])
      })
    }
  }
}

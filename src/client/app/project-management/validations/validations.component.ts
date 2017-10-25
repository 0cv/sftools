import { Component, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Validation } from 'core/lb-services'
import { StoreService } from 'core/store.service'
import { MatDialog, MatDialogRef } from '@angular/material'
import { DialogGitDiffComponent } from '../utils'

@Component({
  selector: 'validations',
  styleUrls: [
    './validations.scss'
  ],
  templateUrl: './validations.html'
})

export class ValidationsComponent implements OnInit {
  dialogLogRef: MatDialogRef<DialogGitDiffComponent>
  validations = []
  connections = {}
  stories = {}
  releases = {}

  constructor(
    public dialog: MatDialog,
    public router: Router,
    public store: StoreService,
    public validation: Validation
  ) {}

  ngOnInit() {
    this.getValidations()
    this.getConnections()
    this.getStories()
    this.getReleases()
  }

  delete(validation) {
    this.validation.deleteById(validation._id).subscribe((res) => {
      this.store.delete('validation', validation._id)
      this.getValidations()
    })
  }

  getConnections() {
    this.store.read('connection').subscribe((connections) => {
      for(let connection of connections) {
        this.connections[connection._id] = connection
      }
    })
  }

  getReleases() {
    this.store.read('release').subscribe((releases) => {
      for(let release of releases) {
        this.releases[release._id] = release
      }
    })
  }

  getStories() {
    this.store.read('story').subscribe((stories) => {
      for(let story of stories) {
        this.stories[story._id] = story
      }
    })
  }

  getValidations() {
    this.store.read('validation').subscribe((validations) => {
      console.log('validations', validations)
      this.validations = validations
    })
  }

  openLog(validation) {
    this.dialogLogRef = this.dialog.open(DialogGitDiffComponent, {
      disableClose: false
    })
    this.dialogLogRef.componentInstance.buildModal(validation.name, null, validation.log)
  }
}

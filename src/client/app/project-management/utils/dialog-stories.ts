import { Component } from '@angular/core'
import { MdDialogRef } from '@angular/material'

@Component({
  selector: 'modal-stories',
  template: `
  <md-card-title>{{type}} Stories to selected Metadata</md-card-title>
  <md-card-content>
    <select multiple [(ngModel)]="selectedStories">
      <option *ngFor="let story of stories" [value]="story._id">{{story.name}}</option>
    </select>
  </md-card-content>
  <button md-button (click)="dialogRef.close('cancel')">Close</button>
  <button md-button (click)="dialogRef.close(selectedStories)">{{type}} these Stories</button>
`
})

export class DialogStoriesComponent {
  selectedStories = []
  stories = []
  type: string

  constructor(public dialogRef: MdDialogRef<DialogStoriesComponent>) {}
}

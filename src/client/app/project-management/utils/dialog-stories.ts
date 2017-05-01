import { Component } from '@angular/core'
import { MdDialogRef } from '@angular/material'

@Component({
  selector: 'modal-stories',
  styles: [`
    .mat-select {
      width: 100%;
    }
  `],
  template: `
  <md-card-content>
    <md-select placeholder="{{type}} Stories to selected Metadata" multiple [(ngModel)]="selectedStories">
      <md-option *ngFor="let story of stories" [value]="story._id">
        {{story.name}}
      </md-option>
    </md-select>
  </md-card-content>
  <button md-button (click)="dialogRef.close('cancel')">Close</button>
  <button md-button (click)="dialogRef.close(selectedStories)">{{type}} these Stories</button>
`
})

export class DialogStoriesComponent {
  selectedStories = []
  stories = []
  type: string

  constructor(public dialogRef: MdDialogRef<DialogStoriesComponent>) { }
}

import { Component } from '@angular/core'
import { MatDialogRef } from '@angular/material'

@Component({
  selector: 'modal-stories',
  styles: [`
    mat-input-container {
      width: 100%;
    }
  `],
  template: `
  <mat-card-content>
    <mat-input-container>
      <mat-select placeholder="{{type}} Stories to selected Metadata" multiple [(ngModel)]="selectedStories">
        <mat-option *ngFor="let story of stories" [value]="story._id">
          {{story.name}}
        </mat-option>
      </mat-select>
    </mat-input-container>
  </mat-card-content>
  <button mat-button (click)="dialogRef.close('cancel')">Close</button>
  <button mat-button (click)="dialogRef.close(selectedStories)">{{type}} these Stories</button>
`
})

export class DialogStoriesComponent {
  selectedStories = []
  stories = []
  type: string

  constructor(public dialogRef: MatDialogRef<DialogStoriesComponent>) { }
}

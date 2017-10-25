import { Component } from '@angular/core'
import { MatDialogRef } from '@angular/material'

@Component({
  selector: 'modal-git-diff',
  styles: [`
    :host /deep/ del {
      text-decoration: none;
      color: #b30000;
      background: #fadad7;
    }

    :host /deep/ ins {
      background: lightgreen;
      color: #406619;
      text-decoration: none;
    }

    :host /deep/ .modal-card-content {
      height: calc(100vh - 200px);
      overflow-y: auto;
    }
  `],
  template: `
  <mat-card-title>{{title}}</mat-card-title>
  <mat-card-content class="modal-card-content" [innerHTML]="body"></mat-card-content>
  <button mat-button (click)="dialogRef.close('close')">Close</button>
`
})

export class DialogGitDiffComponent {
  body
  title

  constructor(
    public dialogRef: MatDialogRef<DialogGitDiffComponent>
  ) {}

  buildModal(title, htmlDiff, rawHtml?) {
    this.title = title
    if(rawHtml) {
      this.body = rawHtml
    } else {
      const tmp:any = document.createElement('div')
      tmp.append(htmlDiff)
      this.body = tmp.innerHTML
    }
  }
}

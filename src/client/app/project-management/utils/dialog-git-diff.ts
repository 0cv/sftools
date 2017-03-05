import { Component } from '@angular/core'
import { MdDialogRef } from '@angular/material'

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
  <md-card-title>{{title}}</md-card-title>
  <md-card-content class="modal-card-content" [innerHTML]="body"></md-card-content>
  <button md-button (click)="dialogRef.close('close')">Close</button>
`
})

export class DialogGitDiffComponent {
  body
  title

  constructor(
    public dialogRef: MdDialogRef<DialogGitDiffComponent>
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

import { Component, OnDestroy, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { FormControl, FormGroup } from '@angular/forms'

import { PrivateKey } from 'core/lb-services'
import { StoreService } from 'core/store.service'

@Component({
  selector: 'private-key',
  styleUrls: [
    './edit-private-key.scss'
  ],
  templateUrl: './edit-private-key.html'
})

export class EditPrivateKeyComponent implements OnDestroy, OnInit {
  sub: any
  type: string
  form: FormGroup = new FormGroup({
    _id: new FormControl(),
    name: new FormControl(),
    value: new FormControl()
  })

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private privateKey: PrivateKey,
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
        this.store.read('privatekey').subscribe((privateKeys) => {
          const privateKey = privateKeys && privateKeys.find((it) => it['_id'] === _id)
          if (privateKey) {
            this.form.patchValue(privateKey)
          }
        })
      }
    })
  }

  save() {
    console.log('privatekey', this.form.value)
    if (this.form.get('_id').value) {
      this.privateKey.updateAttributes(this.form.get('_id').value, this.form.value).subscribe((res) => {
        this.store.update('privatekey', this.form.value)
        this.router.navigate(['/private-keys'])
      })
    } else {
      this.privateKey.create(this.form.value).subscribe((res) => {
        console.log('res...', res)
        this.store.create('privatekey', res)
        this.router.navigate(['/private-keys'])
      })
    }
  }
}

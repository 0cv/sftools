import { Component, OnInit } from '@angular/core'
import { PrivateKey } from 'core/lb-services'
import { StoreService } from 'core/store.service'

@Component({
  selector: 'private-keys',
  styleUrls: [
    './private-keys.scss'
  ],
  templateUrl: './private-keys.html'
})

export class PrivateKeysComponent implements OnInit {
  privateKeys = []

  constructor(
    private privateKey: PrivateKey,
    private store: StoreService
  ) {}

  ngOnInit() {
    this.getPrivateKeys()
  }

  delete(key) {
    this.privateKey.deleteById(key._id).subscribe((res) => {
      this.store.delete('privatekey', key._id)
      this.getPrivateKeys()
    })
  }

  getPrivateKeys() {
    this.store.read('privatekey').subscribe(privateKeys => {
      this.privateKeys = privateKeys
    })
  }
}

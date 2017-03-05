import { Component, OnInit } from '@angular/core'
import { Connection, User } from 'core/lb-services'
import { StoreService } from 'core/store.service'

@Component({
  selector: 'connections',
  styleUrls: [
    './connections.scss'
  ],
  templateUrl: './connections.html'
})

export class ConnectionsComponent implements OnInit {
  connections = []

  constructor(
    private user: User,
    private connection: Connection,
    private store: StoreService
  ) {}

  ngOnInit() {
    this.getConnections()
  }

  delete(connection) {
    this.connection.deleteById(connection._id).subscribe((res) => {
      this.store.delete('connection', connection._id)
      this.getConnections()
    })
  }

  getConnections() {
    this.store.read('connection').subscribe(connections => {
      this.connections = connections
    })
  }
}

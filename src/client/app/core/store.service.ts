import { Injectable } from '@angular/core'
import { Connection, GitServer, Project, PrivateKey, Release, Story, User, Validation } from 'core/lb-services'
import { Observable } from 'rxjs/Observable'


@Injectable()
export class StoreService {
  private store: {} = {}

  constructor(
    private connection: Connection,
    private gitserver: GitServer,
    private privatekey: PrivateKey,
    private project: Project,
    private release: Release,
    private story: Story,
    private user: User,
    private validation: Validation
  ) {}

  create(type, el) {
    if(!Array.isArray(el)) el = [el]
    this.store[type] = this.store[type] || []
    this.store[type].push(...el)
  }
  read(type?): Observable<any[]> {
    return new Observable<any[]>((observer) => {
      if(type) {
        const res = this.store[type]
        if(res && res.length) {
          observer.next(res)
        } else {
          this[type].find({}).subscribe((records) => {
            if(!Array.isArray(records)) {
              records = [records]
            }
            this.clean(type)
            this.create(type, records)
            observer.next(records)
          })
        }
      } else {
        observer.next(this.store)
      }
    })
  }
  update(type, el) {
    this.store[type] = this.store[type] || []
    const index = this.store[type].findIndex((it) => it && it._id===el._id)
    if(index>=0) {
      this.store[type].splice(index, 1, el)
    }
  }
  delete(type, _id) {
    this.store[type] = this.store[type] || []
    const index = this.store[type].findIndex((it) => it && it._id===_id)
    if(index>=0) {
      this.store[type].splice(index, 1)
    }
  }
  clean(type?) {
    if(type) {
      this.store[type] = []
    } else {
      this.store = {}
    }
  }
}

import { Component, OnDestroy, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { MetadataDownload } from '../../utils'
import { ReleaseDetail } from 'core/lb-services'
import * as io from 'socket.io-client'

@Component({
  selector: 'detail-release',
  styleUrls: [
    './detail-release.scss'
  ],
  templateUrl: './detail-release.html'
})

export class DetailReleaseComponent implements OnDestroy, OnInit {

  metadatas = []
  describeMetadata
  isLoading = false
  oldestFirst = false
  release
  socket: any = io('/Socket')
  sub
  subMetadatas
  syncingStatus = ''

  constructor(
    private route: ActivatedRoute,
    private releaseDetail: ReleaseDetail
  ) {}

  ngOnDestroy() {
    this.sub.unsubscribe()
    this.socket.close()
  }

  ngOnInit() {
    this.sub = this.route.params.subscribe(params => {
      const releaseId = params['_id']

      this.releaseDetail.getDetails(releaseId).subscribe((details) => {
        this.release = details.release
        this.describeMetadata = details.describeMetadata;
        this.subMetadatas = details.subMetadatas

        console.log('this.describeMetadata', this.describeMetadata)
        console.log('this.release', this.release)
        console.log('this.subMetadatas', this.subMetadatas)
      })
    })

    this.socket.on('metadatas', (_metadatas) => {
      if(_metadatas.over) {
        console.log('metadatas', this.metadatas.length)
        this.syncingStatus += '<br/>Metadatas fetched, preparing zip ...'
        this.isLoading = false
        if (this.metadatas.length) {
          MetadataDownload(this.describeMetadata, this.metadatas, this.subMetadatas)
        }
        this.metadatas = []
      } else {
        this.metadatas = this.metadatas.concat(_metadatas)
      }
    })
  }

  downloadMetadatas() {
    if(this.isLoading) {
      return
    }
    this.metadatas = []
    let storyIds = this.release.stories;
    this.isLoading = true;
    console.log('oldestFirst', this.oldestFirst)

    this.syncingStatus = 'Fetching metadata...'
    this.socket.emit('release.getStoryMetadata', {
      storyIds: storyIds,
      oldestFirst: this.oldestFirst
    })
  }

}

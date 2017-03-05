import { Component, ElementRef, OnDestroy, OnInit, Renderer, ViewChild } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { Project, StoryDetail } from 'core/lb-services'
import { FancytreeComponent } from 'shared/fancytree'
import * as io from 'socket.io-client'
import { MdDialog, MdDialogRef } from '@angular/material'
import { DialogGitDiffComponent, GitDiff, MetadataDownload, MetadataSorting, PrettifyStatus } from '../../utils'

@Component({
  selector: 'detail-story',
  styleUrls: [
    './detail-story.scss'
  ],
  templateUrl: './detail-story.html'
})

export class DetailStoryComponent implements OnDestroy, OnInit {
  @ViewChild('fancytree') fancytree: FancytreeComponent

  allMetadatas = []
  describeMetadata
  dialogGitDifRef: MdDialogRef<DialogGitDiffComponent>
  initSynced = []
  initialLoadBufferValue = 0
  isFailed = false
  isLoading = false
  listenFunc: Function
  mapMetadatas: any = new Map()
  mapStoryMetadatas = new Map()
  showOutdated = false
  showTree = false
  socket: any = io('/Socket')
  story: any
  storyId: string
  sub: any
  subMetadatas
  syncingStatus = ''

  constructor(
    private route: ActivatedRoute,
    private storyDetail: StoryDetail,
    public dialog: MdDialog,
    private renderer: Renderer,
    public elementRef: ElementRef,
  ) {}

  ngOnDestroy() {
    this.listenFunc && this.listenFunc()
    this.sub.unsubscribe()
    this.socket.close()
  }

  ngOnInit() {
    this.sub = this.route.params.subscribe(params => {
      this.storyId = params['_id']

      this.socket.emit('story.getMetadatas', {
        storyId: this.storyId
      })

      this.storyDetail.getStory(this.storyId).subscribe((details) => {
        this.story = details.story
        this.describeMetadata = details.describeMetadata
        this.subMetadatas = details.subMetadatas
        console.log('story', details.story)
        console.log('describeMetadata', details.describeMetadata)
        console.log('subMetadatas', details.subMetadatas)
      })
    })

    this.socket.on('metadatas', (_metadatas) => {
      if(_metadatas.over) {
        console.log('metadatas', this.allMetadatas.length)
        this.initialLoadBufferValue += 50
        this.drawTree(this.allMetadatas)
        this.syncingStatus += 'Latest metadata loaded<br/>'

        this.listenFunc = this.renderer.listen(this.elementRef.nativeElement, 'click', this.handleTagClick(this))
      } else {
        this.allMetadatas = this.allMetadatas.concat(_metadatas)
      }
    })

    this.socket.on('storyMetadatas', (storyMetadatas) => {
      if(storyMetadatas.over) {
        this.initialLoadBufferValue += 50
        this.syncingStatus += 'Story metadata loaded<br/>'
        this.fancytree.rerender()
        console.log('storyMetadatas', this.mapStoryMetadatas)
      } else {
        for (var sm of storyMetadatas) {
          this.mapStoryMetadatas.set(sm.metadata, sm)
        }
      }
    })

    this.socket.on('addRemoveMetadataSave', (result) => {
      console.log('addRemoveMetadataSave', result)
      this.isLoading = false
      if (!result.ok) {
        this.isFailed = true
      }
      this.syncingStatus = PrettifyStatus(result)
      this.fancytree.rerender()
    })
  }

  deleteMetadata() {
    if(this.isLoading || this.initialLoadBufferValue < 100) {
      return
    }
    const selectedNodes = this.fancytree.get()
    if (!selectedNodes.length) {
      return window.alert('Please select some metadata')
    }
    if (confirm('Are you sure to delete the current selected metadata?')) {
      let selectedNodeIds = []
      selectedNodes.filter(node => this.mapMetadatas.has(node.key)).map((node) => {
        selectedNodeIds.push(this.mapStoryMetadatas.get(node.key)._id)
        this.mapMetadatas.delete(node.key)
        this.mapStoryMetadatas.delete(node.key)
      })

      this.isLoading = true
      this.syncingStatus = 'Sending data to the server.'
      this.socket.emit('story.storyMetadataRemove', {
        ids: selectedNodeIds
      })

      if (selectedNodes.length > 500) {
        //just faster to refresh the whole tree ..
        let metadatas = [...this.mapMetadatas.values()] //once the init is done, metadatas are actually stored in the mapMetadatas

        metadatas = MetadataSorting(metadatas, true, this.describeMetadata, false, null)

        this.fancytree.add(metadatas)
        if (metadatas.length) {
          this.fancytree.sortChildren()
        }
      } else {
        for (let node of selectedNodes) {
          //console.log("node", node)
          while (node.hasChildren()) {
            node.getFirstChild().moveTo(node.parent, 'child')
          }
          node.remove()
        }
      }
    }
  }

  downloadMetadata() {
    if(this.isLoading || this.initialLoadBufferValue < 100) {
      return
    }
    let storyMetadatas = []
    let selectedNodes = this.fancytree.get()
    if (selectedNodes.length) {
      storyMetadatas = selectedNodes
        .filter(node => this.mapStoryMetadatas.has(node.key))
        .map((node) => this.mapStoryMetadatas.get(node.key))
    } else {
      //important for sorting.
      this.mapMetadatas.forEach((metadata) => {
        storyMetadatas.push(this.mapStoryMetadatas.get(metadata._id))
      })
    }
    console.log('storyMetadatas.length', storyMetadatas.length, this.mapStoryMetadatas.size)
    if (storyMetadatas.length) {
      this.isLoading = true
      this.syncingStatus = 'Please wait...'
      MetadataDownload(this.describeMetadata, storyMetadatas, this.subMetadatas)
      this.syncingStatus = ''
      this.isLoading = false
    }
  }

  drawTree(metadatas) {
    // draw the tree...
    metadatas = metadatas.sort((a, b) => {
      if (a.fullPath < b.fullPath) return -1
      return 1
    })
    for (var i = 0; i < metadatas.length; i++) {
      this.mapMetadatas.set(metadatas[i]._id, metadatas[i])
    }

    metadatas = MetadataSorting(metadatas, true, this.describeMetadata, false, null)

    this.showTree = true
    this.fancytree.add(metadatas)
    if (metadatas.length) {
      this.fancytree.sortChildren()
    }
  }

  handleTagClick(_this) {
    return (event) => {
      const metadataId = event.target.dataset.metadataId
      console.log('handleTagClick', metadataId)
      if (metadataId) {
        // the user has clicked the span item to show the diff
        _this.showDiff(metadataId)
      }
    }
  }

  isMetadataOutdated(storyMetadata, metadata) {
    let hasChanged = false
    if (storyMetadata.isDeleted !== (metadata.status === 'Deleted') ||
      storyMetadata.newValue !== metadata.newValue ||
      storyMetadata.newValueBin !== metadata.newValueBin) {
      hasChanged = true
    }
    return hasChanged
  }

  renderTreeColumn(args) {
    const metadataId = args.data.node.key
    if (this.mapStoryMetadatas.has(metadataId)) {
      const ele = args.data.node.tr.getElementsByTagName('td')[1]

      const hasChanged = this.isMetadataOutdated(this.mapStoryMetadatas.get(metadataId), this.mapMetadatas.get(metadataId))

      ele.innerHTML = this.setIcons(hasChanged, metadataId)
    }
  }

  setIcons(hasChanged, metadataId) {
    if (hasChanged) {
      return `<i class="fa fa-exclamation-circle" style="color:orange;cursor:pointer" data-metadata-id="${metadataId}"></i>`
    } else {
      return '<i class="fa fa-check-circle" style="color:green"></i>'
    }
  }

  showDiff(metadataId) {
    console.log('showDiff', metadataId, this.mapMetadatas.get(metadataId).newValue || this.mapMetadatas.get(metadataId).newValueBin)
    const fileNameDiff = this.mapMetadatas.get(metadataId).name

    const htmlDiff = GitDiff(
      this.mapStoryMetadatas.get(metadataId).newValue || this.mapStoryMetadatas.get(metadataId).newValueBin,
      this.mapMetadatas.get(metadataId).newValue || this.mapMetadatas.get(metadataId).newValueBin,
      this.mapStoryMetadatas.get(metadataId).isDeleted,
      this.mapMetadatas.get(metadataId).status
    )

    console.log('fileNameDiff', fileNameDiff)
    console.log('htmlDiff', htmlDiff)

    this.dialogGitDifRef = this.dialog.open(DialogGitDiffComponent, {
      disableClose: false
    })
    this.dialogGitDifRef.componentInstance.buildModal(fileNameDiff, htmlDiff)
  }

  toggleShowOutdated() {
    if(!this.showOutdated) {
      this.drawTree(this.allMetadatas)
      return
    }
    let metadatas = this.allMetadatas.filter((meta) => {
      return this.isMetadataOutdated(this.mapStoryMetadatas.get(meta._id), meta)
    })
    this.drawTree(metadatas)
  }

  updateMetadata() {
    if(this.isLoading || this.initialLoadBufferValue < 100) {
      return
    }
    let selectedNodes = this.fancytree.get()
    if (!selectedNodes.length) {
      return window.alert('Please select some metadata')
    }
    if (confirm('Are you sure to update the current selected metadata?')) {
      let updatedStoryMetadatas = []
      selectedNodes.filter(node => this.mapMetadatas.has(node.key)).map((node) => {
        let storyMetadata = this.mapStoryMetadatas.get(node.key),
          metadata = this.mapMetadatas.get(node.key)

        if (storyMetadata.newValue !== metadata.newValue ||
            storyMetadata.newValueBin !== metadata.newValueBin ||
            storyMetadata.isDeleted !== (metadata.status === 'Deleted')) {
          storyMetadata.newValue = metadata.newValue
          storyMetadata.newValueBin = metadata.newValueBin
          storyMetadata.isDeleted = metadata.status === 'Deleted'
          updatedStoryMetadatas.push(storyMetadata)
        }
      })
      if (updatedStoryMetadatas.length) {
        this.isLoading = true
        this.syncingStatus = 'Sending data to the server...'

        this.socket.emit('project.storyMetadata', {
          newMetadataStories: updatedStoryMetadatas,
          oldMetadataStories: []
        })
      } else {
        return window.alert('Nothing to update')
      }
    }
  }
}

import { Component, ElementRef, OnDestroy, OnInit, Renderer, ViewChild } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { ProjectDetail } from 'core/lb-services'
import { FancytreeComponent } from 'shared/fancytree'
import * as io from 'socket.io-client'
import { DialogGitDiffComponent, DialogStoriesComponent, GitDiff, MetadataSorting, PrettifyStatus } from '../../utils'
import { MdDialog, MdDialogRef } from '@angular/material'

@Component({
  selector: 'detail-project',
  styleUrls: [
    './detail-project.scss'
  ],
  templateUrl: './detail-project.html'
})

export class DetailProjectComponent implements OnDestroy, OnInit {
  @ViewChild('fancytree') fancytree: FancytreeComponent

  bufferValue = 0
  describeMetadata = {}
  dialogStoriesRef: MdDialogRef<DialogStoriesComponent>
  dialogGitDifRef: MdDialogRef<DialogGitDiffComponent>
  initialLoadBufferValue = 0
  isFetchedIgnoredDone = false
  isLoading = false
  listenFunc: Function
  mapMetadatas = new Map()
  mapMetadatasPayload = new Map()
  mapStory = new Map()
  mapStoryMetadatas = new Map()
  newMetadataStories = []
  oldMetadataStories = []
  project: any = {}
  projectId: string
  showIgnored = false
  showUnassigned = false
  socket: any = io('/Socket')
  stories = []
  sub: any
  syncingStatus = ''
  tagEndHTML = '</ul></div>'
  tagStartHTML = '<div class="select-container"><ul>'

  constructor(
    private route: ActivatedRoute,
    private projectDetail: ProjectDetail,
    public dialog: MdDialog,
    private renderer: Renderer,
    public elementRef: ElementRef
  ) { }

  ngOnDestroy() {
    this.sub.unsubscribe()
    this.socket.close()
    this.listenFunc()
  }

  ngOnInit() {
    let metadatas = []
    const metadatasPayload = []
    this.socket.on('status', (status) => {
      console.log('status', status)
      this.bufferValue = status.bufferValue
      this.syncingStatus = status.syncingStatus
      this.isLoading = status.isLoading
    })

    this.socket.on('addRemoveMetadataSave', (storyMetadatas) => {
      console.log('storyMetadatas saved', storyMetadatas)
      this.syncingStatus = PrettifyStatus(storyMetadatas)
      this.updatingIds(storyMetadatas)
      this.isLoading = false
    })

    this.socket.on('metadatas', (_metadatas) => {
      if (_metadatas.over) {
        console.log('metadatas', metadatas.length)
        this.initialLoadBufferValue += 33.33
        this.drawTree(metadatas)
        metadatas = []
        this.syncingStatus += 'Metadata loaded<br/>'

        this.listenFunc = this.renderer.listen(this.elementRef.nativeElement, 'click', this.handleTagClick(this))
      } else {
        metadatas.push(..._metadatas)
      }
    })

    this.socket.on('storyMetadatas', (storyMetadatas) => {
      if (storyMetadatas.over) {
        this.initialLoadBufferValue += 33.33
        this.syncingStatus += 'Story metadatas loaded<br/>'
        this.fancytree.rerender()
        //console.log('storyMetadatas', this.mapStoryMetadatas)
      } else {
        for (let storyMetadata of storyMetadatas) {
          if (!this.mapStoryMetadatas.has(storyMetadata.metadata)) {
            this.mapStoryMetadatas.set(storyMetadata.metadata, [])
          }
          this.mapStoryMetadatas.get(storyMetadata.metadata).push(storyMetadata)
        }
      }
    })

    this.socket.on('metadatasPayload', (metadatasPayload) => {
      if (metadatasPayload.over) {
        this.initialLoadBufferValue += 33.33
        this.syncingStatus += 'Metadatas payload loaded<br/>'
        this.fancytree.rerender()
        console.log('metadatasPayload ended')
      } else {
        for (let metadata of metadatasPayload) {
          this.mapMetadatasPayload.set(metadata._id, metadata)
        }
      }
    })

    this.sub = this.route.params.subscribe(params => {
      this.projectId = params['_id']
      this.socket.emit('project.getMetadatas', {
        projectId: this.projectId,
        showIgnored: this.showIgnored
      })

      this.projectDetail.getDetails(this.projectId).subscribe((details) => {
        this.describeMetadata = details.describeMetadata
        this.project = details.project
        this.stories = details.stories
        for (let story of this.stories) {
          this.mapStory.set(story._id, story)
        }
        console.log('this.describeMetadata', this.describeMetadata)
        console.log('this.project', this.project)
        console.log('this.stories', this.stories)
      })
    })
  }

  addStories() {
    if (this.isLoading || this.initialLoadBufferValue < 99) {
      return
    }
    this.dialogStoriesRef = this.dialog.open(DialogStoriesComponent, {
      disableClose: false,
      width: '500px'
    })
    this.dialogStoriesRef.componentInstance.type = 'Add'
    this.dialogStoriesRef.componentInstance.stories = this.stories

    this.dialogStoriesRef.afterClosed().subscribe(selectedStories => {
      this.dialogStoriesRef = null
      this.addRemoveMetadataSave(selectedStories, false)
      console.log('selectedStories: ' + selectedStories)
    })
  }

  addRemoveMetadataSave(selectedStories, isRemove) {
    const selectedNodes = this.fancytree.get()
    if (!selectedStories.length) {
      alert('Please select some stories')
      return
    }
    this.isLoading = true
    this.syncingStatus = 'Client side processing...'
    for (let node of selectedNodes) {
      if (this.mapMetadatas.has(node.key)) { // has a real id
        let metadataIsDeleted = this.mapMetadatas.get(node.key).status === 'Deleted',
          _storyMetadatas = [],
          storyMetadataIndex,
          storyMetadata

        if (!isRemove) {
          //we are adding a story to a metadata and the node is a real node (i.e. has an _id)

          if (this.mapStoryMetadatas.has(node.key)) {
            _storyMetadatas = this.mapStoryMetadatas.get(node.key)
          }
          for (let storyId of selectedStories) {
            storyMetadataIndex = _storyMetadatas.findIndex(_storyMetadata => _storyMetadata.story === storyId)
            if (storyMetadataIndex > -1) { //for existing storymetadata in the db
              storyMetadata = _storyMetadatas[storyMetadataIndex]
              if (storyMetadata.newValue !== this.mapMetadatasPayload.get(node.key).newValue ||
                storyMetadata.isDeleted !== metadataIsDeleted) {
                storyMetadata.newValue = this.mapMetadatasPayload.get(node.key).newValue
                storyMetadata.newValueBin = this.mapMetadatasPayload.get(node.key).newValueBin
                storyMetadata.isDeleted = metadataIsDeleted
                this.newMetadataStories.push(storyMetadata)
                _storyMetadatas[storyMetadataIndex] = storyMetadata
              }
            } else { // new story metadata
              storyMetadata = {
                story: storyId,
                metadata: node.key,
                newValue: this.mapMetadatasPayload.get(node.key).newValue,
                newValueBin: this.mapMetadatasPayload.get(node.key).newValueBin,
                project: this.projectId,
                isDeleted: metadataIsDeleted,
                fullPath: this.mapMetadatas.get(node.key).fullPath
              }
              this.newMetadataStories.push(storyMetadata)
              _storyMetadatas.push(storyMetadata)
            }
          }
        } else if (isRemove && this.mapStoryMetadatas.has(node.key)) {
          //we remove the metadata. The node is a real _id.
          _storyMetadatas = this.mapStoryMetadatas.get(node.key)
          for (let storyId of selectedStories) {
            storyMetadataIndex = _storyMetadatas.findIndex(_storyMetadata => _storyMetadata.story === storyId)
            if (storyMetadataIndex > -1) {
              storyMetadata = _storyMetadatas.splice(storyMetadataIndex, 1)[0]
              if (storyMetadata) {
                this.oldMetadataStories.push(storyMetadata._id)
              }
              if (!this.mapStoryMetadatas.get(node.key).length) {
                this.mapStoryMetadatas.delete(node.key)
                node.tr.getElementsByTagName('td')[1].innerHTML = ''
              }
            }
          }
        }

        if (this.mapStoryMetadatas.has(node.key) || _storyMetadatas.length) {
          //we update mapStoryMetadatas accordingly
          this.mapStoryMetadatas.set(node.key, _storyMetadatas)
          if (node.tr) {
            let ele = node.tr.getElementsByTagName('td')[1]
            let html = this.tagStartHTML
            for (storyMetadata of _storyMetadatas) {
              html += this.storyElement(
                this.mapStory.get(storyMetadata.story).name,
                storyMetadata.metadata,
                storyMetadata.story,
                this.mapMetadatasPayload.get(node.key).newValue !== storyMetadata.newValue || (this.mapMetadatas.get(node.key).status === 'Deleted') !== storyMetadata.isDeleted,
                false
              )
            }
            ele.innerHTML = html + this.tagEndHTML
          }
        }
      }
    }

    if (this.oldMetadataStories.length || this.newMetadataStories.length) {
      this.syncingStatus += '<br/>Sending data to the server...'

      this.socket.emit('project.storyMetadata', {
        oldMetadataStories: this.oldMetadataStories,
        newMetadataStories: this.newMetadataStories
      })
    } else {
      this.isLoading = false
      this.syncingStatus = 'Already everything up to date!'
    }
  }

  //draw fancytree
  drawTree(metadatas?) {
    if (metadatas) {
      if (this.mapMetadatas.size) {
        //init fetched is done, but ignored metadata are being processed
        this.mapMetadatas.forEach((metadata) => {
          metadatas.push(metadata)
        })
      }

      for (let metadata of metadatas) {
        if (!this.mapMetadatas.has(metadata._id)) {
          this.mapMetadatas.set(metadata._id, metadata)
        }
      }
    } else {
      metadatas = []
      //once the init is done, metadatas are actually stored in the mapMetadatas and metadatas itself is undefined
      this.mapMetadatas.forEach((metadata) => {
        metadatas.push(metadata)
      })
    }

    //sorting per to get a rough sorting how the metadata have to be processed
    metadatas = metadatas.sort((a, b) => {
      if (!a || !b || !a.fullPath || !b.fullPath) {
        console.log('Error fullPath?', a, b)
      }
      if (a.fullPath.toLowerCase() < b.fullPath.toLowerCase()) return -1
      return 1
    })

    metadatas = MetadataSorting(
      metadatas,
      this.showIgnored,
      this.describeMetadata,
      this.showUnassigned,
      this.mapStoryMetadatas
    )

    this.fancytree.add(metadatas)
    if (metadatas.length) {
      this.fancytree.sortChildren()
    }
  }

  handleTagClick(_this) {
    return (event) => {
      const metadataId = event.target.dataset.metadataId
      const storyId = event.target.dataset.storyId
      const type = event.target.dataset.type
      console.log('handleTagClick', metadataId, storyId, type)

      if (type === 'remove-story') {
        _this.removeStory(metadataId, storyId)
        //the user has clicked the "x" to remove a Story Metadata

      } else if (type === 'show-diff') {
        //the user has clicked the span item to show the diff
        _this.showDiff(metadataId, storyId)
      }
    }
  }

  ignoreMetadatas() {
    if (this.isLoading || this.initialLoadBufferValue < 99) {
      return
    }
    const selectedNodes = this.fancytree.get()
    if (!selectedNodes.length) {
      return alert('Please select some metadata')
    }

    this.bufferValue = 0
    this.isLoading = true
    //set the status of metadata to "ignore"
    const selectedNodeIds = selectedNodes
      .filter(node => this.mapMetadatas.has(node.key) && !this.mapMetadatas.get(node.key).isIgnored)
      .map((node) => {
        this.mapMetadatas.get(node.key).isIgnored = true
        return node.key
      })

    if (selectedNodeIds.length) {
      this.syncingStatus = 'Sending data to the server...'
      this.socket.emit('project.ignoreMetadatas', {
        selectedNodeIds
      })
      this.drawTree()
    } else {
      this.syncingStatus = 'Selected metadata are already all ignored.'
    }
  }

  onShowIgnoredChange() {
    if (!this.isFetchedIgnoredDone) {
      this.isFetchedIgnoredDone = true
      this.initialLoadBufferValue = 0
      this.syncingStatus = ''
      this.socket.emit('project.getMetadatas', {
        projectId: this.projectId,
        showIgnored: this.showIgnored
      })
    } else if (this.mapMetadatas.size) {
      this.drawTree()
    }
  }

  onShowUnassignedChange() {
    console.log('onShowUnassignedChange', this.showUnassigned)
    this.drawTree()
  }

  removeStories() {
    if (this.isLoading || this.initialLoadBufferValue < 99) {
      return
    }
    console.log('remove stories')
    this.dialogStoriesRef = this.dialog.open(DialogStoriesComponent, {
      disableClose: false
    })
    this.dialogStoriesRef.componentInstance.type = 'Remove'
    this.dialogStoriesRef.componentInstance.stories = this.stories

    this.dialogStoriesRef.afterClosed().subscribe(selectedStories => {
      this.dialogStoriesRef = null
      this.addRemoveMetadataSave(selectedStories, true)
      console.log('selectedStories: ' + selectedStories)
    })
  }

  removeStory(metadataId, storyId) {
    if (this.isLoading || this.initialLoadBufferValue < 99) {
      return
    }
    console.log('remove story')

    let storyMetadataToDelete;
    let storyMetadatas = this.mapStoryMetadatas.get(metadataId);
    for (let i = 0; i < storyMetadatas.length; i++) {
      if (storyMetadatas[i].story === storyId) {
        storyMetadataToDelete = storyMetadatas.splice(i, 1)[0]
        break
      }
    }
    this.mapStoryMetadatas.set(metadataId, storyMetadatas)
    this.fancytree.applyPatch(metadataId)

    //we delete for cleaning, but it's necessary to set it empty for the tree to refresh the node correctly.
    if (!storyMetadatas.length) {
      this.mapStoryMetadatas.delete(metadataId);
    }

    console.log('element removed, now, remaining:', this.mapStoryMetadatas.get(metadataId))

    this.socket.emit('project.storyMetadata', {
      oldMetadataStories: [storyMetadataToDelete._id],
      newMetadataStories: []
    })
  }

  showDiff(metadataId, storyId) {
    console.log('show diff', metadataId, storyId)

    let storyMetadatas = this.mapStoryMetadatas.get(metadataId)
    let storyMetadata = storyMetadatas.find(sm => sm.story === storyId)

    console.log('storyMetadata.newValue', storyMetadata.newValue)
    console.log('mapMetadatasPayload.get(metadataId).newValue', this.mapMetadatasPayload.get(metadataId).newValue)
    console.log('mapMetadatas.get(metadataId)', this.mapMetadatas.get(metadataId))
    let fullPath = this.mapMetadatas.get(metadataId).fullPath
    const fileNameDiff = fullPath.split('|')[0].substr(fullPath.lastIndexOf('/') + 1) + ' - ' + this.mapStory.get(storyId).name

    const htmlDiff = GitDiff(
      storyMetadata.newValue,
      this.mapMetadatasPayload.get(metadataId).newValue,
      storyMetadata.isDeleted,
      this.mapMetadatas.get(metadataId).status
    )

    console.log('fileNameDiff', fileNameDiff)
    console.log('htmlDiff', htmlDiff)

    this.dialogGitDifRef = this.dialog.open(DialogGitDiffComponent, {
      disableClose: false
    })
    this.dialogGitDifRef.componentInstance.buildModal(fileNameDiff, htmlDiff)
  }

  renderTreeColumn(args) {
    const key = args.data.node.key
    if (this.mapStoryMetadatas.has(key)) {
      let ele = args.data.node.tr.getElementsByTagName('td')[1]
      let html = this.tagStartHTML
      for (let storyMetadata of this.mapStoryMetadatas.get(key)) {
        if(!this.mapStory.has(storyMetadata.story)) {
          return
        }
        html += this.storyElement(
          this.mapStory.get(storyMetadata.story).name,
          storyMetadata.metadata,
          storyMetadata.story,
          !this.mapMetadatasPayload.has(key) ||
          this.mapMetadatasPayload.get(key).newValue !== storyMetadata.newValue ||
          (this.mapMetadatas.get(key).status === 'Deleted') !== storyMetadata.isDeleted,
          !this.mapMetadatasPayload.has(key) || !storyMetadata.newValue
        )

      }
      ele.innerHTML = html + this.tagEndHTML
    }
  }

  storyElement(name, metadataId, storyId, hasChanged, undetermined) {
    let showDiff = ''
    if (!undetermined && hasChanged) {
      showDiff = `data-metadata-id="${metadataId}" data-story-id="${storyId}" data-type="show-diff"`
    }
    return `<li class="${undetermined ? 'undetermined' : hasChanged ? 'orange' : 'green'}" ${showDiff}>` +
      `<span ${showDiff}>${name}</span>` +
      (undetermined ? '' : `<i class="fa fa-times" data-metadata-id="${metadataId}" data-story-id="${storyId}" data-type="remove-story" aria-hidden="true"></i>`) +
      '</li>'
  }

  //used for updating Ids when an update is finished.
  updatingIds(updatedData) {
    //the index is not -always- the order how it has been inserted (might be influenced by modified...)
    //we need to retrieve the index so that we can see what corresponds to what ...
    let mapUpdatedData = new Map()
    for (let tmp of updatedData.insertedIds) {
      //index-1 cause it starts at 1 (instead of 0 for normal array)
      mapUpdatedData.set(tmp.index - 1, tmp._id)
    }
    for (let i = this.newMetadataStories.length - 1; i >= 0; i--) {
      if (!this.newMetadataStories[i]._id) {
        this.newMetadataStories[i]._id = mapUpdatedData.get(i)
      }
    }

    this.newMetadataStories = [] //store new metadata or metadata to update
    this.oldMetadataStories = [] //store _id of metadata to delete
  }
}

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core'
import { Connection, Deployment, Release, Story } from 'core/lb-services'
import { StoreService } from 'core/store.service'
import { FancytreeComponent } from 'shared/fancytree'
import { MetadataSorting } from '../project-management/utils'
import * as io from 'socket.io-client'
const saveAs = require('file-saver').saveAs

declare var EventSource: any

@Component({
  selector: 'deployment',
  styleUrls: [
    './deployment.scss'
  ],
  templateUrl: './deployment.html'
})

export class DeploymentComponent implements OnDestroy, OnInit {
  @ViewChild('fancytree') fancytree: FancytreeComponent

  canceling = false
  componentFailures = ''
  connections: Array < any > = []
  deploymentId
  deploymentResult = ''
  describeMetadata
  isLoading = true
  optTestLevel: Array < any > = ['NoTestRun', 'RunSpecifiedTests', 'RunLocalTests', 'RunAllTestsInOrg']
  releases = []
  releaseId = null
  socket: any = io('/Socket')
  status = ''
  stories = []
  storyId = null
  storyMetadatas = []
  testFailures = ''

  request: {
    showManagedPackage: boolean,
    selectedSource: string,
    selectedTarget: string,
    deleteMetadata: boolean,
    testLevel: string,
    checkOnly: boolean,
    rollbackOnError: boolean
  } = {
    showManagedPackage: false,
    selectedSource: null,
    selectedTarget: null,
    deleteMetadata: false,
    testLevel: 'NoTestRun',
    checkOnly: false,
    rollbackOnError: true
  }

  constructor(
    private connection: Connection,
    private deployment: Deployment,
    private store: StoreService
  ) {}

  ngOnDestroy() {
    this.socket.close()
  }

  ngOnInit() {
    this.deployment.getDescribeMetadata({}).subscribe((describeMetadata) => {
      this.describeMetadata = describeMetadata
    })

    this.store.read('story').subscribe((stories) => {
      this.stories = stories
    })
    this.store.read('release').subscribe((releases) => {
      this.releases = releases
    })
    this.store.read('connection').subscribe((connections) => {
      this.isLoading = false
      this.connections = connections
    })

    this.socket.on('connect', () => {
      console.log('Socket connected')
    })
    this.socket.on('disconnect', (a) => {
      console.log('Socket disconnected', a)
    })

    this.socket.on('storyMetadatas', (_storyMetadatas) => {
      if(_storyMetadatas.over) {
        this.isLoading = false

        this.storyMetadatas = this.storyMetadatas.sort((a, b) => {
          if (a.fullPath.toLowerCase() < b.fullPath.toLowerCase()) return -1
          return 1
        })

        this.storyMetadatas = MetadataSorting(this.storyMetadatas, true, this.describeMetadata, false, null)

        this.fancytree.add(this.storyMetadatas)
        if (this.storyMetadatas.length) {
          this.fancytree.sortChildren()
        }
      } else {
        _storyMetadatas = _storyMetadatas.map((meta) => {
          meta.status = meta.isDeleted ? 'Deleted' : null
          return meta
        })
        this.storyMetadatas = this.storyMetadatas.concat(_storyMetadatas);
      }
    })

    this.socket.on('deployment', ( pkgBase64 ) => {
      if(pkgBase64.zipFile) {
        this.status += pkgBase64.status + '\n'
        const pkgBin = atob(pkgBase64.zipFile)

        const byteNumbers = new Array(pkgBin.length)
        for (var i = 0; i < pkgBin.length; i++) {
          byteNumbers[i] = pkgBin.charCodeAt(i)
        }

        saveAs(new Blob([ new Uint8Array(byteNumbers) ], { type: 'application/zip' }), 'package.zip')
        this.isLoading = false
      } else if(pkgBase64.message && pkgBase64.message.state) {
        this.status += pkgBase64.message.state + '\n'
      } else if(pkgBase64.deploymentId) {
        this.deploymentId = pkgBase64.deploymentId
      } else if(pkgBase64.deploymentResult) {
        if(pkgBase64.deploymentResult.status === 'Failed' ||
            pkgBase64.deploymentResult.status === 'Succeeded' ||
            pkgBase64.deploymentResult.status === 'SucceededPartial' ||
            pkgBase64.deploymentResult.status === 'Canceled') {

          this.isLoading = false
          this.canceling = false
        }

        const res = pkgBase64.deploymentResult
        this.status += res.status + '\n'

        this.deploymentResult = ''
        this.deploymentResult += `Tests: ${res.numberTestErrors} errors from a total of ${res.numberTestsTotal}\n`
        this.deploymentResult += `Components: ${res.numberComponentErrors} errors from a total of ${res.numberComponentsTotal}\n`

        this.testFailures = ''
        if(res.details && res.details.runTestResult && res.details.runTestResult.failures) {
          if(!Array.isArray(res.details.runTestResult.failures)) {
            res.details.runTestResult.failures = [res.details.runTestResult.failures]
          }
          this.testFailures = res.details.runTestResult.failures.reduce((error, failure, index) => {
            return `${error}Error #${index + 1}` +
              `\nerror: ${failure.message}` +
              (failure.stackTrace?`\nstack trace: ${typeof failure.stackTrace === 'string'?failure.stackTrace:failure.name}`: '') +
              '\n---------------------\n'
          }, this.testFailures)
        }

        if(res.details && res.details.runTestResult && res.details.runTestResult.codeCoverageWarnings) {
          if(!Array.isArray(res.details.runTestResult.codeCoverageWarnings)) {
            res.details.runTestResult.codeCoverageWarnings = [res.details.runTestResult.codeCoverageWarnings]
          }
          this.testFailures = res.details.runTestResult.codeCoverageWarnings.reduce((error, failure, index) => {
            return `${error}Error #${index + 1}` +
              (typeof failure.name === 'string'?`\nname: ${failure.name}`:'') +
              `\nerror: ${failure.message}` +
              '\n---------------------\n'
          }, this.testFailures)
        }

        this.componentFailures = ''
        if(res.details && res.details.componentFailures) {
          if(!Array.isArray(res.details.componentFailures)) {
            res.details.componentFailures = [res.details.componentFailures]
          }
          this.componentFailures = res.details.componentFailures.reduce((error, failure, index) => {
            return `${error}Error #${index + 1}` +
                  `\nmetadata: ${failure.fileName} (${failure.componentType}: ${failure.fullName})` +
                  `\nerror: ${failure.problem}`+
                  (failure.lineNumber?`\nline: ${failure.lineNumber}`:'') +
                  (failure.columnNumber ?`\ncolumn: ${failure.columnNumber}`:'') +
                  '\n---------------------\n'
          }, '')
        }
      }
    })
  }

  cancelDeployment() {
    if(!this.isLoading || !this.deploymentId || this.canceling) {
      return
    }
    if (confirm('Are you sure to cancel this deployment?')) {
      this.canceling = true
      this.socket.emit('deployment.cancel', {
        targetId: this.request.selectedTarget,
        deploymentId: this.deploymentId
      })
    }
  }

  deploy() {
    this.deploymentId = null
    if(this.isLoading ||
        (this.request.selectedSource === null && this.storyId === null && this.releaseId === null) ||
        (this.request.selectedTarget === null && !this.request.deleteMetadata)
      ) {
      return
    }
    let metadata = this.fancytree.get()
      .filter(node => !node.key.startsWith('_')) //we filter generated Ids of Fancytree
      .map(node => node.key)

    if(!metadata.length && this.storyId === null && this.releaseId === null) {
      window.alert('Select something to deploy')
      return
    }

    let storyIds = []
    const release = this.releases.find((release) => release._id === this.releaseId)
    if(release && release.stories) {
      storyIds = storyIds.concat(storyIds)
    }

    if(this.storyId !== null) {
      storyIds.push(this.storyId)
    }

    this.isLoading = true
    this.status = ''
    this.deploymentResult = ''
    this.componentFailures = ''
    this.testFailures = ''

    this.socket.emit('deployment.deploy', {
      metadata,
      sourceId: this.request.selectedSource,
      targetId: this.request.selectedTarget,
      deleteMetadata: this.request.deleteMetadata,
      testLevel: this.request.testLevel,
      checkOnly: this.request.checkOnly,
      rollbackOnError: this.request.rollbackOnError,
      storyIds
    })
  }

  getPackage() {
    this.deploymentId = null
    if(this.isLoading || !this.fancytree) {
      return
    }

    const metadata = this.fancytree.get().map(node => node.key)
    if(!metadata.length) {
      window.alert('Select something to retrieve')
      return
    }

    this.isLoading = true
    this.status = ''
    this.deployment.getPackage(metadata).subscribe((pkg) => {
      const blob = new Blob([pkg], { type: 'text/plain;charset=utf-8' })
      saveAs(blob, 'package.xml')
      this.isLoading = false
    })
  }

  getZip() {
    this.deploymentId = null
    if(this.isLoading || !this.fancytree) {
      return
    }

    const metadata = this.fancytree.get().map(node => node.key)
    if(!metadata.length) {
      window.alert('Select something to retrieve')
      return
    }

    this.isLoading = true
    this.status = ''
    this.socket.emit('deployment.getZip', {
      metadata,
      sourceId: this.request.selectedSource
    })
  }

  onConnectionChange() {
    console.log('selectedSource', this.request.selectedSource, this.request.showManagedPackage)

    this.fancytree && this.fancytree.reload()
  }

  onReleaseChange() {
    const release = this.releases.find((release) => release._id === this.releaseId)
    this.getStories(release && release.stories || [])
  }

  onStoryChange() {
    console.log('this.story', this.storyId)
    this.getStories(this.storyId !== null ? [this.storyId]: [])
  }

  getStories(storyIds) {
    console.log('storyIds', storyIds)
    this.storyMetadatas = []

    if(storyIds.length) {
      this.isLoading = true
      this.socket.emit('deployment.getStoryReleaseMetadata', {
        storyIds
      })
    } else {
      this.fancytree && this.fancytree.reload()
    }
  }
}

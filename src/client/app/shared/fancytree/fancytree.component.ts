import { AfterViewInit, Component, ElementRef, EventEmitter, Injectable, Input, Output, ViewChild } from '@angular/core'

const jQuery = require('jquery')
require('jquery-ui/ui/core')
require('jquery-ui/ui/widget')
require('jquery-ui/ui/effects/effect-blind')
require('imports-loader?jQuery=jquery!jquery.fancytree/dist/jquery.fancytree.js')
require('imports-loader?jQuery=jquery!jquery.fancytree/src/jquery.fancytree.childcounter.js')
require('imports-loader?jQuery=jquery!jquery.fancytree/src/jquery.fancytree.table.js')
require('imports-loader?jQuery=jquery!jquery.fancytree/src/jquery.fancytree.glyph.js')

@Component({
  selector: 'fancytree',
  styleUrls: [
    './fancytree.scss'
  ],
  templateUrl: './fancytree.html'
})

@Injectable()
export class FancytreeComponent implements AfterViewInit {
  @ViewChild('tree') tree: ElementRef
  @Input() lazyLoadSource
  @Input() extensions = []
  @Input() showManagedPackage
  @Output() renderTreeColumn = new EventEmitter()
  myTree: any

  constructor() {}

  ngAfterViewInit() {
    console.log('this.tree.nativeElement ', this.tree.nativeElement)
    this.init()
  }

  add(metadatas) {
    this.myTree.fancytree('getTree').reload(metadatas)
  }

  applyPatch(metadataId) {
    this.myTree.fancytree('getTree').getNodeByKey(metadataId).applyPatch({})
  }

  init() {
    this.myTree = jQuery(this.tree.nativeElement).fancytree({
      extensions: this.extensions,
      childcounter: {
        hideExpanded: true,
        deep: true,
        hideZeros: true
      },
      glyph: {
        map: {
          doc: 'fa fa-file-text-o',
          docOpen: 'fa fa-file-text-o',
          checkbox: 'fa fa-square-o',
          checkboxSelected: 'fa fa-check-square-o',
          checkboxUnknown: 'fa fa-square',
          dragHelper: 'fa arrow-right',
          dropMarker: 'fa long-arrow-right',
          error: 'fa fa-warning',
          expanderClosed: 'fa fa-caret-right',
          expanderLazy: 'fa fa-angle-right',
          expanderOpen: 'fa fa-caret-down',
          folder: 'fa fa-folder-o',
          folderOpen: 'fa fa-folder-open-o',
          loading: 'fa fa-spinner fa-pulse',
          nodata: 'fa fa-meh-o',
        }
      },
      selectMode: 3,
      activeVisible: false,
      autoActivate: false,
      clickFolderMode: 3,
      checkbox: true,
      keyPathSeparator: '/',
      // source: this.source,
      lazyLoad: (event, data) => {
        var node = data.node
        data.result = {
          url: '/api/Connection/getMetadata',
          data: {
            key: node.key,
            selected: node.selected,
            source: this.lazyLoadSource !== '-' ? this.lazyLoadSource : null,
            showManagedPackage: this.showManagedPackage
          }
        }
      },
      select: (event, data) => {
        //only in lazy mode
        if(this.lazyLoadSource && this.lazyLoadSource !== '-') {
          const node = data.node
          if (!node.expanded && node.selected && node.folder) {
            node.setExpanded(true)
          }
          node.visit((subNode) => {
            if (subNode.isUndefined() && subNode.isSelected()) {
              subNode.load()
            }
          });
          if (node.key === '$$' && node.selected) {
            node.getParent().setSelected(true)
          }
        }
      },
      loadChildren: (event, data) => {
        data.node.updateCounters()
        // Apply parent's state to new child nodes:
        data.node.visit((subNode) => {
          if (subNode.isUndefined() && subNode.isSelected()) {
            subNode.load()
          }
        })
        data.node.fixSelection3AfterClick() //fix children state when they are loaded
      },
      renderColumns: (event, data) => {
        this.renderTreeColumn.emit({data})
      }
    })
    this.reload()
  }

  get() {
    console.log('get...')
    return this.myTree.fancytree('getTree').getSelectedNodes()
  }

  reload() {
    setTimeout(() => {
      console.log('lazysource => ', this.lazyLoadSource)
      if (!this.lazyLoadSource || this.lazyLoadSource === '-') {
        this.myTree.fancytree('getTree').reload([])
      } else {
        this.myTree.fancytree('getTree').reload({
          url: '/api/Connection/getDescribeMetadata?source=' + this.lazyLoadSource
        })
      }
    })
  }

  rerender() {
    this.myTree.fancytree('getTree').render(true)
  }

  sortChildren() {
    this.myTree.fancytree('getTree').getFirstChild().getParent().sortChildren()
  }
}

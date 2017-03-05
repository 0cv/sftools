import { Component, OnDestroy, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Connection, GitServer, PrivateKey } from 'core/lb-services'
import { StoreService } from 'core/store.service'
import { FormBuilder, FormControl, FormGroup } from '@angular/forms'

@Component({
  selector: 'edit-connection',
  styleUrls: [
    './edit-connection.scss'
  ],
  templateUrl: './edit-connection.html'
})

export class EditConnectionComponent implements OnDestroy, OnInit {
  sub: any
  type: string
  gitServers: Array < any > = []
  optionComponentTypes = []
  privateKeys: Array < any > = []

  form = new FormGroup({
    _id: new FormControl(),
    folder: new FormControl(),
    lastupdate: new FormControl(),
    accesstoken: new FormControl(),
    instanceurl: new FormControl(),
    sforgid: new FormControl(),
    componenttypes: new FormControl(),
    backupmanagedpackage: new FormControl(),
    backupStatus: new FormControl(),
    orgname: new FormControl(),
    commitmessage: new FormControl(),
    companyfolder: new FormControl(),
    issandbox: new FormControl(),
    branch: new FormControl(),
    isrunningunittests: new FormControl(),
    unitteststatus: new FormControl(),
    unittestlastrun: new FormControl(),
    unittestsrecipients: new FormControl(),
    unittestsstart: new FormControl(),
    unittestsend: new FormControl(),
    isunittestasync: new FormControl(),
    unittestfrequencyrun: new FormControl('Daily'),
    slackwebhook: new FormControl(),
    gitserver: new FormControl(),
    privatekey: new FormControl()
  })

  endpoint = new FormControl('Sandbox')

  endpoints = [
    'Sandbox',
    'Production'
  ]

  unitTestFrequencyOptions = [
    {
      value: 'ASAP',
      text: 'As soon as possible'
    }, {
      value: '1h',
      text: 'Hourly'
    }, {
      value: '6h',
      text: 'Every 6 hours'
    }, {
      value: '24h',
      text: 'Daily'
    }
  ]

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private connection: Connection,
    private gitServer: GitServer,
    private privateKey: PrivateKey,
    private store: StoreService
  ) {}

  ngOnDestroy() {
    this.sub.unsubscribe()
  }

  ngOnInit() {
    //loading git servers
    this.loadGitServers()

    //loading private keys
    this.loadPrivateKeys()

    this.sub = this.route.params.subscribe(params => {
      //load connection
      this.loadConnection(params['_id'])

      //loading available option component types
      this.loadOptionComponentTypes(params['_id'])
    })
  }

  loadConnection(_id) {
    if (_id === 'new') {
      this.type = 'New'
    } else {
      this.type = 'Edit'
      this.store.read('connection').subscribe((connections) => {
        const connection = connections && connections.find((it) => it['_id'] === _id)
        if (connection) {
          this.form.patchValue(connection)
        }
      })
    }
  }

  loadGitServers() {
    this.store.read('gitserver').subscribe(gitServers => {
      this.gitServers = gitServers
    })
  }

  loadOptionComponentTypes(_id) {
    console.log('loadOptionComponentTypes')
    //if id is not new, we retrieve the components related to this connection.
    if(_id !== 'new') {
      this.connection.getDescribeMetadata({source: _id}).subscribe((_optionComponentTypes) => {
        console.log('_optionComponentTypes', _optionComponentTypes)
        this.optionComponentTypes = _optionComponentTypes.map(cmp => cmp.key)
      })
    }
  }

  loadPrivateKeys() {
    this.store.read('privatekey').subscribe(privateKeys => {
      this.privateKeys = privateKeys
    })
  }

  save() {
    console.log('going to save in db', this.form.value, this.endpoint.value)
    this.form.patchValue({
      issandbox: this.endpoint.value === 'Sandbox'
    })
    if (this.form.value._id) {
      this.connection.updateAttributes(this.form.value._id, this.form.value).subscribe((res) => {
        console.log('updated in db', res)
        this.store.update('connection', this.form.value)
        this.router.navigate(['/connections'])
      })
    } else {
      this.connection.create(this.form.value).subscribe((res) => {
        console.log('created in db', res)
        if (res && res.uri) {
          window.location.href = res.uri
        } else {
          this.router.navigate(['/connections'])
        }
      })
    }
  }
}

import { Connection } from '../../models'
import oauth2 from 'salesforce-oauth2'
import { config } from '../../../config'
import { getHeaderMetadata, jsforce, metadata } from '../../utils'
import _jsforce from 'jsforce'

const redirect_uri = config.redirect_uri,
  client_id = config.client_id,
  client_secret = config.client_secret


export async function createConnection(ctx, next) {
  delete ctx.request.body._id
  const connection = new Connection(ctx.request.body)
  connection.user = ctx.session.passport.user._id

  try {
    await connection.save()
    ctx.body = {
      _id: connection._id.toString(),
      base_url: connection.issandbox ? 'https://test.salesforce.com' : 'https://login.salesforce.com'
    }
    next()
  } catch (err) {
    ctx.throw(422, err.message)
  }
}

export async function updateConnection(ctx) {
  const connection = ctx.body.connection

  Object.assign(connection, ctx.request.body)

  await connection.save()

  ctx.body = {
    success: true
  }
}

export async function getConnection(ctx, next) {
  try {
    const connection = await Connection.find({ _id: ctx.params._id, user: ctx.session.passport.user._id })
    if (!connection.length) {
      ctx.throw(404)
    }

    ctx.body = {
      connection: connection[0]
    }
  } catch (err) {
    if (err === 404 || err.name === 'CastError') {
      ctx.throw(404)
    }

    ctx.throw(500)
  }

  next && next()
}

export async function getDescribeMetadata(ctx) {
  const tmp = await getHeaderMetadata(ctx)
  const headerMetadata = tmp && tmp[Object.keys(tmp)[0]]
  if(!headerMetadata) {
    ctx.body = []
    return
  }

  ctx.body = headerMetadata.map(meta => {
    return {
      folder: true,
      title: meta.xmlName,
      key: meta.xmlName,
      lazy: true
    }
  }).sort((a, b) => {
    if (a.title < b.title) {
      return -1
    } else {
      return 1
    }
  })
}

export async function getMetadata(ctx) {
  const connection = await Connection.findById(ctx.query.source)
  const conn = jsforce(connection)
  let type = ctx.query.key.split('/')[0]
  let fullName = ctx.query.key.split('/')[1]
  let list
  if (fullName && (type === 'CustomObject' || type === 'Workflow')) {
    list = await conn.metadata.read(type, fullName)
    if (type === 'CustomObject') {
      ctx.body = extractComposedObject(list, metadata.customObjectMetadata, type + '/' + fullName)
    } else {
      ctx.body = extractComposedObject(list, metadata.workflowMetadata, type + '/' + fullName)
    }
    if (ctx.body.length) {
      ctx.body.push({
        title: 'All Metadata',
        key: '$$',
        folder: true,
        selected: ctx.query.selected === 'true'
      })
    }
  } else {
    let query
    
    if (type === 'SharingRules') {
      query = [{ type: 'SharingCriteriaRule' }, { type: 'SharingOwnerRule' }]
    } else if (type === 'CustomLabels') {
      query = { type: 'CustomLabel' }
    } else {
      if (ctx.query.key in metadata.folderMetadata) {
        type = metadata.folderMetadata[ctx.query.key]
      }
      query = { type }
      if (fullName) {
        query.folder = fullName
      }
    }
    list = await conn.metadata.list(query)

    if(!list) {
      ctx.body = []
      return
    }

    if (!Array.isArray(list)) {
      list = [list]
    }

    //CURRENT BUG IN SALESFORCE: RULES ARE DUPLICATED, WE DEDUPE THEM...
    if(type === 'SharingRules') {
      //Filtering is simply based on Id of the Sharing Rules.
      list = list.filter((tmp, index, array) => {
        return index === array.findIndex(item => tmp.id === item.id)
      })
    } 
    //CURRENT BUG IN SALESFORCE: Flows FullName are not retrieved correctly so we take the API Name which is 
    // correct, and append the VersionNumber from the Tooling API.
    else if(type === 'Flow') {
      const flowVersionNumbers = await conn.tooling.query('Select Id, VersionNumber From Flow')
      list = list.map((tmp) => {
        const flowVersionNumber = flowVersionNumbers.records.find(flow => flow.Id === tmp.id)
        tmp.fullName = tmp.fullName.split('-')[0] + '-' + flowVersionNumber.VersionNumber
        return tmp
      })
    }

    ctx.body = list
      .filter(meta => {
        return ctx.query.showManagedPackage === 'true' ||
          ctx.query.showManagedPackage === 'false' &&
          (!('manageableState' in meta) ||
            meta.manageableState === 'unmanaged'
          )

      })
      .sort((a, b) => {
        if (a.fullName.toLowerCase() < b.fullName.toLowerCase()) {
          return -1
        } else {
          return 1
        }
      })
      .map(meta => ({
        title: meta.fullName.substr(meta.fullName.lastIndexOf('/') + 1),
        key: (ctx.query.key in metadata.folderMetadata ? ctx.query.key : meta.type) + '/' + meta.fullName,
        folder: ctx.query.key in metadata.folderMetadata,
        lazy: ctx.query.key in metadata.folderMetadata,
        selected: ctx.query.selected === 'true'
      }))

    if(type === 'SharingRules') {
      //for sharing rules, we move the rules into their respective folders.
      let ruleTypes = new Set() //SharingOwnerRule or SharingCriteriaRule
      let newBody = []
      for(let rule of ctx.body) {
        ruleTypes.add(rule.key.split('/')[0])
      }
      for(let ruleType of ruleTypes) {
        newBody.push({
          title: ruleType,
          key: ruleType,
          folder: true,
          selected: ctx.query.selected === 'true',
          children: ctx.body.filter(rule => rule.key.startsWith(ruleType))
        })
      }
      ctx.body = newBody
    }
  }

  conn._destroy()

  function extractComposedObject(fullComposedObject, objectMetadata, key) {
    return objectMetadata
      .filter(meta => meta.key in fullComposedObject)
      .map(meta => {
        const metaFolder = {
          title: meta.val,
          key: key + '/' + meta.val,
          folder: true,
          selected: ctx.query.selected === 'true'
        }
        let obj = fullComposedObject[meta.key]
        if (!Array.isArray(obj)) {
          obj = [obj]
        }
        metaFolder.children = obj.map(meta => ({
          title: meta.fullName,
          key: metaFolder.key + '/' + meta.fullName,
          select: ctx.query.selected === 'true'
        }))

        return metaFolder
      })
  }
}

export async function getConnections(ctx) {
  let connections = await Connection.find({ user: ctx.session.passport.user._id }).sort('folder')

  connections = await Promise.all(
    connections.map(async (connection) => {
      let oauth2 = new _jsforce.OAuth2({
        clientId: config.client_id,
        clientSecret: config.client_secret,
        loginUrl: connection.instanceurl
      })
      let refreshedConnection
      let newToken = null
      try {
        refreshedConnection = await oauth2.refreshToken(connection.refreshtoken)
        newToken = refreshedConnection.access_token
      } catch(e) {
        console.log('Error in refreshing', e)
      }
      if(newToken !== connection.accesstoken) {
        connection.accesstoken = newToken
        await connection.save()
      }

      return connection
    })
  )

  ctx.body = connections
}

/**
 * for the authorization to Salesforce
 */
export function authorize(ctx) {
  const options = {
    state: ctx.body._id,
    redirect_uri,
    base_url: ctx.body.base_url,
    client_id,
    scope: 'full refresh_token web'
  }
  const uri = oauth2.getAuthorizationUrl(options)
  ctx.body = {
    uri
  }
}

/**
 * for handling the second part of the authentication to Salesforce
 */
export async function callback(ctx) {
  if (ctx.query) {
    const code = ctx.query.code
    const connectionId = ctx.query.state
    const authenticate = Promise.promisify(oauth2.authenticate)

    try {
      const connection = await Connection.findById(connectionId)

      let payload
      try {
        payload = await authenticate({
          redirect_uri,
          client_id,
          client_secret,
          code,
          base_url: connection.issandbox ? 'https://test.salesforce.com' : 'https://login.salesforce.com'
        })
      } catch(e) {
        console.log('redirect_uri', redirect_uri)
        console.log('client_id', client_id)
        console.log('client_secret', client_secret)
        console.log('code', code)
        console.log('authentication failed!', e, payload)
        ctx.throw(e.statusCode, e.message)
      }

      const conn = jsforce({
        accesstoken: payload.access_token,
        instanceurl: payload.instance_url
      })
      const org = await conn.query('SELECT Name FROM Organization')
      conn._destroy()

      await Connection.update({
        _id: connectionId
      }, {
        refreshtoken: payload.refresh_token,
        accesstoken: payload.access_token,
        instanceurl: payload.instance_url,
        sforgid: payload.access_token.substr(0, payload.access_token.indexOf('!')),
        orgname: org.totalSize && org.records[0].Name
      })
      ctx.redirect('/connections')
    } catch (error) {
      ctx.throw(error.statusCode, error.message)
    }
  }
}

export async function deleteConnection(ctx) {
  const connection = new Connection({ _id: ctx.params._id })

  await connection.remove()

  ctx.body = {
    success: true
  }
}

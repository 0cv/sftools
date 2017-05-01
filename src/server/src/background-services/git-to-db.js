import { getHeaderMetadata } from '../utils'
import { Connection, Metadata, Project } from '../models'
import { createSSHKey, getLatestCommits, retrieveMetadataFromGit } from './sfdc-to-git'
import Promise from 'bluebird'
import path from 'path'
import fs from 'fs'
import xml2js from 'xml2js'

const isBinaryFile = Promise.promisify(require('isbinaryfile'))
const execAsync = Promise.promisify(require('child_process').exec)
const parseString = Promise.promisify(xml2js.parseString)
const builder = require('xmlbuilder')

const topFolder = 'gitChangesFiles'
let metadataToUpsert = []
let countUpserted = 0
let i = 0

//Metadata which we need to analyze and split in the database
const gitChangesComplexMetadata = new Set([
  'AssignmentRules',
  'AutoResponseRules',
  'CustomLabels',
  'CustomObject',
  'EscalationRules',
  'MatchingRules',
  'PermissionSet',
  'Profile',
  'Workflow',
  'SharingRules'
])

//used for identifying the unique Id of a give subMetadata.
//If an array, then we need to compose the key in order to be able to build a unique key
const subMetadataKey = new Map([
  //Profile & Permission Sets
  ['applicationVisibilities', 'application'],
  ['classAccesses', 'apexClass'],
  ['customPermissions', 'name'],
  ['externalDataSourceAccesses', 'externalDataSource'],
  ['fieldPermissions', 'field'],
  ['objectPermissions', 'object'],
  ['pageAccesses', 'apexPage'],
  ['recordTypeVisibilities', 'recordType'],
  ['userPermissions', 'name'],

  //Profile
  ['layoutAssignments', ['layout', 'recordType']],
  ['tabVisibilities', 'tab'],

  //Permission Set
  ['tabSettings', 'tab'],

  //CustomObject
  ['actionOverrides', 'actionName'],
  ['businessProcesses', 'fullName'],
  ['compactLayouts', 'fullName'],
  ['fieldSets', 'fullName'],
  ['fields', 'fullName'],
  ['listViews', 'fullName'],
  ['recordTypes', 'fullName'],
  //edge case...    ['searchLayouts', null ],
  ['sharingReasons', 'fullName'],
  ['sharingRecalculations', 'className'],
  ['validationRules', 'fullName'],
  ['webLinks', 'fullName'],

  //Workflow
  ['alerts', 'fullName'],
  ['fieldUpdates', 'fullName'],
  ['flowActions', 'fullName'], //unsure...
  ['knowledgePublishes', 'fullName'], //unsure...
  ['outboundMessages', 'fullName'],
  ['rules', 'fullName'],
  ['send', 'fullName'], //unsure...
  ['tasks', 'fullName'],

  //SharingRules
  ['sharingCriteriaRules', 'fullName'],
  ['sharingOwnerRules', 'fullName'],

  //CustomLabels
  ['labels', 'fullName'],

  //AssignmentRules
  ['assignmentRule', 'fullName'],

  //AutoResponseRules
  ['autoResponseRule', 'fullName'],

  //EscalationRules
  ['escalationRule', 'fullName'],

  //MatchingRules
  ['matchingRules', 'fullName']
])

export async function gitToDb() {
  console.log('gitToDb started')
  try {
    const projectCommits = new Map() //map to store the hash of the project commits.

    const projects = await Project.find()

    console.info('projects', projects)

    //Find connections of these projects
    const connectionIds = projects.map(project => project.connection)
    const connections = await Connection.find({
      _id: {
        $in: connectionIds
      },
      privatekey: {
        $ne: null
      }
    })

    //we create the SSH keys, which will be used for pulling the metadata from GIT.
    await createSSHKey(connections)

    //we get the last commit hash... git log -n 1 --pretty=format:'%H'
    const latestCommits = await getLatestCommits(connections)

    //based on the hash, we will have to remove some connections for further processing
    //if the GIT has the same hash, than the hash stored in the project (under "latestCommit"),
    //there will be no further operation and the project is removed from the projects Array.
    console.log('latestCommits ==> ', latestCommits)
    for (let i = projects.length; i--;) {
      let project = projects[i]
      if (connections.findIndex(connection => connection._id.toString() === project.connection.toString()) === -1) {
        projects.splice(i, 1)
        continue
      }
      projectCommits.set(project._id.toString(), project.latestCommit)
      if (project.latestCommit !== latestCommits.get(project.connection.toString())) {
        project.latestCommit = latestCommits.get(project.connection.toString())
      } else {
        //MUST BE UNCOMMENTED!
        projects.splice(i, 1)

        //MUST BE DELETED
        // projectCommits.delete(project._id.toString())
      }
    }
    console.info('projects to be handled ...', projects)

    if (projects.length === 0) {
      return
    }

    for (let i = connections.length; i--;) {
      if (projects.findIndex(project => connections[i]._id.toString() === project.connection.toString()) === -1) {
        connections.splice(i, 1)
      }
    }

    await Promise.all(projects.map(project => project.save()))

    //we pull the repositories for all connections under the `topFolder` directory
    await retrieveMetadataFromGit(connections, topFolder, true, false)

    //we describe the metadata of the different connections
    //storing all the top metadata per connection
    const metadataTemp = await getHeaderMetadata(null, connections)
    const mapMetadata = new Map()
    if (!metadataTemp) {
      // Nothing to proceed
      return
    }
    for (let connectionId of Object.keys(metadataTemp)) {
      mapMetadata.set(connectionId, new Map())
      for (let metadata of metadataTemp[connectionId]) {
        mapMetadata.get(connectionId).set(metadata.directoryName, metadata)
      }
    }

    let mapGitDiff = new Map()
    await Promise.all(projects.map(async (project) => {
      let differences
      if (projectCommits.get(project._id.toString())) {
        let myConnection = connections.find(conn => conn._id.toString() === project.connection.toString())

        differences = await gitDiff(myConnection, projectCommits.get(project._id.toString()), topFolder)

        // differences: list of files, which have been changed.
        mapGitDiff.set(project._id.toString(), differences || true)
      } else {
        //this is a new project, all metadata will be parsed.
        mapGitDiff.set(project._id.toString(), true)
      }
      return await differences
    }))

    //we can now parse the whole tree and insert metadata in Mongo.
    // console.log('finished2', mapMetadata)
    console.info('git diff!!', mapGitDiff)

    await Promise.all(projects.map(async (project) => {
      let connectionId, projectId = project._id.toString()
      let index = connections.findIndex(conn => conn._id.toString() === project.connection.toString())
      connectionId = connections[index]._id.toString()
      let folders = await execAsync(`cd ${topFolder}/${connectionId} && find . -type d -not \\( -path '*.git*' -prune \\)`, {
        maxBuffer: NaN
      })

      //we have all folders of this connection (objects, classes, roles, ...)
      folders = folders.toString().split('\n')
      folders = folders
        .map(folder => folder.substr(2)) //to remove the ./ at the beginning...
        .filter(folder => mapMetadata.get(connectionId).has(folder)) //e.g. classes, roles, ...

      await Promise.all(folders.map(async (folder) => {
        //for each folder, we process its content:
        let apiFolder = mapMetadata.get(connectionId).get(folder).xmlName //e.g. ApexClass
        let mapExistingMetadata = new Map()
        let upsertedMetadataPath = new Set()
        let [fileNames, metadatas] = await Promise.join(
          execAsync('cd ' + path.join(topFolder, connectionId, folder) + ' && find . -type f', {
            maxBuffer: NaN
          }),
          Metadata.find({
            project: project._id,
            apiFolder: apiFolder
          }, '_id filePath fullPath').lean()
        )

        fileNames = fileNames.toString().split('\n')
        fileNames = fileNames.map(fileName => fileName.substr(2)) //to remove the ./ at the beginning...
        for (let metadata of metadatas) {
          if (mapGitDiff.get(projectId) === true || mapGitDiff.get(projectId).has(metadata.filePath)) {
            mapExistingMetadata.set(metadata.fullPath, metadata)
          }
        }
        metadatas = null

        fileNames = fileNames.filter((fileName) => {
          let filePath = path.join(folder, fileName)
          return (mapGitDiff.get(projectId) === true || mapGitDiff.get(projectId).has(filePath)) && fileName && fileName !== ','
        })

        await transformFilesToJS(topFolder, folder, fileNames, apiFolder, connectionId, mapExistingMetadata, upsertedMetadataPath, project, true)

        //all remaining metadata, are metadata which are not present anymore in GIT.
        //Therefore, they must be tagged as deleted.
        for (let existingMetadata of mapExistingMetadata) {
          let metadata = existingMetadata[1]
          metadataToUpsert.push({
            updateOne: {
              filter: {
                _id: metadata._id
              },
              update: {
                $set: {
                  status: 'Deleted'
                }
              }
            }
          })
        }
      }))
    }))

    if (metadataToUpsert.length) {
      let result = await Metadata.collection.bulkWrite(metadataToUpsert, {
        ordered: false
      })
      result.writeErrors && console.error('metadata upserted write errors...', result.writeErrors)
      console.info(`metadata upserted ${result.nInserted} inserted, ${result.nUpserted} upserted, ${result.nMatched} matched, ${result.nModified} modified, ${result.nRemoved} removed`)

      countUpserted += result.nInserted + result.nUpserted
      metadataToUpsert = []
      console.log('memusage final', process.memoryUsage(), ' - upserted: ', countUpserted)
    }

    console.log('gitToDb finished')
  } catch (e) {
    console.error('Error in gitToDb', e)
  }
}

export async function transformFilesToJS(rootFolder, folder, fileNames, apiFolder, connectionId, mapExistingMetadata, upsertedMetadataPath, project, insertToDB) {
  metadataToUpsert = []
  await Promise.all(fileNames.map(async (fileName) => {
    let filePath = path.join(folder, fileName) //e.g. objects/Account.object
    let fullFilePath = path.join(rootFolder, connectionId, filePath)
    let isBinary = await isBinaryFn(folder, fullFilePath)
    let fileContent
    try {
      fileContent = await fs.readFileAsync(fullFilePath, isBinary ? null : 'utf8')
    } catch (e) {
      return
    }
    if (gitChangesComplexMetadata.has(apiFolder)) { //for complex metadata defined there (such as Profile, Custom Object)
      //console.info('is complex metadata1', fileContent)
      //this is an XML, which needs to be parsed. Children elements will be inserted separately.
      //we are just analysing the first level, which should be enough for all metadata

      console.log('fileContent1', filePath)

      let xml = await parseString(fileContent)
      console.log('fileContent2', filePath)

      fileContent = null
      let nodes = Object.keys(xml[apiFolder]).filter(node => node !== '$')

      await Promise.all(nodes.map(async (node) => { //e.g. node = fields
        let _array = xml[apiFolder][node]
        if (!Array.isArray(_array)) {
          _array = [_array]
        }
        await Promise.all(_array.map(async (subJSONContent) => {
          let key = subMetadataKey.get(node), subKey
          if (Array.isArray(key)) {
            subKey = '|'
            for (let i = 0; i < key.length; i++) {
              if (subJSONContent.hasOwnProperty(key[i])) {
                subKey += subJSONContent[key[i]] + '-'
              }
            }
            if (subKey.endsWith('-')) {
              subKey = subKey.substr(0, subKey.length - 1)
            }
          } else {
            subKey = key && subJSONContent[key] || ''
            if (subKey) {
              subKey = '|' + subKey
            }
          }
          let tmp = {}
          tmp[node] = subJSONContent
          let subXMLContent = builder.create(tmp, {
            headless: true
          })

          await upsertMetadata(mapExistingMetadata, upsertedMetadataPath, project, filePath + '|' + node + subKey, apiFolder, filePath, subXMLContent.end({
            pretty: true,
            indent: '    ',
            offset: 1,
            newline: '\n'
          }), false, insertToDB)
        }))
      }))
    } else {
      await upsertMetadata(mapExistingMetadata, upsertedMetadataPath, project, filePath, apiFolder, filePath, fileContent, isBinary, insertToDB)
    }
  }))
  return metadataToUpsert
}

//method called from the nested loop for upserting metadata (some are updated, other inserted)
async function upsertMetadata(mapExistingMetadata, upsertedMetadataPath, project, fullPath, apiFolder, filePathInProject, xmlContent, isBinary, insertToDB) {
  let fileName = filePathInProject.substr(filePathInProject.lastIndexOf('/') + 1), metadata = {}
  i++
  let newValueField = isBinary ? 'newValueBin' : 'newValue'

  if (!upsertedMetadataPath.has(fullPath)) { //required due to some SFDC bugs - should be unique accross orgs but not always the case...
    upsertedMetadataPath.add(fullPath)
    if (mapExistingMetadata.has(fullPath)) {
      metadata.status = 'Updated'
      metadata.isIgnored = false
      metadata[newValueField] = xmlContent

      //we only update based on the path, and also if the content has been changed
      //this is important to, especially, not set "Ignored" metadata to the status "Updated"
      //while no concrete update has happened.
      metadataToUpsert.push({
        updateOne: {
          filter: {
            _id: mapExistingMetadata.get(fullPath)._id,
            [newValueField]: {
              '$ne': xmlContent
            }
          },
          update: {
            $set: metadata
          }
        }
      })
      mapExistingMetadata.delete(fullPath)

    } else {
      metadata.project = project && project._id
      metadata.filePath = filePathInProject
      metadata.fullPath = fullPath
      metadata.name = fileName
      metadata.apiFolder = apiFolder
      metadata[newValueField] = xmlContent
      metadata.isIgnored = false
      metadata.status = 'Created'

      metadataToUpsert.push({
        insertOne: {
          document: metadata
        }
      })
    }
    if (insertToDB && i % 5000 === 0) { //bulk upsert of 5k records each.
      try {
        let result = await Metadata.collection.bulkWrite(metadataToUpsert.splice(0), {
          ordered: false
        })

        result.writeErrors && console.error('metadata upserted write errors...', result.writeErrors)
        console.info(`metadata upserted ${result.nInserted} inserted, ${result.nUpserted} upserted, ${result.nMatched} matched, ${result.nModified} modified, ${result.nRemoved} removed`)
        countUpserted += result.nInserted + result.nUpserted
      } catch (e) {
        console.error('upsertMetadata.upsert error', e)
      }
    }
  }
}

async function isBinaryFn(folder, fullFilePath) {
  if (folder !== 'staticresources' && folder !== 'sitedotcomsites') {
    //not worth wasting time if it's neither static resources nor sitedotcomsites
    //as it must be a normal text file
    return false
  }
  return await isBinaryFile(fullFilePath)
}

export async function gitDiff(connection, latestCommit, folder) {
  try {
    let pfad = path.join(folder, connection._id.toString())
    console.info('command git diff...', `cd ${pfad} && git diff --name-only ${latestCommit} HEAD`)
    let files = await execAsync(`cd ${pfad} && git diff --name-only ${latestCommit} HEAD`)
    files = files.split('\n')
    return new Set(files.filter(file => file !== ''))
  } catch (e) {
    console.error('bgBackup.getLatestCommits.gitPull:', e)
  }
}

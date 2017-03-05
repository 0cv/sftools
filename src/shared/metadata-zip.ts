import JSZip from 'jszip'

//we go explicitely to the common module to avoid exporting server side tokens in the
//client side code
import { common } from '../server/config/env/common.js'

export function metadataZip(describeMetadata, storyMetadatas, subMetadatas) {
  const zip = new JSZip()
  let packageXML = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n'
  let destructivePackageXML = packageXML
  let pkgBuilder = new Map()
  let destructivePKGBuilder = new Map()
  let filePathsInZip = new Set()
  let xmlNestedCmp
  let currentFilePath
  let folderName
  let pkgFolder

  if (subMetadatas) {
    //transforming into an easy to use Map.
    let tmp = new Map()
    for (let sub in subMetadatas) {
      tmp.set(sub, new Map())
      for (let el of subMetadatas[sub]) {
        tmp.get(sub).set(el.key, el.val)
      }
    }
    subMetadatas = tmp
    subMetadatas.set('CustomLabels', new Map([
      ['labels', 'CustomLabel']
    ]))
  }
  for (let storyMetadata of storyMetadatas) {
    let fullPath = storyMetadata.fullPath //e.g. objects/Account.object|fields|myfield__c
    let parts = fullPath.split('|')
    let filePath = parts[0] //e.g. objects/Account.object
    let nestedXMLroot = parts.length > 1 ? parts[1] : null //e.g. fields


    //building here the package.xml
    if (belongsToPackageXML(fullPath)) {
      pkgFolder = getFolder(fullPath, describeMetadata) //e.g. CustomObject

      let fileName = filePath.substr(filePath.indexOf('/') + 1)
      fileName = fileName.substr(0, fileName.lastIndexOf('.')) //e.g. Case

      if ((nestedXMLroot || pkgFolder === 'CustomLabels') && subMetadatas.has(pkgFolder)) {
        if (parts.length === 3 && (subMetadatas.get(pkgFolder).has(nestedXMLroot))) {
          let subElementName = parts[2] //e.g. myField__c
          let subpkgFolder = subMetadatas.get(pkgFolder).get(nestedXMLroot) //e.g. fields => CustomField
          if (!storyMetadata.isDeleted) {
            if (pkgFolder === 'CustomObject') {
              //because the object may contain element which are normally not deployable
              //we must add explicitely the full object so that we ensure nothing is missed
              if(!pkgBuilder.has(pkgFolder)){
                pkgBuilder.set(pkgFolder, {
                  members: new Set(),
                  name: pkgFolder
                })
              }
              pkgBuilder.get(pkgFolder).members.add(fileName)
            }
            if (!pkgBuilder.has(subpkgFolder)) {
              pkgBuilder.set(subpkgFolder, {
                members: new Set(),
                name: subpkgFolder
              }) //for the init
            }
            if (subpkgFolder === 'CustomLabel') {
              pkgBuilder.get(subpkgFolder).members.add(subElementName)
            } else {
              pkgBuilder.get(subpkgFolder).members.add(fileName + '.' + subElementName)
            }
          } else {
            if (!destructivePKGBuilder.has(subpkgFolder)) {
              destructivePKGBuilder.set(subpkgFolder, {
                members: new Set(),
                name: subpkgFolder
              }) //for the init
            }
            if (subpkgFolder === 'CustomLabel') {
              destructivePKGBuilder.get(subpkgFolder).members.add(subElementName)
            } else {
              destructivePKGBuilder.get(subpkgFolder).members.add(fileName + '.' + subElementName)
            }
          }
        }
      } else {
        //extract from the first slash until the last dot. this should work both for regular
        //metadata like apexclass as complex nested metadata like reports.
        if (!storyMetadata.isDeleted) {
          if (!pkgBuilder.has(pkgFolder)) {
            pkgBuilder.set(pkgFolder, {
              members: new Set(),
              name: pkgFolder
            }) //for the init
          }
          pkgBuilder.get(pkgFolder).members.add(fileName)
        } else {
          if (['Profile', 'PermissionSet'].indexOf(pkgFolder) === -1 ) {
            if (!destructivePKGBuilder.has(pkgFolder)) {
              destructivePKGBuilder.set(pkgFolder, {
                members: new Set(),
                name: pkgFolder
              }) //for the init
            }
            destructivePKGBuilder.get(pkgFolder).members.add(fileName)
          }
        }
      }
    }

    //building here the rest of the zip
    if (!filePathsInZip.has(filePath) && !storyMetadata.isDeleted) {
      if (nestedXMLroot) {
        if (currentFilePath !== filePath) {
          //new file
          if (currentFilePath) {
            //we are done with this file, the xml of this component has to be added to the zip
            xmlNestedCmp += '</' + folderName + '>'
            zip.file(currentFilePath, xmlNestedCmp)
          }
          currentFilePath = filePath
          folderName = getFolder(fullPath, describeMetadata)

          xmlNestedCmp = '<?xml version="1.0" encoding="UTF-8"?>\n<' + folderName + ' xmlns="http://soap.sforce.com/2006/04/metadata">\n'
        }
        xmlNestedCmp += storyMetadata.newValue + '\n'
      } else {
        filePathsInZip.add(filePath)
        if (storyMetadata.newValue) {
          zip.file(filePath, storyMetadata.newValue)
        } else {
          zip.file(filePath, storyMetadata.newValueBin, {
            base64: true
          })
        }
      }
    }
  }

  if (pkgBuilder.size) { //finalising for the package.xml
    packageXML += buildPKG(pkgBuilder)
  }
  packageXML += `    <version>${common.apiVersion}</version>\n` +
    '</Package>'
  zip.file('package.xml', packageXML)

  //finalising for the destructiveChanges.xml
  if (destructivePKGBuilder.size) {
    destructivePackageXML += buildPKG(destructivePKGBuilder)
    destructivePackageXML += '</Package>'
    zip.file('destructiveChanges.xml', destructivePackageXML)
  }

  //finalising for the zip.
  if (currentFilePath) {
    //the xml of this component has to be added to the zip
    xmlNestedCmp += '</' + folderName + '>'
    zip.file(currentFilePath, xmlNestedCmp)
    currentFilePath = null
  }
  return zip
}

function belongsToPackageXML(path) {
  return !path.endsWith('meta.xml')
}

function getFolder(path, describeMetadata) {
  let folderName = path.split('/')[0]
  if (folderName in describeMetadata) {
    folderName = describeMetadata[folderName].xmlName
  }
  return folderName
}

function buildPKG(pkgBuilder) {
  const offset = '    '

  return Array.from(pkgBuilder.entries()).sort().reduce((old, element) => {
    let ret = offset + '<types>\n'

    element[1].members.forEach((el) => {
      ret += offset.repeat(2) + '<members>' + el + '</members>\n'
    })

    ret += offset.repeat(2) + '<name>' + element[1].name + '</name>\n'
    ret += offset + '</types>\n'
    return old + ret
  }, '')
}

import xmlescape from 'xml-escape'
import Promise from 'bluebird'

export default async function buildpackage(connection, sfConn) {

  try {

    const baseFolderMetadata = {
      'EmailTemplate': 'EmailFolder',
      'Dashboard': 'DashboardFolder',
      'Report': 'ReportFolder',
      'Document': 'DocumentFolder',
      'CustomObject': 'CustomObject'
    }

    const components = connection.componenttypes

    if (connection.backupmanagedpackage) {
      //required for describing layouts for managed package.
      baseFolderMetadata.Layout = 'Layout'
    }

    let folderMetadata = components.filter((cmp) => cmp in baseFolderMetadata)

    //we will have to make a listMetadata call for describing each of the metadata
    let folderToRetrieves = [],
      folderTypesGrouped = [],
      specialMetadataMap = new Map()

    while (folderMetadata.length) {
      folderToRetrieves.push(folderMetadata.splice(0, 3)) //only 3 per call, SFDC limit.
    }
    console.log('folderToRetrieves', connection.folder, folderToRetrieves)
    for (let folderToRetrieve of folderToRetrieves) {
      //folderToRetrieve is an array of up to 3 folders.
      // Dashboard => DashboardFolder
      let folderTypes = folderToRetrieve.map((folder) => ({type: baseFolderMetadata[folder]}))

      folderTypesGrouped.push(folderTypes)
    }

    console.log('folderTypesGrouped', folderTypesGrouped)


    let listMetadataCalls = await Promise.join(...folderTypesGrouped.map( (folderTypes) => sfConn.metadata.list(folderTypes) ) )

    console.log('listMetadataCalls', listMetadataCalls)


    for (let listMetadata of listMetadataCalls) {
      for (let metadata of listMetadata) {
        if (!specialMetadataMap.has(metadata.type)) {
          specialMetadataMap.set(metadata.type, [])
        }
        //when manageableState property is not present, it's a standard object.
        if (metadata.type !== 'CustomObject' && metadata.type !== 'Layout' ||
          metadata.type === 'CustomObject' && !metadata.manageableState ||
          (metadata.manageableState === 'installed' || metadata.manageableState === 'released') && connection.backupmanagedpackage) {

          metadata.fullName = xmlescape(decodeURIComponent(metadata.fullName))
          if (metadata.type === 'Layout' && metadata.namespacePrefix) {
            //need special handle, Salesforce is forgetting to set the package name correctly...
            specialMetadataMap.get(metadata.type).push(metadata.fullName.replace('__c-', '__c-' + metadata.namespacePrefix + '__'))
          } else {
            specialMetadataMap.get(metadata.type).push(metadata.fullName)
          }
        }
      }
    }
    //for simplifying, we are replacing the key of specialMetadataMap by their non folder value
    let reverseKey = Object.keys(baseFolderMetadata).map((key) => ({
      [baseFolderMetadata[key]]: key
    }))
    reverseKey.map(function(tmp) {
      var key = Object.keys(tmp)[0] //e.g. ReportFolder
      if (specialMetadataMap.has(key) && key !== tmp[key]) {
        specialMetadataMap.set(tmp[key], specialMetadataMap.get(key))
        specialMetadataMap.delete(key)
      }
    })
    console.log('specialMetadataMap1', connection.folder, specialMetadataMap.size)
    //we have the folder of the special metadata, we now need to retrieve, eventually, the components of these folders...
    //this is only for Report, EmailTemplate, Dashboard and Document (CustomObject is ok)

    let folderTypes = []
    folderTypesGrouped = []

    specialMetadataMap.forEach(function(folders, type) {
      if (type !== 'CustomObject') { //no need to further describe for custom objects
        folders.map(function(folder) {

          folderTypes.push({
            type,
            folder
          })
          if (folderTypes.length === 3) { //3 => SFDC limitation
            folderTypesGrouped.push(folderTypes.splice(0))
          }
        })
      }
    })

    //last bits ...
    if(folderTypes.length) {
      folderTypesGrouped.push(folderTypes.splice(0))
    }

    listMetadataCalls = await Promise.join(...folderTypesGrouped.map( (folderTypes) => sfConn.metadata.list(folderTypes) ) )

    console.log('listMetadataCalls', listMetadataCalls)

    for (let listMetadata of listMetadataCalls) {
      if (!Array.isArray(listMetadata)) {
        listMetadata = [listMetadata]
      }
      for (let metadata of listMetadata) {
        metadata.fullName = xmlescape(decodeURIComponent(metadata.fullName))

        specialMetadataMap.get(metadata.type).push(metadata.fullName)
      }
    }

    console.log('final.listMetadataCalls', connection.folder)

    const packageTypes = []
    components
      .filter((cmp) => cmp !== '')
      .map((component) => {

        let packageType = {
          members: [],
          name: component
        }

        if (component in baseFolderMetadata) {
          if (specialMetadataMap.has(component)) {
            if (component === 'CustomObject' || component === 'Layout') {
              packageType.members.push('*') //required to get the custom objects non listed...
            }
            for (let obj of specialMetadataMap.get(component)) {
              packageType.members.push(obj)
            }
          }
        } else {
          packageType.members.push('*')
        }

        packageTypes.push(packageType)
      })
    return {types: packageTypes}
  } catch(e) {
    console.log('ERROR IN BUILDPACKAGE', e)
    return
  }
}

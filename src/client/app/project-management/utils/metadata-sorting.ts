//used for sorting the metadata accordingly for fancytree
export function MetadataSorting(metadatas, showIgnored, describeMetadata, showUnassigned, mapStorymetadatas) {
  console.time('MetadataSorting')
  const maxDepth = 4,
    structuredMetadatas = [],
    folder = Array(...Array(maxDepth)).map((): {
      children?: Array<any>,
      folder?: Boolean,
      title?: String,
      key?: String,
      extraClasses?: String
    } => ({}))

  function getTitle(title, index) {
    if (index === 0 && describeMetadata && (title in describeMetadata)) {
      //need to make the mapping...
      return describeMetadata[title].xmlName
    }
    return title
  }

  metadatas.filter(function(a) {
    return (showIgnored && a.isIgnored || !a.isIgnored) && (!showUnassigned || showUnassigned && !mapStorymetadatas.has(a._id))
  }).map(function(metadata) {
    let names = metadata.fullPath.replace(/\|/g, '/').split('/')
    for (let i = 0; i < names.length; i++) {
      let title = getTitle(names[i], i)
      if (!('title' in folder[i])) {
        folder[i].title = title
        if (i + 1 === names.length) {
          folder[i].key = metadata._id
          folder[i].extraClasses = metadata.status === 'Deleted' ? 'metadataDeleted' : ''
        }
      }
      if (title != folder[i].title) {
        for (let j = maxDepth - 1; j > i; j--) {
          if (folder[j] && ('title' in folder[j]) && folder[j].title.length) {
            if (!('children' in folder[j - 1])) {
              folder[j - 1].folder = true
              folder[j - 1].children = []
            }
            folder[j - 1].children.push(folder[j])
            folder[j] = {}
          }
        }
        if (i === 0) {
          structuredMetadatas.push(folder[i])
          folder[i] = {
            title: title,
            folder: true,
            children: []
          }
        } else {
          if ('title' in folder[i] && folder[i].title.length) {
            if (!('children' in folder[i - 1])) {
              folder[i - 1].folder = true
              folder[i - 1].children = []
            }
            folder[i - 1].children.push(folder[i])
          }

          folder[i] = {
            title: title
          }
          if (i + 1 === names.length) {
            //folder[i].key = getKey(metadata.fullPath, names, i)
            folder[i].key = metadata._id
            folder[i].extraClasses = metadata.status === 'Deleted' ? 'metadataDeleted' : ''
          }
        }
      }
    }
  })
  for (var j = maxDepth - 1; j > 0; j--) {
    if (folder[j] && ('title' in folder[j]) && folder[j].title.length) {
      if (!('children' in folder[j - 1])) {
        folder[j - 1].folder = true
        folder[j - 1].children = []
      }
      folder[j - 1].children.push(folder[j])
      folder[j] = {}
    }
  }
  if (Object.keys(folder[0]).length) {
    structuredMetadatas.push(folder[0])
  }
  console.timeEnd('MetadataSorting')

  return structuredMetadatas
}

import { metadataZip } from '../../../../shared/metadata-zip'

export function MetadataDownload(describeMetadata, storyMetadatas, subMetadatas) {
  var zip = metadataZip(describeMetadata, storyMetadatas, subMetadatas);

  zip.generateAsync({
    type: 'blob'
  }).then(function(zipData) {
    saveData(zipData, 'package.zip')
  })
}

function saveData(data, fileName) {
  let a = document.createElement('a')
  a.style.display = 'none'
  document.body.appendChild(a)

  let blob = new Blob([data], {type: 'application/octet-stream'}),
    url = window.URL.createObjectURL(blob)
  a.href = url
  a.download = fileName
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

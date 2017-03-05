import * as jsdiff from 'diff'

export function GitDiff(oldTxt, newTxt, isSMDeleted, metadataStatus) {
  /*global JsDiff */
  if (isSMDeleted !== (metadataStatus === 'Deleted')) {
    return isSMDeleted ? 'This metadata is not deleted anymore' : 'This metadata is now deleted'
  }
  let diff = jsdiff.diffLines(oldTxt, newTxt)

  let fragment:any = document.createElement('pre')

  for (var i = 0; i < diff.length; i++) {
    if (diff[i].added && diff[i + 1] && diff[i + 1].removed) {
      let swap = diff[i]
      diff[i] = diff[i + 1]
      diff[i + 1] = swap
    }

    let node
    if (diff[i].removed) {
      node = document.createElement('del');
      node.append(document.createTextNode(diff[i].value));
    } else if (diff[i].added) {
      node = document.createElement('ins')
      node.append(document.createTextNode(diff[i].value))
    } else {
      node = document.createTextNode(diff[i].value)
    }
    fragment.append(node)
  }
  let final:any = document.createElement('div')
  final.append(fragment)
  return final
}

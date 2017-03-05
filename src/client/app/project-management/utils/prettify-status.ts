/**
 * Used to format the number of record processed, coming back from Mongo
 */

export function PrettifyStatus(result) {
  let out = ''
  let upserted = result.nInserted + result.nModified + result.nUpserted
  let removed = result.nRemoved
  let errors = result.writeErrors
  if (upserted > 0) {
    out += `${upserted} record${upserted > 1 ? 's' : ''} ${result.nInserted + result.nUpserted === 0 ? ' modified' : result.nModified === 0 ? ' inserted' : ' upserted'} successfully. `
  }
  if (removed > 0) {
    out += `${removed} record${removed > 1 ? 's' : ''} removed successfully. `
  }
  if (errors.length) {
    out += `${errors.length} error ${errors.length > 1 ? 's' : ''}. First error message: ${errors[0].errmsg}`
  }
  if (out === '') {
    out = 'Nothing processed'
  }
  return out
}

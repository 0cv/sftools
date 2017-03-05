import { deployMetadataToSalesforce } from '../modules/deployments/controller'
import { Storymetadata, Validation } from '../models'
import Promise from 'bluebird'
import { getHeaderMetadata, metadata, sendMail } from '../utils'
const metadataZip = require('../../metadata-zip').metadataZip

export async function storiesValidation() {
  let now = new Date()
  let yesterday = new Date(now - 24 * 60 * 60 * 1000)

  let validations = await Validation.find({
    $or: [{
      status: {
        $ne: 'Validating'
      }
    }, {
      latestValidationTime: {
        $lt: yesterday
      }
    }]
  }).populate('release story target')

  const listMetadataTmp = await getHeaderMetadata(null, validations.map(validation => validation.target))

  let describeMetadata = {}
  if(listMetadataTmp) {
    for(let connectionId of Object.keys(listMetadataTmp)) {
      let headerMetadata = listMetadataTmp[connectionId]

      for (let metadata of headerMetadata) {
        describeMetadata[metadata.directoryName] = metadata
      }
    }
  }

  validations = validations.filter((validation) => {
    if (validation.latestValidationTime || validation.frequency && validation.frequency !== 'asap') {
      let minutesElapsed = (now - validation.latestValidationTime) / 1000 / 60
      let intervalInHours = parseFloat(validation.frequency.replace('h', ''))
      if (minutesElapsed < intervalInHours * 60) {
        return false
      }
    }
    return validation.target && (validation.story || validation.release)
  })

  await Promise.all(validations.map(async (validation) => {
    try {
      //console.log('validation', validation)
      validation.status = 'Validating'
      await validation.save()
      if (!validation.target || !validation.target.folder) {
        //no valid target
        return
      }
      let storyIds
      if (validation.release) {
        storyIds = validation.release.stories
      } else {
        storyIds = [validation.story]
      }
      if (!storyIds || !storyIds.length) {
        //no stories to process
        return
      }

      let storyMetadatas = await getMetadataAndValidate(validation, storyIds, describeMetadata)

      let subMetadatas = {
        CustomObject: metadata.customObjectMetadata,
        SharingRules: metadata.sharingRulesMetadata,
        Workflow: metadata.workflowMetadata
      }
      let zip = metadataZip(describeMetadata, storyMetadatas, subMetadatas)
      zip = await zip.generateAsync({
        type: 'base64'
      })

      const result = await deployMetadataToSalesforce(
        zip,
        null,
        {
          checkOnly: true,
          testLevel: validation.testLevel,
          rollbackOnError: true,
          targetId: validation.target
        }
      )

      return await parseResult(validation, result)
    } catch(e) {
      console.error('error in validations', e)
    } finally {
      validation.status = 'Waiting'
      await validation.save()
      return null
    }
  }))

  console.log('Stories Validation Done')
}

function getMetadataAndValidate(validation, storyIds) {
  return new Promise(function(resolve, reject) {
    console.log('validation....')

    if (!validation.target || !validation.target.accesstoken) {
      return
    }

    let storyMetadataStream, storyMetadatas = []
    storyMetadataStream = Storymetadata.find({
      story: {
        $in: storyIds
      }
    }).sort({
      fullPath: 1
    }).lean().batchSize(10000).cursor()
    storyMetadataStream.on('data', (data) => {
      //console.log('data...', data)
      storyMetadatas.push(data)
    })
    storyMetadataStream.on('error', (err) => {
      console.error('error get story metadatas', err)
      reject(err)
    })
    storyMetadataStream.on('end', () => {
      console.log('storyMetadatas.length', storyMetadatas.length)
      resolve(storyMetadatas)
    })
  })
  .catch(e => console.error('error in validations.getMetadataAndValidate', e))
}

async function parseResult(validation, log) {
  let body = '<h1 style="margin-bottom: 5px;">Summary</h1>'
  log.numberComponentErrors = parseInt(log.numberComponentErrors)
  body += '<span style="font-weight:bold;color:black;"><span style="color:' + (log.numberComponentErrors === 0 ? 'green' : 'red') + '">' + log.numberComponentErrors + '</span> component errors out of a total of ' + log.numberComponentsTotal + ' components.</span><br/>'
  if (parseInt(log.numberTestsTotal) > 0) {
    log.numberTestErrors = parseInt(log.numberTestErrors)
    body += '<span style="font-weight:bold;color:black;"><span style="color:' + (log.numberTestErrors === 0 ? 'green' : 'red') + '">' + log.numberTestErrors + '</span> test errors out of a total of ' + log.numberTestsTotal + ' unit tests.</span><br/>'
  } else if (parseInt(log.numberTestsTotal) === 0 && log.numberComponentErrors > 0) {
    body += '<span style="font-weight:bold;color:black;">Tests could not be run due to component failures.</span><br/>'
  }
  if (log.details.runTestResult && log.details.runTestResult.codeCoverageWarnings) {
    body += '<span style="font-weight:bold;color:black;">' + log.details.runTestResult.codeCoverageWarnings.message + '</span><br/>'
  }
  if (log.details.componentFailures) {
    body += '<h1 style="margin-bottom: 5px;">Component Failures</h1>'
    body += '<table style="border-collapse: collapse; width:100%;">' +
      '<thead>' +
      '<tr>' +
      '<th style="width: 200px; text-align: left; ">Type</th>' +
      '<th style="text-align: left;">Name</th>' +
      '<th style="text-align: left;">Error</th>' +
      '<th style="width: 100px; text-align: left; ">Line & Column</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>'
    let failures = log.details.componentFailures
    if (!Array.isArray(failures)) {
      failures = [failures]
    }
    for (let failure of failures) {
      body += '<tr style="vertical-align:top;">' +
        '<td>' + failure.componentType + '</td>' +
        '<td>' + failure.fullName + '</td>' +
        '<td>' + failure.problem + '</td>' +
        '<td>' + (failure.lineNumber ? failure.lineNumber + ' & ' + failure.columnNumber : '') + '</td>' +
        '</tr>'
    }
    body += '</tbody></table>'
  }

  if (log.details.runTestResult && log.details.runTestResult.failures) {
    body += '<h1 style="margin-bottom: 5px;">Unit Test Failures</h1>'
    body += '<table style="border-collapse: collapse; width:100%;">' +
      '<thead>' +
      '<tr>' +
      '<th style="text-align: left;">Component</th>' +
      '<th style="text-align: left;">Method Name</th>' +
      '<th style="text-align: left">Error</th>' +
      '<th style="text-align: left">Stack Trace</th>' +
      '<th style="width:70px; text-align: left">Type</th>' +
      '<th style="width:100px; text-align: left">Execution Time</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>'
    let failures = log.details.runTestResult.failures
    if(!Array.isArray(failures)) {
      failures = [failures]
    }

    for (let failure of failures) {
      body += '<tr style="vertical-align:top;">' +
        '<td>' + failure.name + '</td>' +
        '<td>' + (failure.methodName ? failure.methodName : '') + '</td>' +
        '<td>' + failure.message + '</td>' +
        '<td>' + (typeof failure.stackTrace === 'string' ? failure.stackTrace : '') + '</td>' +
        '<td>' + failure.type + '</td>' +
        '<td>' + parseFloat(failure.time) / 1000 + 's</td>' +
        '</tr>'
    }
    body += '</tbody></table>'
  }

  await Validation.findOneAndUpdate({
    '_id': validation._id
  }, {
    'log': body,
    'latestOutcome': log.status, //Failed|Succeeded|SucceededPartial|Canceled
    'latestValidationTime': new Date(),
    'status': 'Waiting'
  }).exec()

  if (validation.emails) {
    let subject = 'Validation of ' + (validation.release ? validation.release.name : validation.story.name) + ' against ' + validation.target.orgname + ', OrgId: ' + validation.target.sforgid + ' (' + validation.target.instanceurl.replace('https://', '').split('.')[0] + ')'

    try {
      await sendMail({
        to: validation.emails.split(','),
        subject,
        type: 'text/html',
        text: body
      })
    } catch(e) {
      console.error('Error Sending Mail==>', e.response.body )
    }
  }
}

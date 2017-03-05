import { jsforce, sendMail } from '../utils'
import { Connection } from '../models'
import Promise from 'bluebird'
const _needle = require('needle')
const needle = Promise.promisifyAll(require('needle-retries')(_needle))

export async function unitTest() {
  console.log('unitTest started')

  try {
    let sixhoursago = new Date(new Date() - 6 * 60 * 60 * 1000)
    let connections = await Connection.find({
      isrunningunittests: true,
      unittestsrecipients: { $ne: null },
      $or: [{
        'status': {
          '$ne': 'Validating'
        }
      }, {
        'unittestlastrun': {
          '$lt': sixhoursago
        }
      }]
    })

    const now = new Date()
    let currentHour = new Date().getHours()
    connections = connections.filter(function(connection) {
      return (!connection.unittestsstart || connection.unittestsstart <= currentHour) &&
        (!connection.unittestsend || connection.unittestsend >= currentHour) &&
        (
          !connection.unittestfrequencyrun ||
          connection.unittestfrequencyrun === 'ASAP' ||
          connection.unittestfrequencyrun === '1h' && (now - new Date(connection.unittestlastrun)) > 1000 * 60 * 60 ||
          connection.unittestfrequencyrun === '6h' && (now - new Date(connection.unittestlastrun)) > 1000 * 60 * 60 * 6 ||
          connection.unittestfrequencyrun === '24h' && (now - new Date(connection.unittestlastrun)) > 1000 * 60 * 60 * 24
        )
    })

    await Promise.all(connections.map((conn) => startUnitTests(conn)))

    console.log('unitTest finished')

  } catch(e) {
    console.error('Unit Test Exception', e)
  }
}

//this function starts the unit tests and send the request to Salesforce.
async function startUnitTests(conn) {
  try {
    const sfConn = jsforce(conn)

    conn.status = 'Validating'
    conn = await conn.save()

    //we try to query only test classes for async testing based on naming convention
    //for sync testing, it's not relevant, salesforce extract itself the right Unit Tests
    //it means also with sync testing, if the naming convention is wrong we can still execute the tests.
    let query = 'Select Id, Name from ApexClass where NamespacePrefix=null'

    if (conn.isunittestasync) {
      query += ' and (Name LIKE \'%test\' or Name like \'test%\')'
    }

    let apexClasses
    try {
      apexClasses = await sfConn.query(query)
    } catch(e) {
      console.error('Error fetching query', e)
      sfConn._destroy()
      return
    }

    if (apexClasses.records.length === 0) {
      throw new Error('Aborted because of no class to test')
    }

    let body

    if(conn.isunittestasync) {
      body = await asyncTesting(apexClasses, conn, sfConn)
    } else {
      body = await syncTesting(apexClasses, conn, sfConn)
    }

    //the connection is not needed anymore, we can safely destroy it and its listeners.
    sfConn._destroy()

    if(!body) {
      return
    }

    let subject = 'Unit Test Results of ' + conn.orgname + ', OrgId: ' + conn.sforgid + ' (' + conn.instanceurl.replace('https://', '').split('.')[0] + ')'

    console.log('body', conn.unittestsrecipients, subject)

    try {
      await sendMail({
        to: conn.unittestsrecipients.split(','),
        subject,
        type: 'text/html',
        text: body
      })
    } catch(e) {
      console.error('Error Sending Mail==>', e.response.body )
    }

    conn.status = 'Waiting'
    conn.unittestlastrun = new Date()
    await conn.save()
  } catch(e) {
    console.error('startUnitTests Error =>', e)
  }
}

//To execute testing synchronously
async function syncTesting(apexClasses, conn, sfConn) {
  const slackMessage = {}
  const params = {
    allTests: false,
    classes: [
      apexClasses.records.map((apexClass) => apexClass.Name)
    ]
  }
  const testResult = await sfConn.apexsoap.runTests(params)

  //we extract and send the result. And we start again.
  let body = '<h1 style="margin-bottom: 5px;">Summary</h1>'

  //calculate overall code coverage
  let numLocationsNotCovered = 0, numLocations = 0
  if (testResult.codeCoverage) {
    for (let j = testResult.codeCoverage.length - 1; j >= 0; j--) {
      numLocationsNotCovered += parseFloat(testResult.codeCoverage[j].numLocationsNotCovered)
      numLocations += parseFloat(testResult.codeCoverage[j].numLocations)
    }
  }
  let overallCoverage = numLocations === 0 ? 100 : ((numLocations - numLocationsNotCovered) / numLocations * 100).toFixed(2)

  body += '<span style="font-weight:bold;color:black;">Average test coverage across all Apex Classes and Triggers is <span style="color:' + (overallCoverage < 75 ? 'red' : overallCoverage < 85 ? 'orange' : 'green') + '">' + overallCoverage + '%</span></span><br/>'
  body += '<span style="font-weight:bold;color:black;">Number of Failures: <span style="color:' + (testResult.numFailures === 0 ? 'green' : 'red') + '">' + testResult.numFailures + '</span></span><br/>'
  body += '<span style="font-weight:bold;color:black;">Number of Tests run: ' + testResult.numTestsRun + '</span><br/>'
  body += '<span style="font-weight:bold;color:black;">Total Execution Time: ' + parseFloat(testResult.totalTime) / 1000 + ' seconds</span><br/>'

  slackMessage.text = `Average test coverage across all Apex Classes and Triggers is *${overallCoverage}*%\n`+
                        `Number of Failures: *${testResult.numFailures}*\n`+
                        `Number of Tests run: *${testResult.numTestsRun}*\n` +
                        `Total Execution Time: *${parseFloat(testResult.totalTime) / 1000}* seconds\n`

  body += '<h1 style="margin-bottom: 5px;">Failures</h1>'
  body += '<table style="border-collapse: collapse; width:100%;">' +
    '<thead>' +
    '<tr>' +
    '<th style="text-align: left">Component</th>' +
    '<th style="text-align: left">Method Name</th>' +
    '<th style="text-align: left">Error</th>' +
    '<th style="text-align: left">Stack Trace</th>' +
    '<th style="text-align: left">Execution Time</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>'

  if (testResult.failures) {
    slackMessage.failures = []
    console.log('first test failure', JSON.stringify(testResult.failures[0].methodName))
    for (let j = testResult.failures.length - 1; j >= 0; j--) {
      body += '<tr style="vertical-align:top;">' +
        '<td style="background-color: red;">' + testResult.failures[j].name + '</td>' +
        '<td>' + (typeof testResult.failures[j].methodName === 'string' ? testResult.failures[j].methodName : '') + '</td>' +
        '<td>' + testResult.failures[j].message + '</td>' +
        '<td>' + (typeof testResult.failures[j].stackTrace === 'string' ? testResult.failures[j].stackTrace : '') + '</td>' +
        '<td>' + parseFloat(testResult.failures[j].time) / 1000 + 's</td>' +
        '</tr>'

      slackMessage.failures.push({
        component: `${testResult.failures[j].name}.${typeof testResult.failures[j].methodName === 'string' ? testResult.failures[j].methodName : ''}`,
        message: `${testResult.failures[j].message}${typeof testResult.failures[j].stackTrace === 'string' ? '\n-------------\n' +testResult.failures[j].stackTrace : ''}`
      })
    }
  }

  body += '</tbody></table>'
  body += '<h1 style="margin-bottom: 5px;">Success</h1>'
  body += '<table style="border-collapse: collapse; width:100%;">' +
    '<thead>' +
    '<tr>' +
    '<th style="text-align: left">Component</th>' +
    '<th style="text-align: left">Method Name</th>' +
    '<th style="text-align: left">Execution Time</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>'

  if (testResult.successes) {
    for (let j = testResult.successes.length - 1; j >= 0; j--) {
      body += '<tr style="vertical-align:top;">' +
        '<td style="background-color: green;">' + testResult.successes[j].name + '</td>' +
        '<td>' + testResult.successes[j].methodName + '</td>' +
        '<td>' + parseFloat(testResult.successes[j].time) / 1000 + 's</td>' +
        '</tr>'
    }
  }
  body += '</tbody></table>'

  body += '<h1 style="margin-bottom: 5px;">Code Coverage</h1>'
  body += '<table style="border-collapse: collapse; width:100%;">' +
    '<thead>' +
    '<tr>' +
    '<th style="text-align: left">Component</th>' +
    '<th style="text-align: left">Type</th>' +
    '<th style="text-align: left">Coverage</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>'

  if (testResult.codeCoverage) {
    slackMessage.codeCoverage = []
    for (let j = testResult.codeCoverage.length - 1; j >= 0; j--) {
      const notCovered = parseFloat(testResult.codeCoverage[j].numLocationsNotCovered)
      const locations = parseFloat(testResult.codeCoverage[j].numLocations)
      testResult.codeCoverage[j].coverage = locations === 0 ? 100 : ((locations - notCovered) / locations * 100).toFixed(0)
    }
    //we sort ASC the coverage.
    testResult.codeCoverage.sort((a, b) => b.coverage - a.coverage)

    for (let j = testResult.codeCoverage.length - 1; j >= 0; j--) {
      let coverage = testResult.codeCoverage[j].coverage;
      body += '<tr style="vertical-align:top;">' +
        '<td>' + testResult.codeCoverage[j].name + '</td>' +
        '<td>' + testResult.codeCoverage[j].type + '</td>' +
        '<td style="color:' + (coverage < 75 ? 'red' : coverage < 85 ? 'orange' : 'green') + '">' + coverage + '%</td>' +
        '</tr>'
      slackMessage.codeCoverage.push({
        component:`${testResult.codeCoverage[j].name}.${testResult.codeCoverage[j].type}`,
        message: coverage
      })
    }
  }
  body += '</tbody></table>'

  if(conn.slackwebhook) {
    await sendResultToSlackChannel(slackMessage, conn.slackwebhook)
  }

  return body
}

//To execute testing asynchronously
async function asyncTesting(apexClasses, conn, sfConn) {
  const slackMessage = {}
  let asyncApexJobId
  try {
    asyncApexJobId = await sfConn.tooling.runTestsAsynchronous(apexClasses.records.map((apexClass) => apexClass.Id))
  } catch(e) {
    console.log('sfConn.tooling.runTestsAsynchronous', e)
    return
  }

  console.log('asyncApexJobId:', asyncApexJobId)

  let asyncApexJobQuery = 'SELECT Id, Status FROM AsyncApexJob where id = \'' + asyncApexJobId + '\''

  //we do this recursive loop as long as the status is not 'Completed'
  let start = async function() {
    const asyncApexJob = await sfConn.query(asyncApexJobQuery)

    let isDone = !asyncApexJob.records.some((record) => {
      return record.Status !== 'Completed' &&
              record.Status !== 'Failed' &&
              record.Status !== 'Aborted'
    })

    if (!isDone) {
      console.info('redoing...')
      return Promise.delay(10000).then(start)
    } else {
      return
    }
  }
  await start()

  let urlApexResult = 'SELECT ApexClass.Name,Message,MethodName,Outcome,StackTrace FROM ApexTestResult where AsyncApexJobId = \'' + asyncApexJobId + '\''
  let urlAllClassCovered = 'SELECT ApexClassOrTriggerId, ApexClassOrTrigger.Name, NumLinesCovered,NumLinesUncovered FROM ApexCodeCoverageAggregate WHERE ApexClassOrTriggerId IN (Select Id FROM ApexClass where namespaceprefix = null)'
  let urlAllTriggerCovered = 'SELECT ApexClassOrTriggerId, ApexClassOrTrigger.Name, NumLinesCovered,NumLinesUncovered FROM ApexCodeCoverageAggregate WHERE ApexClassOrTriggerId IN (Select Id FROM ApexTrigger where namespaceprefix = null)'
  let urlAllNonTestClass = 'Select Id, Name FROM ApexClass where namespaceprefix=null and (NOT Name LIKE \'%test\') AND (NOT Name like \'test%\')'
  let urlAllTrigger = 'Select Id, Name FROM ApexTrigger where namespaceprefix=null'

  const apexTestResult = await sfConn.tooling.query(urlApexResult)
  const allClassCovered = await sfConn.tooling.query(urlAllClassCovered)
  const allTriggerCovered = await sfConn.tooling.query(urlAllTriggerCovered)
  const allNonTestClass = await sfConn.tooling.query(urlAllNonTestClass)
  const allTrigger = await sfConn.tooling.query(urlAllTrigger)

  //we extract and send the result. And we start again.
  let body = '<h1 style="margin-bottom: 5px;">Summary</h1>'

  let numLinesUncovered = 0,
    numLinesCovered = 0
  if (allClassCovered.records) {
    for (let j = allClassCovered.records.length - 1; j >= 0; j--) {
      numLinesUncovered += allClassCovered.records[j].NumLinesUncovered
      numLinesCovered += allClassCovered.records[j].NumLinesCovered
    }
  }
  if (allTriggerCovered.records) {
    for (let j = allTriggerCovered.records.length - 1; j >= 0; j--) {
      numLinesUncovered += allTriggerCovered.records[j].NumLinesUncovered
      numLinesCovered += allTriggerCovered.records[j].NumLinesCovered
    }
  }
  let overallCoverage = ((numLinesUncovered + numLinesCovered) === 0 ? 100 : (numLinesCovered / (numLinesUncovered + numLinesCovered) * 100)).toFixed(2)

  let nbFailures = 0
  if (apexTestResult.records) {
    for (let j = apexTestResult.records.length - 1; j >= 0; j--) {
      if (apexTestResult.records[j].Outcome !== 'Pass') {
        nbFailures++
      }
    }
  }

  body += '<span style="font-weight:bold;color:black;">Average test coverage across all Apex Classes and Triggers is <span style="color:' + (overallCoverage < 75 ? 'red' : overallCoverage < 85 ? 'orange' : 'green') + '">' + overallCoverage + '%</span></span><br/>'
  body += '<span style="font-weight:bold;color:black;">Number of Failures: <span style="color:' + (nbFailures === 0 ? 'green' : 'red') + '">' + nbFailures + '</span></span><br/>'
  body += '<span style="font-weight:bold;color:black;">Number of Tests run: ' + apexTestResult.records.length + '</span><br/>'

  slackMessage.text = `Average test coverage across all Apex Classes and Triggers is *${overallCoverage}*%\n`+
                        `Number of Failures: *${nbFailures}*\n`+
                        `Number of Tests run: *${apexTestResult.records.length}*\n`

  body += '<h1 style="margin-bottom: 5px;">Failures</h1>'
  body += '<table style="border-collapse: collapse; width:100%;">' +
    '<thead>' +
    '<tr>' +
    '<th style="text-align: left">Component</th>' +
    '<th style="text-align: left">Method Name</th>' +
    '<th style="text-align: left">Error</th>' +
    '<th style="text-align: left">Stack Trace</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>'

  for (let j = apexTestResult.records.length - 1; j >= 0; j--) {
    slackMessage.failures = []
    const test = apexTestResult.records[j]
    if (test.Outcome !== 'Pass') {
      body += '<tr style="vertical-align:top;">' +
        '<td style="background-color: red;">' + test.ApexClass.Name + '</td>' +
        '<td>' + test.MethodName + '</td>' +
        '<td>' + test.Message + '</td>' +
        '<td>' + (test.StackTrace ? test.StackTrace : '') + '</td>' +
        '</tr>'
      slackMessage.failures.push({
        component: `${test.ApexClass.Name}.${test.MethodName}`,
        message: `${test.Message}${test.StackTrace ? '\n-------------\n' + test.StackTrace : ''}`
      })
    }
  }
  body += '</tbody></table>'

  body += '<h1 style="margin-bottom: 5px;">Success</h1>'
  body += '<table style="border-collapse: collapse; width:100%;">' +
    '<thead>' +
    '<tr>' +
    '<th style="text-align: left">Component</th>' +
    '<th style="text-align: left">Method Name</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>'

  for (let j = apexTestResult.records.length - 1; j >= 0; j--) {
    if (apexTestResult.records[j].Outcome === 'Pass') {
      body += '<tr style="vertical-align:top;">' +
        '<td style="background-color: green;">' + apexTestResult.records[j].ApexClass.Name + '</td>' +
        '<td>' + apexTestResult.records[j].MethodName + '</td>' +
        '</tr>'
    }
  }
  body += '</tbody></table>'

  body += '<h1 style="margin-bottom: 5px;">Code Coverage</h1>'
  body += '<table style="border-collapse: collapse; width:100%;">' +
    '<thead>' +
    '<tr>' +
    '<th style="text-align: left">Component</th>' +
    '<th style="text-align: left">Type</th>' +
    '<th style="text-align: left">Coverage</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>'

  let coverageComps = []
  if (allClassCovered.records) {
    for (let j = allClassCovered.records.length - 1; j >= 0; j--) {
      numLinesUncovered = allClassCovered.records[j].NumLinesUncovered
      numLinesCovered = allClassCovered.records[j].NumLinesCovered
      allClassCovered.records[j].coverage = ((numLinesCovered + numLinesUncovered) === 0 ? 100 : (numLinesCovered / (numLinesCovered + numLinesUncovered) * 100)).toFixed(2)
      allClassCovered.records[j].type = 'Class'
      allClassCovered.records[j].Name = allClassCovered.records[j].ApexClassOrTrigger.Name
      coverageComps.push(allClassCovered.records[j])
    }
  }
  if (allTriggerCovered.records) {
    for (let j = allTriggerCovered.records.length - 1; j >= 0; j--) {
      numLinesUncovered = allTriggerCovered.records[j].NumLinesUncovered
      numLinesCovered = allTriggerCovered.records[j].NumLinesCovered
      allTriggerCovered.records[j].coverage = ((numLinesCovered + numLinesUncovered) === 0 ? 100 : (numLinesCovered / (numLinesCovered + numLinesUncovered) * 100)).toFixed(2)
      allTriggerCovered.records[j].type = 'Trigger'
      allTriggerCovered.records[j].Name = allTriggerCovered.records[j].ApexClassOrTrigger.Name
      coverageComps.push(allTriggerCovered.records[j])
    }
  }

  //we find the classes and triggers which have not been reported in the coverage, but should be
  //This cases may happen for classes and triggers which have not been covered at all
  //we substract from all classes (allNonTestClass) all Apex Test Classes (from allApexTests).
  //From the remaining list, we add to coverageComps all components which are still not added
  let nonUnitTestComps = []
  for (let i = allNonTestClass.records.length - 1; i >= 0; i--) {
    allNonTestClass.records[i].type = 'Class'
    allNonTestClass.records[i].coverage = (0).toFixed(2)
    nonUnitTestComps.push(allNonTestClass.records[i])
  }
  //we add all triggers
  for (let i = allTrigger.records.length - 1; i >= 0; i--) {
    allTrigger.records[i].type = 'Trigger'
    allTrigger.records[i].coverage = (0).toFixed(2)
    nonUnitTestComps.push(allTrigger.records[i])
  }

  //now we add only the nonUnitTestComps if it doesn't exist in coverageComps
  for (let i = nonUnitTestComps.length - 1; i >= 0; i--) {
    let isFound = false
    for (let j = coverageComps.length - 1; j >= 0; j--) {
      if (coverageComps[j].ApexClassOrTriggerId === nonUnitTestComps[i].Id) {
        isFound = true
      }
    }
    if (!isFound) {
      coverageComps.push(nonUnitTestComps[i])
    }
  }

  if (coverageComps.length) {
    slackMessage.codeCoverage = []

    //we sort ASC the coverage.
    coverageComps.sort(function(a, b) {
      return b.coverage - a.coverage
    })
    for (let j = coverageComps.length - 1; j >= 0; j--) {
      let coverage = coverageComps[j].coverage
      body += '<tr style="vertical-align:top;">' +
        '<td>' + coverageComps[j].Name + '</td>' +
        '<td>' + coverageComps[j].type + '</td>' +
        '<td style="color:' + (coverage < 75 ? 'red' : coverage < 85 ? 'orange' : 'green') + '">' + coverage + '%</td>' +
        '</tr>'

      slackMessage.codeCoverage.push({
        component:`${coverageComps[j].Name}.${coverageComps[j].type}`,
        message: coverage
      })
    }
  }
  body += '</tbody></table>'

  if(conn.slackwebhook) {
    await sendResultToSlackChannel(slackMessage, conn.slackwebhook)
  }

  return body
}

async function sendResultToSlackChannel(slackMessage, slackwebhook) {
  const post_options = {
    headers: {
      'Content-Type': 'application/json'
    },
    json: true
  }

  const post_data = {
    text: slackMessage.text,
    attachments: []
  }

  if(slackMessage.failures) {
    const attachment = {
      color: 'danger',
      title: 'Failures'
    }

    attachment.fields = [{
      title: 'Component',
      short: true
    }, {
      title: 'Error',
      short: true
    }]

    for(let failure of slackMessage.failures) {
      attachment.fields.push({
        value: failure.component,
        short: true
      })
      attachment.fields.push({
        value: failure.message,
        short: true
      })
    }

    post_data.attachments.push(attachment)
  }

  if(slackMessage.codeCoverage) {
    //Code Coverage Danger
    let attachment = {
      color: 'danger',
      title: 'Code Coverage'
    }

    attachment.fields = [{
      title: 'Component',
      short: true
    }, {
      title: 'Coverage',
      short: true
    }]

    for(let failure of slackMessage.codeCoverage) {
      if(failure.message < 75) {
        attachment.fields.push({
          value: failure.component,
          short: true
        })
        attachment.fields.push({
          value: failure.message + '%',
          short: true
        })
      }
    }

    post_data.attachments.push(attachment)

    //Code Coverage Warnings
    attachment = {color: 'warning', fields: []}

    for(let failure of slackMessage.codeCoverage) {
      if(failure.message >= 75 && failure.message < 85) {
        attachment.fields.push({
          value: failure.component,
          short: true
        })
        attachment.fields.push({
          value: failure.message + '%',
          short: true
        })
      }
    }

    post_data.attachments.push(attachment)

    //Good Code Coverage
    attachment = {color: 'good', fields: []}

    for(let failure of slackMessage.codeCoverage) {
      if(failure.message >= 85) {
        attachment.fields.push({
          value: failure.component,
          short: true
        })
        attachment.fields.push({
          value: failure.message + '%',
          short: true
        })
      }
    }

    post_data.attachments.push(attachment)
  }

  return await needle.postAsync(slackwebhook, post_data, post_options)
}

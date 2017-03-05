const customObjectMetadata = [{
  key: 'businessProcesses',
  val: 'BusinessProcess'
}, {
  key: 'compactLayouts',
  val: 'CompactLayout'
}, {
  key: 'fields',
  val: 'CustomField'
}, {
  key: 'fieldSets',
  val: 'FieldSet'
}, {
  key: 'listViews',
  val: 'ListView'
}, {
  key: 'recordTypes',
  val: 'RecordType'
}, {
  key: 'sharingReasons',
  val: 'SharingReason'
}, {
  key: 'validationRules',
  val: 'ValidationRule'
}, {
  key: 'webLinks',
  val: 'WebLink'
}]

const folderMetadata = {
  EmailTemplate: 'EmailFolder',
  Dashboard: 'DashboardFolder',
  Report: 'ReportFolder',
  Document: 'DocumentFolder',
  CustomObject: 'CustomObject',
  Workflow: 'Workflow'
}

const sharingRulesMetadata = [{
  key: 'sharingOwnerRules',
  val: 'SharingOwnerRule'
}, {
  key: 'sharingCriteriaRules',
  val: 'SharingCriteriaRule'
}]

const workflowMetadata = [{
  key: 'alerts',
  val: 'WorkflowAlert'
}, {
  key: 'fieldUpdates',
  val: 'WorkflowFieldUpdate'
}, {
  key: 'flowActions',
  val: 'WorkflowFlowAction'
}, {
  key: 'knowledgePublishes',
  val: 'WorkflowKnowledgePublish'
}, {
  key: 'outboundMessages',
  val: 'WorkflowOutboundMessage'
}, {
  key: 'rules',
  val: 'WorkflowRule'
}, {
  key: 'send',
  val: 'WorkflowSend'
}, {
  key: 'tasks',
  val: 'WorkflowTask'
}]

export const metadata = {
  customObjectMetadata,
  folderMetadata,
  sharingRulesMetadata,
  workflowMetadata
}

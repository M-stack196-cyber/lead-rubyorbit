const visualSchemaVersion = 'visual-workflow-v1'
const visualOnlyMode = 'visual-only'
const validStatuses = new Set(['Passed', 'Warning', 'Error'])

function createHttpError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function createCheck(id, status, title, message) {
  return { id, status, title, message }
}

function getOverallStatus(checks) {
  if (checks.some((check) => check.status === 'Error')) return 'Error'
  if (checks.some((check) => check.status === 'Warning')) return 'Warning'
  return 'Passed'
}

function getSubmittedSchema(payload = {}) {
  if (!isPlainObject(payload)) {
    throw createHttpError('Workflow schema request body must be a JSON object.')
  }

  const schema = Object.prototype.hasOwnProperty.call(payload, 'schema') ? payload.schema : payload

  if (!isPlainObject(schema)) {
    throw createHttpError('Workflow schema must be a JSON object.')
  }

  return schema
}

function getSummary(nodes, edges) {
  const mappedBlocks = nodes.filter((node) => !hasMappingIssue(node)).length

  return {
    nodes: nodes.length,
    edges: edges.length,
    triggers: nodes.filter((node) => node.type === 'trigger').length,
    actions: nodes.filter((node) => node.type === 'action').length,
    waits: nodes.filter((node) => node.type === 'wait').length,
    conditions: nodes.filter((node) => node.type === 'condition').length,
    mappedBlocks,
    unmappedBlocks: nodes.length - mappedBlocks,
  }
}

function hasMappingIssue(node) {
  return (
    !node?.typeKey ||
    !node?.module ||
    !node?.operation ||
    node.typeKey.includes('.unknown') ||
    node.module === 'unknown' ||
    node.operation === 'unknown' ||
    node.safety !== visualOnlyMode ||
    node.executionEnabled !== false
  )
}

function getNodeIdentityIssues(nodes) {
  return nodes.filter((node) => (
    !isPlainObject(node) ||
    !node.id ||
    !node.type ||
    !node.label ||
    !node.typeKey
  ))
}

function getEdgeIdentityIssues(edges) {
  return edges.filter((edge) => (
    !isPlainObject(edge) ||
    !edge.id ||
    !edge.source ||
    !edge.target
  ))
}

export function validateWorkflowSchemaPayload(payload = {}) {
  const schema = getSubmittedSchema(payload)
  const nodes = Array.isArray(schema.nodes) ? schema.nodes : []
  const edges = Array.isArray(schema.edges) ? schema.edges : []
  const checks = []

  checks.push(createCheck(
    'schema-version',
    schema.schemaVersion === visualSchemaVersion ? 'Passed' : 'Error',
    'Visual schema version',
    schema.schemaVersion === visualSchemaVersion
      ? 'Schema version is visual-workflow-v1.'
      : 'schemaVersion must be visual-workflow-v1.',
  ))

  checks.push(createCheck(
    'visual-only-mode',
    schema.mode === visualOnlyMode ? 'Passed' : 'Error',
    'Visual-only mode',
    schema.mode === visualOnlyMode ? 'Workflow mode is visual-only.' : 'mode must be visual-only.',
  ))

  checks.push(createCheck(
    'schema-execution-disabled',
    schema.executionEnabled === false ? 'Passed' : 'Error',
    'Schema execution disabled',
    schema.executionEnabled === false
      ? 'Schema executionEnabled is false.'
      : 'executionEnabled must be false for visual workflow schemas.',
  ))

  checks.push(createCheck(
    'schema-safety',
    schema.safety === visualOnlyMode ? 'Passed' : 'Error',
    'Schema safety marker',
    schema.safety === visualOnlyMode ? 'Schema safety is visual-only.' : 'safety must be visual-only.',
  ))

  checks.push(createCheck(
    'nodes-array',
    Array.isArray(schema.nodes) ? 'Passed' : 'Error',
    'Nodes array',
    Array.isArray(schema.nodes) ? 'nodes is an array.' : 'nodes must be an array.',
  ))

  checks.push(createCheck(
    'edges-array',
    Array.isArray(schema.edges) ? 'Passed' : 'Error',
    'Edges array',
    Array.isArray(schema.edges) ? 'edges is an array.' : 'edges must be an array.',
  ))

  const nodeIdentityIssues = getNodeIdentityIssues(nodes)
  checks.push(createCheck(
    'node-required-fields',
    nodeIdentityIssues.length ? 'Error' : 'Passed',
    'Node required fields',
    nodeIdentityIssues.length
      ? `${nodeIdentityIssues.length} node(s) are missing id, type, label, or typeKey.`
      : 'Every node includes required structural schema fields.',
  ))

  const unsafeExecutionNodes = nodes.filter((node) => node?.executionEnabled !== false)
  checks.push(createCheck(
    'node-execution-disabled',
    unsafeExecutionNodes.length ? 'Error' : 'Passed',
    'Node execution disabled',
    unsafeExecutionNodes.length
      ? `${unsafeExecutionNodes.length} node(s) are not explicitly marked executionEnabled: false.`
      : 'Every node is explicitly marked executionEnabled: false.',
  ))

  const unsafeSafetyNodes = nodes.filter((node) => node?.safety !== visualOnlyMode)
  checks.push(createCheck(
    'node-visual-only-safety',
    unsafeSafetyNodes.length ? 'Error' : 'Passed',
    'Node visual-only safety',
    unsafeSafetyNodes.length
      ? `${unsafeSafetyNodes.length} node(s) have safety other than visual-only.`
      : 'Every node has safety: visual-only.',
  ))

  const unknownMappingNodes = nodes.filter((node) => (
    !node?.module ||
    !node?.operation ||
    node.module === 'unknown' ||
    node.operation === 'unknown'
  ))
  checks.push(createCheck(
    'known-module-operation',
    unknownMappingNodes.length ? 'Warning' : 'Passed',
    'Known module and operation mapping',
    unknownMappingNodes.length
      ? `${unknownMappingNodes.length} node(s) have missing or unknown module/operation mapping.`
      : 'Every node has known module and operation metadata.',
  ))

  const edgeIdentityIssues = getEdgeIdentityIssues(edges)
  checks.push(createCheck(
    'edge-required-fields',
    edgeIdentityIssues.length ? 'Error' : 'Passed',
    'Edge required fields',
    edgeIdentityIssues.length
      ? `${edgeIdentityIssues.length} edge(s) are missing id, source, or target.`
      : 'Every edge includes id, source, and target.',
  ))

  const nodeIds = new Set(nodes.filter((node) => node?.id).map((node) => node.id))
  const brokenEdges = edges.filter((edge) => !nodeIds.has(edge?.source) || !nodeIds.has(edge?.target))
  checks.push(createCheck(
    'edge-node-references',
    brokenEdges.length ? 'Error' : 'Passed',
    'Edge node references',
    brokenEdges.length
      ? `${brokenEdges.length} edge(s) reference a missing source or target node.`
      : 'Every edge references existing node ids.',
  ))

  const triggerCount = nodes.filter((node) => node?.type === 'trigger').length
  checks.push(createCheck(
    'single-trigger-recommended',
    triggerCount === 1 ? 'Passed' : 'Warning',
    'One trigger recommended',
    triggerCount === 1
      ? 'The workflow has one trigger.'
      : `The workflow has ${triggerCount} trigger(s). Exactly one trigger is recommended for this MVP.`,
  ))

  const actionCount = nodes.filter((node) => node?.type === 'action').length
  checks.push(createCheck(
    'at-least-one-action-recommended',
    actionCount > 0 ? 'Passed' : 'Warning',
    'At least one action recommended',
    actionCount > 0
      ? 'The workflow includes at least one action.'
      : 'At least one action is recommended before future backend mapping.',
  ))

  checks.push(createCheck(
    'no-execution-enabled-nodes',
    unsafeExecutionNodes.length ? 'Error' : 'Passed',
    'No execution-enabled nodes',
    unsafeExecutionNodes.length
      ? 'Workflow schema includes at least one execution-enabled node.'
      : 'Workflow schema includes no execution-enabled nodes.',
  ))

  const status = getOverallStatus(checks)

  return {
    status,
    checks,
    summary: getSummary(nodes, edges),
  }
}

export function isValidWorkflowSchemaStatus(status) {
  return validStatuses.has(status)
}

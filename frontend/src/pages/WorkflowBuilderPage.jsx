import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  ArrowLeft,
  Bell,
  Bot,
  CheckCircle2,
  Clock,
  GitBranch,
  Hourglass,
  MailCheck,
  MailPlus,
  MailQuestion,
  Maximize2,
  MessageSquareReply,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCcw,
  Route,
  Save,
  Send,
  ShieldCheck,
  SquarePen,
  StopCircle,
  TestTube2,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Workflow,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  createWorkflowDraft,
  deleteWorkflowDraft,
  getWorkflowDrafts,
  updateWorkflowDraft,
  validateWorkflowSchema,
} from '@/services/api'

const draftStorageKey = 'leadrubyorbit.workflowBuilderDraft'
const nodeType = 'workflowBlock'

const iconMap = {
  Bell,
  Bot,
  CheckCircle2,
  Clock,
  GitBranch,
  Hourglass,
  MailCheck,
  MailPlus,
  MailQuestion,
  MessageSquareReply,
  PauseCircle,
  Route,
  Send,
  SquarePen,
  StopCircle,
  UserCheck,
  UserPlus,
  Users,
}

const blockCategories = [
  {
    label: 'Triggers',
    kind: 'trigger',
    category: 'Trigger',
    blocks: [
      { label: 'Lead Uploaded', icon: 'MailPlus', description: 'Starts when a lead upload finishes.' },
      { label: 'Lead Added to Campaign', icon: 'UserPlus', description: 'Starts when a lead is attached to a campaign.' },
      { label: 'Email Sent', icon: 'Send', description: 'Starts after an approved email is marked sent.' },
      { label: 'Reply Received', icon: 'MessageSquareReply', description: 'Starts when a lead reply is detected.' },
      { label: 'No Reply Detected', icon: 'MailQuestion', description: 'Starts when no reply is found after a wait.' },
      { label: 'Draft Approved', icon: 'CheckCircle2', description: 'Starts when a draft is approved by the team.' },
    ],
  },
  {
    label: 'Actions',
    kind: 'action',
    category: 'Action',
    blocks: [
      { label: 'Create Manual Draft', icon: 'SquarePen', description: 'Creates a draft for a teammate to write manually.' },
      { label: 'Create AI Draft', icon: 'Bot', description: 'Creates a visual AI draft step for later approval.' },
      { label: 'Send Approved Email', icon: 'MailCheck', description: 'Represents sending only after approval in a future phase.' },
      { label: 'Create Follow-up Draft', icon: 'MailPlus', description: 'Creates a follow-up draft for a no-reply path.' },
      { label: 'Create Team Decision', icon: 'Users', description: 'Creates a teammate review step.' },
      { label: 'Move Lead Status', icon: 'Route', description: 'Moves a lead into another visual status.' },
      { label: 'Assign Team Member', icon: 'UserCheck', description: 'Assigns ownership to a teammate placeholder.' },
      { label: 'Send Notification', icon: 'Bell', description: 'Adds an internal notification step.' },
      { label: 'Pause Lead', icon: 'PauseCircle', description: 'Pauses future visual workflow activity.' },
      { label: 'Stop Lead', icon: 'StopCircle', description: 'Stops the lead in this visual workflow.' },
    ],
  },
  {
    label: 'Wait',
    kind: 'wait',
    category: 'Wait',
    blocks: [
      { label: 'Wait 5 Minutes', icon: 'Clock', description: 'Adds a five minute delay placeholder.' },
      { label: 'Wait 1 Hour', icon: 'Clock', description: 'Adds a one hour delay placeholder.' },
      { label: 'Wait 1 Day', icon: 'Hourglass', description: 'Adds a one day delay placeholder.' },
      { label: 'Wait Custom Time', icon: 'Hourglass', description: 'Adds a configurable wait step.' },
    ],
  },
  {
    label: 'Conditions',
    kind: 'condition',
    category: 'Condition',
    blocks: [
      { label: 'If Reply Received', icon: 'GitBranch', description: 'Branches based on whether a reply exists.' },
      { label: 'If No Reply', icon: 'GitBranch', description: 'Branches based on a no-reply state.' },
      { label: 'If Draft Approved', icon: 'GitBranch', description: 'Branches based on draft approval.' },
      { label: 'If Lead Interested', icon: 'GitBranch', description: 'Branches when a lead is interested.' },
      { label: 'If Lead Not Interested', icon: 'GitBranch', description: 'Branches when a lead is not interested.' },
    ],
  },
]

const badgeStyles = {
  Trigger: 'border-blue-200 bg-blue-50 text-blue-700',
  Action: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Wait: 'border-amber-200 bg-amber-50 text-amber-700',
  Condition: 'border-violet-200 bg-violet-50 text-violet-700',
}

const minimapColors = {
  Trigger: '#dbeafe',
  Action: '#d1fae5',
  Wait: '#fef3c7',
  Condition: '#ede9fe',
}

const visualOnlySafety = 'visual-only'

const blockMappingByLabel = {
  'Lead Uploaded': { typeKey: 'trigger.lead_uploaded', module: 'leads', operation: 'imported' },
  'Lead Added to Campaign': { typeKey: 'trigger.lead_added_to_campaign', module: 'campaigns', operation: 'attachedToCampaign' },
  'Email Sent': { typeKey: 'trigger.email_sent', module: 'emailDrafts', operation: 'emailSent' },
  'Reply Received': { typeKey: 'trigger.reply_received', module: 'replyMonitoring', operation: 'replyReceived' },
  'No Reply Detected': { typeKey: 'trigger.no_reply_detected', module: 'replyMonitoring', operation: 'noReplyDetected' },
  'Draft Approved': { typeKey: 'trigger.draft_approved', module: 'approvals', operation: 'draftApproved' },
  'Create Manual Draft': { typeKey: 'action.create_manual_draft', module: 'emailDrafts', operation: 'createManualDraft' },
  'Create AI Draft': { typeKey: 'action.create_ai_draft', module: 'emailDrafts', operation: 'createDraft' },
  'Send Approved Email': { typeKey: 'action.send_approved_email', module: 'emailDrafts', operation: 'sendApproved' },
  'Create Follow-up Draft': { typeKey: 'action.create_follow_up_draft', module: 'followUps', operation: 'createFollowUpDraft' },
  'Create Team Decision': { typeKey: 'action.create_team_decision', module: 'approvals', operation: 'createTeamDecision' },
  'Move Lead Status': { typeKey: 'action.move_lead_status', module: 'leads', operation: 'moveLeadStatus' },
  'Assign Team Member': { typeKey: 'action.assign_team_member', module: 'approvals', operation: 'assignTeamMember' },
  'Send Notification': { typeKey: 'action.send_notification', module: 'notifications', operation: 'sendNotification' },
  'Pause Lead': { typeKey: 'action.pause_lead', module: 'leads', operation: 'pauseLead' },
  'Stop Lead': { typeKey: 'action.stop_lead', module: 'leads', operation: 'stopLead' },
  'Wait 5 Minutes': { typeKey: 'wait.wait_minutes', module: 'workflowTiming', operation: 'waitMinutes' },
  'Wait 1 Hour': { typeKey: 'wait.wait_hours', module: 'workflowTiming', operation: 'waitHours' },
  'Wait 1 Day': { typeKey: 'wait.wait_days', module: 'workflowTiming', operation: 'waitDays' },
  'Wait Custom Time': { typeKey: 'wait.wait_custom_time', module: 'workflowTiming', operation: 'waitCustomTime' },
  'Wait for Approval': { typeKey: 'wait.wait_for_approval', module: 'approvals', operation: 'waitForApproval' },
  'Wait 2 Days': { typeKey: 'wait.wait_days', module: 'workflowTiming', operation: 'waitDays' },
  'If Reply Received': { typeKey: 'condition.reply_received', module: 'replyMonitoring', operation: 'checkReply' },
  'If No Reply': { typeKey: 'condition.no_reply', module: 'replyMonitoring', operation: 'checkNoReply' },
  'If Draft Approved': { typeKey: 'condition.approval_status', module: 'approvals', operation: 'checkApproval' },
  'If Lead Interested': { typeKey: 'condition.lead_interested', module: 'leads', operation: 'checkLeadInterest' },
  'If Lead Not Interested': { typeKey: 'condition.lead_not_interested', module: 'leads', operation: 'checkLeadInterest' },
}

const defaultWorkflowName = 'New Outreach Workflow'
const nodeTypes = { [nodeType]: WorkflowBlockNode }
const defaultEdgeOptions = {
  animated: false,
  markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
  style: { stroke: '#64748b', strokeWidth: 2 },
}

const sampleNodeDefinitions = [
  {
    id: 'sample-trigger',
    kind: 'trigger',
    category: 'Trigger',
    label: 'Lead Added to Campaign',
    description: 'Starts when a lead is attached to a campaign.',
    icon: 'UserPlus',
    position: { x: 140, y: 30 },
    settings: { campaignId: '', leadStatus: '' },
  },
  {
    id: 'sample-ai-draft',
    kind: 'action',
    category: 'Action',
    label: 'Create AI Draft',
    description: 'Creates a visual AI draft step for later approval.',
    icon: 'Bot',
    position: { x: 140, y: 180 },
    settings: { draftType: 'AI', actionType: 'Create AI Draft' },
  },
  {
    id: 'sample-approval-wait',
    kind: 'wait',
    category: 'Wait',
    label: 'Wait for Approval',
    description: 'Waits for a teammate to approve the draft.',
    icon: 'Hourglass',
    position: { x: 140, y: 330 },
    settings: { duration: '1', unit: 'days' },
  },
  {
    id: 'sample-send-approved',
    kind: 'action',
    category: 'Action',
    label: 'Send Approved Email',
    description: 'Represents sending only after approval in a future phase.',
    icon: 'MailCheck',
    position: { x: 140, y: 480 },
    settings: { draftType: 'AI', actionType: 'Send Approved Email' },
  },
  {
    id: 'sample-wait-two-days',
    kind: 'wait',
    category: 'Wait',
    label: 'Wait 2 Days',
    description: 'Waits two days before checking for a reply.',
    icon: 'Clock',
    position: { x: 140, y: 630 },
    settings: { duration: '2', unit: 'days' },
  },
  {
    id: 'sample-reply-condition',
    kind: 'condition',
    category: 'Condition',
    label: 'If Reply Received',
    description: 'Branches based on whether a reply exists.',
    icon: 'GitBranch',
    position: { x: 140, y: 780 },
    settings: { conditionType: 'Reply Received', yesLabel: 'Yes', noLabel: 'No' },
  },
  {
    id: 'sample-team-decision',
    kind: 'action',
    category: 'Action',
    label: 'Create Team Decision',
    description: 'Creates a teammate review step for the reply path.',
    icon: 'Users',
    position: { x: -90, y: 950 },
    settings: { actionType: 'Create Team Decision' },
  },
  {
    id: 'sample-follow-up',
    kind: 'action',
    category: 'Action',
    label: 'Create Follow-up Draft',
    description: 'Creates a follow-up draft for the no-reply path.',
    icon: 'MailPlus',
    position: { x: 370, y: 950 },
    settings: { actionType: 'Create Follow-up Draft' },
  },
]

const sampleEdgeDefinitions = [
  ['sample-trigger', 'sample-ai-draft'],
  ['sample-ai-draft', 'sample-approval-wait'],
  ['sample-approval-wait', 'sample-send-approved'],
  ['sample-send-approved', 'sample-wait-two-days'],
  ['sample-wait-two-days', 'sample-reply-condition'],
  ['sample-reply-condition', 'sample-team-decision', 'Yes'],
  ['sample-reply-condition', 'sample-follow-up', 'No'],
]

export function WorkflowBuilderPage({ onNavigate }) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderContent onNavigate={onNavigate} />
    </ReactFlowProvider>
  )
}

function WorkflowBuilderContent({ onNavigate }) {
  const canvasRef = useRef(null)
  const suppressDirtyRef = useRef(false)
  const suppressDirtyTokenRef = useRef(0)
  const [workflowName, setWorkflowName] = useState(defaultWorkflowName)
  const [workflowDraftId, setWorkflowDraftId] = useState('')
  const [nodes, setNodes] = useState(() => createSampleNodes())
  const [edges, setEdges] = useState(() => createSampleEdges())
  const [selectedNodeId, setSelectedNodeId] = useState('sample-trigger')
  const [selectedEdgeId, setSelectedEdgeId] = useState('')
  const [settingsForm, setSettingsForm] = useState(createSettingsForm(nodes[0]))
  const [message, setMessage] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [activeModal, setActiveModal] = useState(null)
  const [flowInstance, setFlowInstance] = useState(null)
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false)
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false)
  const [workflowDrafts, setWorkflowDrafts] = useState([])
  const [isDraftsLoading, setIsDraftsLoading] = useState(false)
  const [draftsError, setDraftsError] = useState('')
  const [draftActionId, setDraftActionId] = useState('')
  const [schemaCopyMessage, setSchemaCopyMessage] = useState('')
  const [backendCompatibilityResult, setBackendCompatibilityResult] = useState(null)
  const [backendCompatibilityCheckedAt, setBackendCompatibilityCheckedAt] = useState('')
  const [backendCompatibilitySchemaJson, setBackendCompatibilitySchemaJson] = useState('')
  const [backendCompatibilityError, setBackendCompatibilityError] = useState('')
  const [isBackendCompatibilityLoading, setIsBackendCompatibilityLoading] = useState(false)
  const [savedDraftSummary, setSavedDraftSummary] = useState(null)

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId],
  )
  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) || null,
    [edges, selectedEdgeId],
  )
  const displayedEdges = useMemo(
    () => edges.map((edge) => getDisplayEdge(edge, edge.id === selectedEdgeId)),
    [edges, selectedEdgeId],
  )
  const workflowSummary = useMemo(() => getWorkflowSummary(nodes, edges), [nodes, edges])
  const validationResult = useMemo(() => validateWorkflow(nodes, edges), [nodes, edges])
  const compatibilityResult = useMemo(() => checkWorkflowCompatibility(nodes, edges), [nodes, edges])
  const workflowSchema = useMemo(
    () =>
      createWorkflowSchema({
        workflowName,
        nodes,
        edges,
        summary: workflowSummary,
        validationStatus: validationResult.status,
        compatibilityResult,
      }),
    [compatibilityResult, edges, nodes, validationResult.status, workflowName, workflowSummary],
  )
  const hasMultipleTriggers = workflowSummary.triggers > 1

  const runWithoutDirty = useCallback((callback, { dirty = false } = {}) => {
    const token = suppressDirtyTokenRef.current + 1
    suppressDirtyTokenRef.current = token
    suppressDirtyRef.current = true

    callback()
    setIsDirty(dirty)

    const releaseSuppression = () => {
      if (suppressDirtyTokenRef.current !== token) return

      suppressDirtyRef.current = false
      setIsDirty(dirty)
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(releaseSuppression, 0)
      })
    })
  }, [])

  const applyWorkflowDraft = useCallback((draft, messageText, { dirty = false } = {}) => {
    const draftNodes = Array.isArray(draft.nodes) ? normalizeSavedNodes(draft.nodes) : createSampleNodes()
    const draftEdges = Array.isArray(draft.edges) ? normalizeSavedEdges(draft.edges) : createSampleEdges()

    runWithoutDirty(() => {
      setWorkflowDraftId(draft.id || draft.workflowDraftId || '')
      setWorkflowName(draft.name || draft.workflowName || defaultWorkflowName)
      setNodes(draftNodes)
      setEdges(applyConditionEdgeLabels(draftNodes, draftEdges))
      setSelectedNodeId('')
      setSelectedEdgeId('')
      setIsSettingsDrawerOpen(false)
      setBackendCompatibilityResult(null)
      setBackendCompatibilityCheckedAt('')
      setBackendCompatibilitySchemaJson('')
      setBackendCompatibilityError('')
      setSavedDraftSummary(draft.summary || null)
      setMessage(messageText)
    }, { dirty })
  }, [runWithoutDirty])

  useEffect(() => {
    let isMounted = true

    function loadLocalDraft(messageText = 'Loaded saved workflow draft from this browser.') {
      const savedDraft = window.localStorage.getItem(draftStorageKey)

      if (!savedDraft) return false

      try {
        if (!isMounted) return false
        applyWorkflowDraft(JSON.parse(savedDraft), messageText)
        return true
      } catch {
        if (isMounted) {
          setMessage('Saved workflow draft could not be loaded, so the sample workflow is shown.')
        }
        return false
      }
    }

    async function loadDraft() {
      try {
        const workflowDrafts = await getWorkflowDrafts()
        const latestDraft = Array.isArray(workflowDrafts) ? workflowDrafts[0] : null

        if (latestDraft) {
          if (!isMounted) return
          applyWorkflowDraft(latestDraft, 'Loaded saved workflow draft from workspace.')
          return
        }
      } catch {
        if (loadLocalDraft('Backend load failed, loaded local browser draft.')) {
          return
        }

        if (isMounted) {
          setMessage('Backend load failed, sample workflow is shown.')
        }
        return
      }

      loadLocalDraft()
    }

    loadDraft()

    return () => {
      isMounted = false
    }
  }, [applyWorkflowDraft])

  useEffect(() => {
    setSettingsForm(createSettingsForm(selectedNode))
  }, [selectedNode])

  const onNodesChange = useCallback((changes) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes))

    if (!suppressDirtyRef.current) {
      setIsDirty(true)
      setMessage('')
    }
  }, [])

  const onEdgesChange = useCallback((changes) => {
    setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges))

    if (!suppressDirtyRef.current) {
      setIsDirty(true)
      setMessage('')
    }
  }, [])

  const onConnect = useCallback((connection) => {
    setEdges((currentEdges) => applyConditionEdgeLabels(nodes, addEdge(createConnectedEdge(connection, nodes, currentEdges), currentEdges)))
    setIsDirty(true)
    setMessage('Workflow nodes connected locally.')
  }, [nodes])

  function markDirty() {
    setIsDirty(true)
    setMessage('')
  }

  function handleWorkflowNameChange(event) {
    setWorkflowName(event.target.value)
    markDirty()
  }

  function handleBackToDashboard() {
    if (onNavigate) {
      onNavigate('dashboard')
      return
    }

    window.history.pushState(null, '', '/dashboard')
  }

  async function refreshWorkflowDrafts() {
    setIsDraftsLoading(true)
    setDraftsError('')

    try {
      const drafts = await getWorkflowDrafts()
      setWorkflowDrafts(Array.isArray(drafts) ? drafts : [])
    } catch {
      setDraftsError('Could not load workspace drafts.')
    } finally {
      setIsDraftsLoading(false)
    }
  }

  function handleOpenDraftManager() {
    setActiveModal('drafts')
    refreshWorkflowDrafts()
  }

  function handleOpenWorkflowDraft(draft) {
    applyWorkflowDraft(draft, 'Workflow draft loaded from workspace.')
    setActiveModal(null)
    writeLocalDraft({
      ...createWorkflowDraftPayload({
        workflowName: draft.name,
        nodes: draft.nodes || [],
        edges: draft.edges || [],
        summary: draft.summary || createWorkflowSummarySnapshot({
          backendCompatibilityCheckedAt: '',
          backendCompatibilityResult: null,
          localCompatibilityStatus: checkWorkflowCompatibility(draft.nodes || [], draft.edges || []).status,
          summary: getWorkflowSummary(draft.nodes || [], draft.edges || []),
        }),
        validationStatus: draft.validationStatus || 'Warning',
      }),
      id: draft.id,
      workflowDraftId: draft.id,
      workflowName: draft.name,
    })
  }

  function handleNewDraft() {
    const nextNodes = createSampleNodes()
    const nextEdges = createSampleEdges()

    runWithoutDirty(() => {
      setWorkflowDraftId('')
      setWorkflowName(defaultWorkflowName)
      setNodes(nextNodes)
      setEdges(nextEdges)
      setSelectedNodeId('')
      setSelectedEdgeId('')
      setIsSettingsDrawerOpen(false)
      setActiveModal(null)
      setBackendCompatibilityResult(null)
      setBackendCompatibilityCheckedAt('')
      setBackendCompatibilitySchemaJson('')
      setBackendCompatibilityError('')
      setSavedDraftSummary(null)
      setMessage('New workflow draft started locally.')
    }, { dirty: true })
    window.requestAnimationFrame(() => flowInstance?.fitView({ padding: 0.2 }))
  }

  async function handleDuplicateWorkflowDraft(draft) {
    setDraftActionId(draft.id)

    try {
      const copiedNodes = draft.nodes || []
      const copiedEdges = draft.edges || []
      const copiedDraft = await createWorkflowDraft(createWorkflowDraftPayload({
        workflowName: (draft.name || defaultWorkflowName) + ' Copy',
        nodes: copiedNodes,
        edges: copiedEdges,
        summary: createWorkflowSummarySnapshot({
          backendCompatibilityCheckedAt: '',
          backendCompatibilityResult: null,
          localCompatibilityStatus: checkWorkflowCompatibility(copiedNodes, copiedEdges).status,
          summary: getWorkflowSummary(copiedNodes, copiedEdges),
        }),
        validationStatus: draft.validationStatus || 'Warning',
      }))

      setWorkflowDrafts((currentDrafts) => [copiedDraft, ...currentDrafts])
      applyWorkflowDraft(copiedDraft, 'Workflow draft duplicated.')
      writeLocalDraft({
        ...createWorkflowDraftPayload({
          workflowName: copiedDraft.name,
          nodes: copiedDraft.nodes || [],
          edges: copiedDraft.edges || [],
          summary: copiedDraft.summary || createWorkflowSummarySnapshot({
            backendCompatibilityCheckedAt: '',
            backendCompatibilityResult: null,
            localCompatibilityStatus: checkWorkflowCompatibility(copiedDraft.nodes || [], copiedDraft.edges || []).status,
            summary: getWorkflowSummary(copiedDraft.nodes || [], copiedDraft.edges || []),
          }),
          validationStatus: copiedDraft.validationStatus || 'Warning',
        }),
        id: copiedDraft.id,
        workflowDraftId: copiedDraft.id,
        workflowName: copiedDraft.name,
      })
      setActiveModal(null)
    } catch {
      setDraftsError('Could not duplicate workflow draft.')
    } finally {
      setDraftActionId('')
    }
  }

  async function handleDeleteWorkflowDraft(draft) {
    const shouldDelete = window.confirm('Delete workflow draft "' + (draft.name || 'Untitled Workflow') + '" from this workspace?')

    if (!shouldDelete) return

    setDraftActionId(draft.id)

    try {
      await deleteWorkflowDraft(draft.id)
      setWorkflowDrafts((currentDrafts) => currentDrafts.filter((currentDraft) => currentDraft.id !== draft.id))

      if (draft.id === workflowDraftId) {
        setWorkflowDraftId('')
        setMessage('Workflow draft deleted from workspace. Current canvas remains local.')
      } else {
        setMessage('Workflow draft deleted from workspace.')
      }
    } catch {
      setDraftsError('Could not delete workflow draft.')
    } finally {
      setDraftActionId('')
    }
  }
  function handleAddBlock(block, category, position) {
    const nextNode = createFlowNode(category.kind, category.category, block.label, block.description, block.icon, position || nextNodePosition(nodes.length))
    setNodes((currentNodes) => [...currentNodes, nextNode])
    setSelectedNodeId(nextNode.id)
    setSelectedEdgeId('')
    setIsSettingsDrawerOpen(true)
    setIsDirty(true)
    setMessage(`${block.label} added to the canvas.`)
  }

  function handleDragStart(event, block, category) {
    event.dataTransfer.setData('application/leadrubyorbit-block', JSON.stringify({ block, category }))
    event.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(event) {
    event.preventDefault()

    const rawBlock = event.dataTransfer.getData('application/leadrubyorbit-block')
    if (!rawBlock || !flowInstance) return

    try {
      const { block, category } = JSON.parse(rawBlock)
      const position = flowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      handleAddBlock(block, category, position)
    } catch {
      setMessage('That block could not be added to the canvas.')
    }
  }

  function handleNodeClick(_, node) {
    setSelectedNodeId(node.id)
    setSelectedEdgeId('')
    setIsSettingsDrawerOpen(true)
  }

  function handleEdgeClick(event, edge) {
    event.stopPropagation()
    setSelectedEdgeId(edge.id)
    setSelectedNodeId('')
    setIsSettingsDrawerOpen(false)
  }

  function handlePaneClick() {
    setSelectedNodeId('')
    setSelectedEdgeId('')
  }

  function handleSaveBlockSettings() {
    if (!selectedNode) return

    setNodes((currentNodes) => {
      const nextNodes = currentNodes.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                label: settingsForm.label,
                description: settingsForm.description,
                settings: buildSettingsForNode(node, settingsForm),
              },
            }
          : node,
      )

      setEdges((currentEdges) => applyConditionEdgeLabels(nextNodes, currentEdges))
      return nextNodes
    })
    setIsDirty(true)
    setMessage('Block settings saved locally.')
  }

  function handleDeleteNode() {
    if (!selectedNode) return

    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedNode.id))
    setEdges((currentEdges) => currentEdges.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id))
    setSelectedNodeId('')
    setSelectedEdgeId('')
    setIsSettingsDrawerOpen(false)
    setIsDirty(true)
    setMessage('Block deleted locally. Backend automation was not changed.')
  }

  function handleClearCanvas() {
    const shouldClear = window.confirm('Clear all workflow nodes and connections from this canvas?')

    if (!shouldClear) return

    runWithoutDirty(() => {
      setNodes([])
      setEdges([])
      setSelectedNodeId('')
      setSelectedEdgeId('')
      setIsSettingsDrawerOpen(false)
      setSavedDraftSummary(null)
      setMessage('Canvas cleared. Save draft to keep this blank workflow.')
    }, { dirty: true })
  }

  function handleResetWorkflow() {
    const nextNodes = createSampleNodes()
    runWithoutDirty(() => {
      setWorkflowName(defaultWorkflowName)
      setNodes(nextNodes)
      setEdges(createSampleEdges())
      setSelectedNodeId('')
      setSelectedEdgeId('')
      setIsSettingsDrawerOpen(false)
      setSavedDraftSummary(null)
      setMessage('Sample workflow restored locally.')
    }, { dirty: true })
    window.requestAnimationFrame(() => flowInstance?.fitView({ padding: 0.2 }))
  }

  async function handleSaveDraft() {
    const nextEdges = applyConditionEdgeLabels(nodes, edges)
    const nextValidationResult = validateWorkflow(nodes, nextEdges)
    const nextSummary = getWorkflowSummary(nodes, nextEdges)
    const nextLocalCompatibilityResult = checkWorkflowCompatibility(nodes, nextEdges)
    const nextSummarySnapshot = createWorkflowSummarySnapshot({
      backendCompatibilityCheckedAt,
      backendCompatibilityResult: backendCompatibilitySchemaJson === previewJson ? backendCompatibilityResult : null,
      localCompatibilityStatus: nextLocalCompatibilityResult.status,
      summary: nextSummary,
    })
    const payload = createWorkflowDraftPayload({
      workflowName,
      nodes,
      edges: nextEdges,
      summary: nextSummarySnapshot,
      validationStatus: nextValidationResult.status,
    })

    runWithoutDirty(() => {
      setEdges(nextEdges)
    }, { dirty: false })

    try {
      const savedDraft = workflowDraftId
        ? await updateWorkflowDraft(workflowDraftId, payload)
        : await createWorkflowDraft(payload)
      const nextWorkflowDraftId = savedDraft.id || workflowDraftId

      setWorkflowDraftId(nextWorkflowDraftId)
      writeLocalDraft({
        ...payload,
        id: nextWorkflowDraftId,
        workflowDraftId: nextWorkflowDraftId,
        workflowName: payload.name,
        selectedNodeId,
        selectedEdgeId,
      })
      setSavedDraftSummary(payload.summary)
      setIsDirty(false)
      setMessage('Workflow draft saved to workspace.')
    } catch {
      writeLocalDraft({
        ...payload,
        id: workflowDraftId,
        workflowDraftId,
        workflowName: payload.name,
        selectedNodeId,
        selectedEdgeId,
      })
      setSavedDraftSummary(payload.summary)
      setIsDirty(false)
      setMessage('Backend save failed, saved locally in this browser.')
    }
  }

  function handlePreview() {
    setSchemaCopyMessage('')
    setActiveModal('preview')
  }

  async function handleBackendCompatibilityCheck() {
    setIsBackendCompatibilityLoading(true)
    setBackendCompatibilityError('')

    try {
      const backendResult = await validateWorkflowSchema(workflowSchema)
      setBackendCompatibilityResult(backendResult)
      setBackendCompatibilityCheckedAt(new Date().toISOString())
      setBackendCompatibilitySchemaJson(previewJson)
    } catch (error) {
      setBackendCompatibilityError(error.message || 'Could not validate workflow schema with backend.')
    } finally {
      setIsBackendCompatibilityLoading(false)
    }
  }

  async function handleCopySchemaJson() {
    try {
      await navigator.clipboard.writeText(previewJson)
      setSchemaCopyMessage('Schema JSON copied.')
    } catch {
      setSchemaCopyMessage('Could not copy schema JSON.')
    }
  }

  function handleValidateWorkflow() {
    setBackendCompatibilityError('')
    setActiveModal('validation')
  }

  function handleRunTest() {
    setActiveModal('test')
  }

  function handleCenterView() {
    flowInstance?.fitView({ padding: 0.2, duration: 500 })
  }

  function handleDeleteSelectedEdge() {
    if (!selectedEdge) return

    setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== selectedEdge.id))
    setSelectedEdgeId('')
    setIsDirty(true)
    setMessage('Connection deleted locally.')
  }

  function handleCloseSettingsDrawer() {
    setIsSettingsDrawerOpen(false)
  }

  const workspaceGridClass = cn(
    'relative grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 xl:overflow-hidden',
    isLibraryCollapsed ? 'xl:grid-cols-1' : 'xl:grid-cols-[320px_minmax(0,1fr)]',
  )

  useEffect(() => {
    function handleKeyDown(event) {
      if (!['Backspace', 'Delete'].includes(event.key) || isEditableTarget(event.target)) return

      if (selectedEdge) {
        event.preventDefault()
        setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== selectedEdge.id))
        setSelectedEdgeId('')
        setIsDirty(true)
        setMessage('Connection deleted locally.')
        return
      }

      if (selectedNode) {
        event.preventDefault()
        setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedNode.id))
        setEdges((currentEdges) =>
          currentEdges.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id),
        )
        setSelectedNodeId('')
        setSelectedEdgeId('')
        setIsSettingsDrawerOpen(false)
        setIsDirty(true)
        setMessage('Block deleted locally. Backend automation was not changed.')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedEdge, selectedNode])

  const previewJson = JSON.stringify(workflowSchema, null, 2)
  const currentBackendCompatibilityResult = backendCompatibilitySchemaJson === previewJson
    ? backendCompatibilityResult
    : null
  const savedBackendCompatibilityStatus = !isDirty ? savedDraftSummary?.backendCompatibilityStatus : ''
  const savedBackendValidatedAt = !isDirty ? savedDraftSummary?.backendValidatedAt : ''

  useEffect(() => {
    if (!backendCompatibilitySchemaJson || backendCompatibilitySchemaJson === previewJson) return

    setBackendCompatibilityResult(null)
    setBackendCompatibilityCheckedAt('')
    setBackendCompatibilitySchemaJson('')
    setBackendCompatibilityError('')
  }, [backendCompatibilitySchemaJson, previewJson])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-950">
      <header className="z-30 flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            type="button"
            onClick={handleBackToDashboard}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Workflow className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-5 text-slate-950">LeadRubyOrbit</p>
              <p className="text-xs text-slate-500">Workflow Builder</p>
            </div>
          </div>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            Visual draft mode
          </Badge>
          <span className="text-xs font-medium text-slate-500">This builder does not send emails automatically.</span>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-2 xl:justify-end">
          <label className="min-w-64 flex-1 xl:max-w-sm">
            <span className="sr-only">Workflow name</span>
            <input
              className="min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              type="text"
              value={workflowName}
              onChange={handleWorkflowNameChange}
            />
          </label>
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
            Draft
          </Badge>
          {isDirty ? (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
              Unsaved changes
            </Badge>
          ) : null}
          {hasMultipleTriggers ? (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
              Multiple triggers detected
            </Badge>
          ) : null}
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            type="button"
            onClick={handleOpenDraftManager}
          >
            <Workflow className="h-4 w-4" aria-hidden="true" />
            Saved Drafts
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            type="button"
            onClick={handleNewDraft}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Draft
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            type="button"
            onClick={() => setIsLibraryCollapsed((isCollapsed) => !isCollapsed)}
          >
            {isLibraryCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            )}
            Blocks
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            type="button"
            onClick={() => setIsSettingsDrawerOpen((isOpen) => !isOpen)}
          >
            {isSettingsDrawerOpen ? (
              <PanelRightClose className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
            )}
            Settings
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-red-800"
            type="button"
            onClick={handleSaveDraft}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Save Draft
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            type="button"
            onClick={handleValidateWorkflow}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Validate
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            type="button"
            onClick={handlePreview}
          >
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
            Preview
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100"
            type="button"
            onClick={handleRunTest}
          >
            <TestTube2 className="h-4 w-4" aria-hidden="true" />
            Run Test
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100"
            type="button"
            onClick={handleClearCanvas}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Clear Canvas
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            type="button"
            onClick={handleResetWorkflow}
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </button>
        </div>
      </header>

      {message ? (
        <div className="shrink-0 border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800">
          {message}
        </div>
      ) : null}

      <WorkflowSummaryCards summary={workflowSummary} />

      <section className={workspaceGridClass}>
        {!isLibraryCollapsed ? (
          <Card className="flex min-h-[360px] flex-col overflow-hidden xl:h-full xl:min-h-0">
            <CardHeader className="shrink-0 border-b border-slate-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base text-slate-950">Block Library</CardTitle>
                  <CardDescription>Click Add or drag a block onto the canvas.</CardDescription>
                </div>
                <button
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                  type="button"
                  onClick={() => setIsLibraryCollapsed(true)}
                >
                  <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Collapse block library</span>
                </button>
              </div>
            </CardHeader>
            <CardContent className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-4">
              <BuilderTips />
              {blockCategories.map((category) => (
                <section className="grid gap-2" key={category.label}>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {category.label}
                  </h2>
                  <div className="grid gap-2">
                    {category.blocks.map((block) => (
                      <LibraryBlock
                        block={block}
                        category={category}
                        key={block.label}
                        onAdd={handleAddBlock}
                        onDragStart={handleDragStart}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card className="flex min-h-[560px] flex-col overflow-hidden xl:h-full xl:min-h-0">
          <CardHeader className="shrink-0 border-b border-slate-100 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base text-slate-950">Workflow Canvas</CardTitle>
                <CardDescription>Drag nodes, connect handles, zoom, pan, and arrange visually.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="w-fit bg-white">
                  React Flow canvas
                </Badge>
                <button
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  type="button"
                  onClick={handleCenterView}
                >
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                  Fit View
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 bg-slate-50 p-0">
            <div className="h-full min-h-[520px]" ref={canvasRef} onDragOver={handleDragOver} onDrop={handleDrop}>
              <ReactFlow
                colorMode="light"
                defaultEdgeOptions={defaultEdgeOptions}
                deleteKeyCode={null}
                edges={displayedEdges}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                nodeTypes={nodeTypes}
                nodes={nodes}
                onConnect={onConnect}
                onEdgeClick={handleEdgeClick}
                onEdgesChange={onEdgesChange}
                onInit={setFlowInstance}
                onNodeClick={handleNodeClick}
                onNodesChange={onNodesChange}
                onPaneClick={handlePaneClick}
                proOptions={{ hideAttribution: true }}
              >
                {nodes.length ? null : (
                  <div className="absolute left-1/2 top-1/2 z-10 w-96 max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-dashed border-slate-300 bg-white/95 px-5 py-6 text-center shadow-sm">
                    <Workflow className="mx-auto h-9 w-9 text-slate-400" aria-hidden="true" />
                    <p className="mt-3 text-base font-semibold text-slate-950">Start building your workflow</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Add a trigger from the Block Library, then connect actions, waits, and conditions.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <button
                        className="pointer-events-auto inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-red-800"
                        type="button"
                        onClick={() => setIsLibraryCollapsed(false)}
                      >
                        <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
                        Add a trigger to begin
                      </button>
                      <button
                        className="pointer-events-auto inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        type="button"
                        onClick={handleResetWorkflow}
                      >
                        <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                        Reset to Sample Workflow
                      </button>
                    </div>
                  </div>
                )}
                <Background color="#cbd5e1" gap={18} size={1} />
                <Controls position="bottom-right" />
                <MiniMap
                  nodeColor={(node) => minimapColors[node.data?.category] || '#e2e8f0'}
                  nodeStrokeWidth={3}
                  pannable
                  position="bottom-left"
                  zoomable
                />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>

        {selectedEdge ? (
          <ConnectionActionPanel edge={selectedEdge} onDelete={handleDeleteSelectedEdge} />
        ) : null}

        {isSettingsDrawerOpen ? (
          <SettingsDrawer
            form={settingsForm}
            node={selectedNode}
            onClose={handleCloseSettingsDrawer}
            onDelete={handleDeleteNode}
            onSave={handleSaveBlockSettings}
            onUpdate={setSettingsForm}
          />
        ) : null}
      </section>

      {activeModal === 'drafts' ? (
        <Modal title="Saved Workflow Drafts" onClose={() => setActiveModal(null)}>
          <DraftManager
            actionDraftId={draftActionId}
            currentDraftId={workflowDraftId}
            drafts={workflowDrafts}
            error={draftsError}
            isLoading={isDraftsLoading}
            onDelete={handleDeleteWorkflowDraft}
            onDuplicate={handleDuplicateWorkflowDraft}
            onNewDraft={handleNewDraft}
            onOpen={handleOpenWorkflowDraft}
            onRefresh={refreshWorkflowDrafts}
          />
        </Modal>
      ) : null}

      {activeModal === 'validation' ? (
        <Modal title="Workflow Validation" onClose={() => setActiveModal(null)}>
          <ValidationResult result={validationResult} />
          <CompatibilitySummary result={compatibilityResult} title="Local Compatibility Check" />
          <BackendSchemaCheck
            error={backendCompatibilityError}
            isLoading={isBackendCompatibilityLoading}
            onCheck={handleBackendCompatibilityCheck}
            result={currentBackendCompatibilityResult}
            savedStatus={savedBackendCompatibilityStatus}
            savedValidatedAt={savedBackendValidatedAt}
          />
        </Modal>
      ) : null}

      {activeModal === 'preview' ? (
        <Modal title="Workflow JSON Preview" onClose={() => setActiveModal(null)}>
          <PreviewSummary summary={workflowSummary} />
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-medium text-amber-800">
            Preview only. This workflow does not execute automation or send emails.
          </div>
          <div className="max-h-72 overflow-y-auto pr-1">
            <CompatibilitySummary result={compatibilityResult} title="Local Compatibility Check" />
          </div>
          <BackendSchemaCheck
            error={backendCompatibilityError}
            isLoading={isBackendCompatibilityLoading}
            onCheck={handleBackendCompatibilityCheck}
            result={currentBackendCompatibilityResult}
            savedStatus={savedBackendCompatibilityStatus}
            savedValidatedAt={savedBackendValidatedAt}
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              type="button"
              onClick={handleCopySchemaJson}
            >
              Copy Schema JSON
            </button>
            {schemaCopyMessage ? (
              <p className="text-sm font-medium text-slate-600">{schemaCopyMessage}</p>
            ) : null}
          </div>
          <pre className="mt-4 max-h-80 overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-100">
            {previewJson}
          </pre>
        </Modal>
      ) : null}

      {activeModal === 'test' ? (
        <Modal title="Mock Run Test" onClose={() => setActiveModal(null)}>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-medium text-amber-800">
            Mock test only. No backend automation ran and no emails were sent.
          </div>
          <BlockMappingSummary compatibilityResult={compatibilityResult} nodes={nodes} />
          <div className="mt-4">
            <ValidationResult result={validationResult} compact />
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
function WorkflowSummaryCards({ summary }) {
  const cards = [
    { label: 'Nodes', value: summary.nodes },
    { label: 'Edges', value: summary.edges },
    { label: 'Triggers', value: summary.triggers },
    { label: 'Actions', value: summary.actions },
    { label: 'Waits', value: summary.waits },
    { label: 'Conditions', value: summary.conditions },
  ]

  return (
    <div className="grid shrink-0 gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm" key={card.label}>
          <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
          <p className="mt-1 text-lg font-semibold leading-6 text-slate-950">{card.value}</p>
        </div>
      ))}
    </div>
  )
}

function BuilderTips() {
  const tips = [
    'Start with one trigger.',
    'Connect each step in order.',
    'Use conditions for reply/no-reply branches.',
    'Save draft before leaving the page.',
    'This builder is visual-only for now.',
  ]

  return (
    <section className="rounded-md border border-blue-200 bg-blue-50 px-3 py-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-blue-800">Builder Tips</h2>
      <ul className="mt-2 grid gap-1 text-xs leading-5 text-blue-900">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </section>
  )
}

function DraftManager({ actionDraftId, currentDraftId, drafts, error, isLoading, onDelete, onDuplicate, onNewDraft, onOpen, onRefresh }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Visual draft mode</p>
          <p className="mt-1">Saved workflow drafts do not execute automation or send emails.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            type="button"
            onClick={onRefresh}
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
          <button
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-red-800"
            type="button"
            onClick={onNewDraft}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Draft
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-8 text-center text-sm font-medium text-slate-600">
          Loading workspace drafts...
        </div>
      ) : null}

      {!isLoading && !drafts.length ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
          <Workflow className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-950">No workspace drafts yet</p>
          <p className="mt-1 text-sm text-slate-600">Save the current visual workflow or start a new draft.</p>
        </div>
      ) : null}

      {!isLoading && drafts.length ? (
        <div className="max-h-[56vh] overflow-auto rounded-md border border-slate-200">
          <div className="min-w-[900px] divide-y divide-slate-200">
            {drafts.map((draft) => (
              <div className="grid gap-3 bg-white p-4 transition hover:bg-slate-50 lg:grid-cols-[minmax(13rem,1.4fr)_0.55fr_0.65fr_0.85fr_0.85fr_0.75fr_auto]" key={draft.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-950">{draft.name || 'Untitled Workflow'}</p>
                    {draft.id === currentDraftId ? (
                      <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                        Open
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Updated {formatDraftDate(draft.updatedAt)}</p>
                </div>
                <DraftMeta label="Status" value={draft.status || 'draft'} />
                <DraftMeta label="Mode" value={draft.mode || 'visual-only'} />
                <DraftMeta label="Validation" value={draft.validationStatus || 'Warning'} />
                <DraftMeta label="Local compat" value={getDraftLocalCompatibilityStatus(draft)} />
                <DraftMeta label="Backend compat" value={getDraftBackendCompatibilityStatus(draft)} />
                <DraftMeta label="Size" value={`${getDraftNodeCount(draft)} nodes / ${getDraftEdgeCount(draft)} edges`} />
                <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                  <button
                    className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    type="button"
                    onClick={() => onOpen(draft)}
                  >
                    Open
                  </button>
                  <button
                    className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={actionDraftId === draft.id}
                    type="button"
                    onClick={() => onDuplicate(draft)}
                  >
                    Duplicate
                  </button>
                  <button
                    className="inline-flex min-h-9 items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={actionDraftId === draft.id}
                    type="button"
                    onClick={() => onDelete(draft)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DraftMeta({ label, value }) {
  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  )
}
function BlockMappingSummary({ compatibilityResult, nodes }) {
  const summary = getBlockMappingSummary(nodes)
  const cards = [
    { label: 'Triggers', value: summary.triggers },
    { label: 'Actions', value: summary.actions },
    { label: 'Waits', value: summary.waits },
    { label: 'Conditions', value: summary.conditions },
    { label: 'Mapped blocks', value: summary.mappedBlocks },
    { label: 'Unmapped blocks', value: summary.unmappedBlocks },
  ]

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-950">Block mapping summary</p>
        {compatibilityResult ? (
          <Badge variant="outline" className={cn('text-[0.68rem]', validationBadgeStyles[compatibilityResult.status])}>
            Compatibility: {compatibilityResult.status}
          </Badge>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <InfoPill key={card.label} label={card.label} value={card.value} />
        ))}
      </div>
    </div>
  )
}
function PreviewSummary({ summary }) {
  return (
    <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-5">
      <InfoPill label="Nodes" value={summary.nodes} />
      <InfoPill label="Edges" value={summary.edges} />
      <InfoPill label="Mode" value="visual-only" />
      <InfoPill label="Execution" value="disabled" />
      <InfoPill label="Safety" value="no backend call, no emails sent" />
    </div>
  )
}

function CompatibilitySummary({
  description = 'Informational only. No backend execution APIs are called.',
  result,
  title = 'Backend Compatibility Check',
}) {
  const counts = getCompatibilityCheckCounts(result)

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-xs text-slate-600">{description}</p>
        </div>
        <Badge variant="outline" className={cn('text-[0.68rem]', validationBadgeStyles[result.status])}>
          {result.status}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <InfoPill label="Passed checks" value={counts.Passed} />
        <InfoPill label="Warning checks" value={counts.Warning} />
        <InfoPill label="Error checks" value={counts.Error} />
      </div>
      <div className="mt-3 grid gap-2">
        {result.checks.map((check) => (
          <div className={cn('rounded-md border px-3 py-2', validationStatusStyles[check.status])} key={check.id}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('text-[0.68rem]', validationBadgeStyles[check.status])}>
                {check.status}
              </Badge>
              <p className="text-sm font-semibold">{check.title}</p>
            </div>
            <p className="mt-1 text-sm leading-6">{check.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function BackendSchemaCheck({ error, isLoading, onCheck, result, savedStatus, savedValidatedAt }) {
  return (
    <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-950">Backend schema validator</p>
          <p className="mt-1 text-xs text-blue-800">Validation only. No workflow is saved, executed, or sent.</p>
        </div>
        <button
          className="inline-flex min-h-9 items-center justify-center rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-800 shadow-sm transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          type="button"
          onClick={onCheck}
        >
          {isLoading ? 'Checking...' : 'Check with Backend'}
        </button>
      </div>
      {isLoading ? (
        <p className="mt-3 text-sm font-medium text-blue-800">Checking backend compatibility...</p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      {!result && savedStatus ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          Saved backend status: {savedStatus} from last save{savedValidatedAt ? ` (${formatDraftDate(savedValidatedAt)})` : ''}. Run Check with Backend to refresh.
        </p>
      ) : null}
      {result ? (
        <CompatibilitySummary
          description="Server-side compatibility validation only. No automation was executed."
          result={result}
          title="Backend Compatibility Check"
        />
      ) : null}
    </div>
  )
}

function getDraftNodeCount(draft) {
  if (Array.isArray(draft.nodes)) return draft.nodes.length
  return Number(draft.summary?.nodes || 0)
}

function getDraftEdgeCount(draft) {
  if (Array.isArray(draft.edges)) return draft.edges.length
  return Number(draft.summary?.edges || 0)
}

function getDraftLocalCompatibilityStatus(draft) {
  return draft.summary?.localCompatibilityStatus || draft.summary?.compatibilityStatus || 'Not checked'
}

function getDraftBackendCompatibilityStatus(draft) {
  return draft.summary?.backendCompatibilityStatus || 'Not checked'
}

function formatDraftDate(value) {
  if (!value) return 'Not saved yet'

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return 'Not saved yet'
  }
}
function InfoPill({ label, value }) {
  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function ValidationResult({ compact = false, result }) {
  return (
    <div className="grid gap-3">
      <div className={cn('rounded-md border px-3 py-3', validationStatusStyles[result.status])}>
        <p className="text-sm font-semibold">Validation status: {result.status}</p>
        <p className="mt-1 text-sm leading-6">{result.summary}</p>
      </div>
      {result.issues.length ? (
        <div className="grid gap-2">
          {result.issues.map((issue) => (
            <div className={cn('rounded-md border px-3 py-2', validationStatusStyles[issue.status])} key={issue.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn('text-[0.68rem]', validationBadgeStyles[issue.status])}>
                  {issue.status}
                </Badge>
                <p className="text-sm font-semibold">{issue.title}</p>
              </div>
              {!compact ? <p className="mt-1 text-sm leading-6">{issue.message}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          No validation issues found for this visual draft.
        </p>
      )}
    </div>
  )
}

const validationStatusStyles = {
  Passed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Warning: 'border-amber-200 bg-amber-50 text-amber-800',
  Error: 'border-red-200 bg-red-50 text-red-800',
}

const validationBadgeStyles = {
  Passed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Warning: 'border-amber-200 bg-amber-50 text-amber-700',
  Error: 'border-red-200 bg-red-50 text-red-700',
}

function LibraryBlock({ block, category, onAdd, onDragStart }) {
  const Icon = iconMap[block.icon] || Workflow

  return (
    <div
      className="group rounded-md border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:shadow"
      draggable
      onDragStart={(event) => onDragStart(event, block, category)}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 group-hover:bg-white">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">{block.label}</p>
            <button
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
              type="button"
              onClick={() => onAdd(block, category)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Add {block.label}</span>
            </button>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{block.description}</p>
          <Badge variant="outline" className={cn('mt-2 text-[0.68rem]', badgeStyles[category.category])}>
            {category.category}
          </Badge>
        </div>
      </div>
    </div>
  )
}

function WorkflowBlockNode({ data, selected }) {
  const Icon = iconMap[data.icon] || Workflow

  return (
    <div
      className={cn(
        'w-64 rounded-md border bg-white px-4 py-3 text-left shadow-sm transition',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200',
      )}
    >
      <Handle className="!h-3 !w-3 !border-2 !border-white !bg-slate-500" position={Position.Top} type="target" />
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-950">{data.label}</p>
            {selected ? (
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                Selected
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{data.description}</p>
          <Badge variant="outline" className={cn('mt-2 text-[0.68rem]', badgeStyles[data.category])}>
            {data.category}
          </Badge>
          {data.kind === 'condition' ? (
            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[0.68rem] font-semibold">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                {data.settings?.yesLabel || 'Yes'}
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
                {data.settings?.noLabel || 'No'}
              </span>
            </div>
          ) : null}
        </div>
      </div>
      <Handle className="!h-3 !w-3 !border-2 !border-white !bg-slate-500" position={Position.Bottom} type="source" />
    </div>
  )
}

function ConnectionActionPanel({ edge, onDelete }) {
  return (
    <div className="absolute right-5 top-5 z-20 rounded-md border border-slate-200 bg-white px-3 py-3 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Connection</p>
      <p className="mt-1 max-w-60 truncate text-sm font-semibold text-slate-950">
        {edge.label ? edge.label + ' branch' : 'Workflow connection'}
      </p>
      <button
        className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
        type="button"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Delete Connection
      </button>
    </div>
  )
}

function SettingsDrawer({ form, node, onClose, onDelete, onSave, onUpdate }) {
  return (
    <aside className="absolute inset-y-3 right-3 z-30 flex w-[min(26rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 p-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Settings Panel</h2>
          <p className="mt-1 text-sm text-slate-500">
            {node ? 'Selected block: ' + node.data.label : 'Select a canvas node to edit local settings.'}
          </p>
        </div>
        <button
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          type="button"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Close settings drawer</span>
        </button>
      </div>

      {!node ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-600">
            No block selected.
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4">
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Settings are visual only in this phase.
            </div>
          </div>

          <ReadOnlyField label="Block name" value={node.data.label} />
          <ReadOnlyField label="Block type" value={node.data.category} />
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Label
            <input
              className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={form.label}
              onChange={(event) => onUpdate({ ...form, label: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Description
            <textarea
              className="min-h-24 resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={form.description}
              onChange={(event) => onUpdate({ ...form, description: event.target.value })}
            />
          </label>

          {node.data.kind === 'trigger' ? <TriggerSettings form={form} onUpdate={onUpdate} /> : null}
          {node.data.kind === 'action' ? <ActionSettings form={form} node={node} onUpdate={onUpdate} /> : null}
          {node.data.kind === 'wait' ? <WaitSettings form={form} onUpdate={onUpdate} /> : null}
          {node.data.kind === 'condition' ? <ConditionSettings form={form} node={node} onUpdate={onUpdate} /> : null}

          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-red-800"
            type="button"
            onClick={onSave}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Save Block Settings
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100"
            type="button"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete Block
          </button>
        </div>
      )}
    </aside>
  )
}

function TriggerSettings({ form, onUpdate }) {
  return (
    <>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Campaign
        <select
          className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm outline-none"
          value={form.campaignId}
          onChange={(event) => onUpdate({ ...form, campaignId: event.target.value })}
        >
          <option value="">Select campaign in a future phase</option>
          <option value="sample-campaign">Sample campaign placeholder</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Lead status trigger
        <select
          className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm outline-none"
          value={form.leadStatus}
          onChange={(event) => onUpdate({ ...form, leadStatus: event.target.value })}
        >
          <option value="">Choose lead status in a future phase</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="replied">Replied</option>
        </select>
      </label>
    </>
  )
}

function ActionSettings({ form, node, onUpdate }) {
  return (
    <>
      <ReadOnlyField label="Action type" value={node.data.settings?.actionType || node.data.label} />
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Draft type
        <select
          className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none"
          value={form.draftType}
          onChange={(event) => onUpdate({ ...form, draftType: event.target.value })}
        >
          <option value="manual">Manual</option>
          <option value="AI">AI</option>
        </select>
      </label>
      <TextInputField
        label="Team member"
        placeholder="Select teammate in a future phase"
        value={form.assignee}
        onChange={(value) => onUpdate({ ...form, assignee: value })}
      />
      <TextInputField
        label="Lead status"
        placeholder="Target status placeholder"
        value={form.moveLeadStatus}
        onChange={(value) => onUpdate({ ...form, moveLeadStatus: value })}
      />
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Notification message
        <textarea
          className="min-h-20 resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Internal notification text"
          value={form.notificationMessage}
          onChange={(event) => onUpdate({ ...form, notificationMessage: event.target.value })}
        />
      </label>
    </>
  )
}

function WaitSettings({ form, onUpdate }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1.1fr]">
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Duration
        <input
          className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          min="1"
          type="number"
          value={form.duration}
          onChange={(event) => onUpdate({ ...form, duration: event.target.value })}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Unit
        <select
          className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none"
          value={form.unit}
          onChange={(event) => onUpdate({ ...form, unit: event.target.value })}
        >
          <option value="minutes">Minutes</option>
          <option value="hours">Hours</option>
          <option value="days">Days</option>
        </select>
      </label>
    </div>
  )
}

function ConditionSettings({ form, node, onUpdate }) {
  return (
    <>
      <ReadOnlyField label="Condition type" value={node.data.settings?.conditionType || node.data.label} />
      <TextInputField
        label="Yes path label"
        value={form.yesLabel}
        onChange={(value) => onUpdate({ ...form, yesLabel: value })}
      />
      <TextInputField
        label="No path label"
        value={form.noLabel}
        onChange={(value) => onUpdate({ ...form, noLabel: value })}
      />
    </>
  )
}

function ReadOnlyField({ label, value }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        className="min-h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 shadow-sm outline-none"
        readOnly
        value={value}
      />
    </label>
  )
}

function TextInputField({ label, onChange, placeholder = '', value }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function Modal({ children, onClose, title }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <button
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            type="button"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

function createFlowNode(kind, category, label, description, icon, position, settings = {}, id = createNodeId()) {
  return {
    id,
    type: nodeType,
    position,
    data: {
      kind,
      category,
      label,
      description,
      icon,
      ...getBlockMapping(label, kind),
      settings: {
        ...defaultSettingsForKind(kind, label),
        ...settings,
      },
    },
  }
}

function createSampleNodes() {
  return sampleNodeDefinitions.map((node) =>
    createFlowNode(node.kind, node.category, node.label, node.description, node.icon, node.position, node.settings, node.id),
  )
}

function createSampleEdges() {
  return sampleEdgeDefinitions.map(([source, target, label]) => createEdge(source, target, label))
}

function createEdge(source, target, label) {
  return {
    ...defaultEdgeOptions,
    id: `edge-${source}-${target}-${label || 'default'}`,
    label,
    source,
    target,
    type: 'smoothstep',
  }
}

function createWorkflowSummarySnapshot({ backendCompatibilityCheckedAt, backendCompatibilityResult, localCompatibilityStatus, summary }) {
  const snapshot = {
    nodes: Number(summary?.nodes || 0),
    edges: Number(summary?.edges || 0),
    triggers: Number(summary?.triggers || 0),
    actions: Number(summary?.actions || 0),
    waits: Number(summary?.waits || 0),
    conditions: Number(summary?.conditions || 0),
    schemaVersion: 'visual-workflow-v1',
    localCompatibilityStatus: localCompatibilityStatus || 'Warning',
    executionEnabled: false,
    safety: visualOnlySafety,
    mode: visualOnlySafety,
  }

  if (backendCompatibilityResult) {
    snapshot.backendCompatibilityStatus = backendCompatibilityResult.status || null
    snapshot.backendValidatedAt = backendCompatibilityCheckedAt || new Date().toISOString()
    snapshot.backendValidationSummary = pickWorkflowValidationSummary(backendCompatibilityResult.summary)
  }

  return snapshot
}

function pickWorkflowValidationSummary(summary = {}) {
  return {
    nodes: Number(summary.nodes || 0),
    edges: Number(summary.edges || 0),
    triggers: Number(summary.triggers || 0),
    actions: Number(summary.actions || 0),
    waits: Number(summary.waits || 0),
    conditions: Number(summary.conditions || 0),
    mappedBlocks: Number(summary.mappedBlocks || 0),
    unmappedBlocks: Number(summary.unmappedBlocks || 0),
  }
}

function createWorkflowDraftPayload({ workflowName, nodes, edges, summary, validationStatus }) {
  return {
    name: String(workflowName || defaultWorkflowName).trim() || defaultWorkflowName,
    status: 'draft',
    mode: 'visual-only',
    nodes: normalizeSavedNodes(nodes),
    edges,
    summary,
    validationStatus,
  }
}

function writeLocalDraft(draft) {
  window.localStorage.setItem(
    draftStorageKey,
    JSON.stringify({ ...draft, savedAt: new Date().toISOString() }, null, 2),
  )
}



function getDisplayEdge(edge, isSelected) {
  if (!isSelected) {
    return edge
  }

  return {
    ...edge,
    animated: true,
    style: {
      ...(edge.style || {}),
      stroke: '#dc2626',
      strokeWidth: 3,
    },
    labelStyle: {
      ...(edge.labelStyle || {}),
      fill: '#dc2626',
      fontWeight: 700,
    },
  }
}

function isEditableTarget(target) {
  if (!target || !(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()

  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  )
}

function createConnectedEdge(connection, nodes, edges) {
  const sourceNode = nodes.find((node) => node.id === connection.source)
  const sourceOutgoingCount = edges.filter((edge) => edge.source === connection.source).length
  const branchLabel = sourceNode?.data?.kind === 'condition'
    ? getConditionBranchLabel(sourceNode, sourceOutgoingCount)
    : undefined

  return {
    ...defaultEdgeOptions,
    ...connection,
    id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
    label: branchLabel,
    type: 'smoothstep',
  }
}

function getWorkflowSummary(nodes, edges) {
  return {
    nodes: nodes.length,
    edges: edges.length,
    triggers: nodes.filter((node) => node.data?.kind === 'trigger').length,
    actions: nodes.filter((node) => node.data?.kind === 'action').length,
    waits: nodes.filter((node) => node.data?.kind === 'wait').length,
    conditions: nodes.filter((node) => node.data?.kind === 'condition').length,
  }
}

function validateWorkflow(nodes, edges) {
  const issues = []
  const triggerNodes = nodes.filter((node) => node.data?.kind === 'trigger')

  if (!nodes.length) {
    issues.push({
      id: 'empty-workflow',
      status: 'Error',
      title: 'Workflow is empty',
      message: 'Add a trigger from the Block Library before saving this as an executable workflow later.',
    })
  }

  if (!triggerNodes.length && nodes.length) {
    issues.push({
      id: 'missing-trigger',
      status: 'Error',
      title: 'No trigger found',
      message: 'At least one trigger is required to define how the workflow starts.',
    })
  }

  if (triggerNodes.length > 1) {
    issues.push({
      id: 'multiple-triggers',
      status: 'Warning',
      title: 'Multiple triggers detected',
      message: 'Multiple triggers can be used later, but one starting trigger is recommended for this MVP.',
    })
  }

  nodes.forEach((node) => {
    const incomingEdges = edges.filter((edge) => edge.target === node.id)
    const outgoingEdges = edges.filter((edge) => edge.source === node.id)

    const mappingIssues = getNodeMappingIssues(node)
    if (mappingIssues.length) {
      issues.push({
        id: 'mapping-' + node.id,
        status: 'Warning',
        title: (node.data?.label || 'Node') + ' is missing visual mapping metadata',
        message: 'Missing: ' + mappingIssues.join(', ') + '. Old drafts are normalized automatically when loaded; unknown custom blocks should be mapped before backend execution exists.',
      })
    }
    if (node.data?.kind !== 'trigger' && !incomingEdges.length) {
      issues.push({
        id: `missing-incoming-${node.id}`,
        status: 'Error',
        title: `${node.data?.label || 'Node'} has no incoming connection`,
        message: 'Every non-trigger node should be connected from a prior workflow step.',
      })
    }

    if (!outgoingEdges.length && !isTerminalNode(node)) {
      issues.push({
        id: `missing-outgoing-${node.id}`,
        status: 'Warning',
        title: `${node.data?.label || 'Node'} has no outgoing connection`,
        message: 'Every non-final node should have at least one outgoing connection. Nodes without outgoing edges are treated as final visual steps.',
      })
    }

    if (node.data?.kind === 'condition' && outgoingEdges.length < 2) {
      issues.push({
        id: `condition-branches-${node.id}`,
        status: 'Error',
        title: `${node.data?.label || 'Condition'} needs Yes and No paths`,
        message: 'Condition nodes should have at least two outgoing connections for clear branch behavior.',
      })
    }
  })

  const hasErrors = issues.some((issue) => issue.status === 'Error')
  const status = hasErrors ? 'Error' : issues.length ? 'Warning' : 'Passed'

  return {
    status,
    issues,
    summary: status === 'Passed'
      ? 'Workflow structure looks ready for a visual draft.'
      : 'Review these items before treating this workflow as production-ready later.',
  }
}

function isTerminalNode(node) {
  return ['Stop Lead', 'Pause Lead', 'Create Team Decision', 'Create Follow-up Draft'].includes(node.data?.label)
}

function applyConditionEdgeLabels(nodes, edges) {
  const edgesByCondition = new Map()

  edges.forEach((edge) => {
    const sourceNode = nodes.find((node) => node.id === edge.source)
    if (sourceNode?.data?.kind !== 'condition') return

    const currentEdges = edgesByCondition.get(edge.source) || []
    currentEdges.push(edge)
    edgesByCondition.set(edge.source, currentEdges)
  })

  return edges.map((edge) => {
    const sourceNode = nodes.find((node) => node.id === edge.source)
    if (sourceNode?.data?.kind !== 'condition') return edge

    const conditionEdges = edgesByCondition.get(edge.source) || []
    if (conditionEdges.length < 2) return edge

    const branchIndex = conditionEdges.findIndex((conditionEdge) => conditionEdge.id === edge.id)
    if (branchIndex === 0) return { ...edge, label: sourceNode.data.settings?.yesLabel || 'Yes' }
    if (branchIndex === 1) return { ...edge, label: sourceNode.data.settings?.noLabel || 'No' }
    return edge
  })
}

function getConditionBranchLabel(node, outgoingCount) {
  if (outgoingCount === 0) return node.data?.settings?.yesLabel || 'Yes'
  if (outgoingCount === 1) return node.data?.settings?.noLabel || 'No'
  return undefined
}

function createNodeId() {
  return `node-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function nextNodePosition(nodeCount) {
  return {
    x: 140 + (nodeCount % 3) * 120,
    y: 80 + nodeCount * 90,
  }
}

function getBlockMapping(label, kind = 'action') {
  const mapping = blockMappingByLabel[label]

  if (mapping) {
    return {
      ...mapping,
      safety: visualOnlySafety,
      executionEnabled: false,
    }
  }

  return {
    typeKey: kind ? kind + '.unknown' : 'unknown.block',
    module: 'unknown',
    operation: 'unknown',
    safety: visualOnlySafety,
    executionEnabled: false,
  }
}

function normalizeNodeData(data = {}) {
  const kind = data.kind || data.type || 'action'
  const label = data.label || 'Workflow Block'
  const mapping = getBlockMapping(label, kind)

  return {
    ...data,
    kind,
    category: data.category || categoryForKind(kind),
    label,
    description: data.description || 'Visual workflow block.',
    icon: data.icon || 'Workflow',
    typeKey: data.typeKey || mapping.typeKey,
    module: data.module || mapping.module,
    operation: data.operation || mapping.operation,
    safety: data.safety || visualOnlySafety,
    executionEnabled: false,
    settings: data.settings || {},
  }
}

function categoryForKind(kind) {
  if (kind === 'trigger') return 'Trigger'
  if (kind === 'wait') return 'Wait'
  if (kind === 'condition') return 'Condition'
  return 'Action'
}

function getNodeMappingIssues(node) {
  const issues = []
  const data = node.data || {}

  if (!data.typeKey) issues.push('typeKey')
  if (!data.module) issues.push('module')
  if (!data.operation) issues.push('operation')
  if (data.typeKey?.includes('.unknown') || data.module === 'unknown' || data.operation === 'unknown') {
    issues.push('known mapping')
  }
  if (data.safety !== visualOnlySafety) issues.push('safety')
  if (data.executionEnabled !== false) issues.push('executionEnabled false')

  return issues
}

function getBlockMappingSummary(nodes) {
  const summary = getWorkflowSummary(nodes, [])
  const mappedBlocks = nodes.filter((node) => !getNodeMappingIssues(node).length).length

  return {
    triggers: summary.triggers,
    actions: summary.actions,
    waits: summary.waits,
    conditions: summary.conditions,
    mappedBlocks,
    unmappedBlocks: nodes.length - mappedBlocks,
  }
}

function createWorkflowSchema({ compatibilityResult, edges, nodes, summary, validationStatus, workflowName }) {
  const normalizedNodes = normalizeSavedNodes(nodes)
  const normalizedEdges = normalizeSavedEdges(edges).map(serializeEdge)

  return {
    schemaVersion: 'visual-workflow-v1',
    workflowName: String(workflowName || defaultWorkflowName).trim() || defaultWorkflowName,
    status: 'Draft',
    mode: 'visual-only',
    executionEnabled: false,
    safety: visualOnlySafety,
    summary,
    validationStatus,
    compatibilityStatus: compatibilityResult.status,
    nodes: normalizedNodes.map(serializeSchemaNode),
    edges: normalizedEdges,
    compatibilityReport: compatibilityResult,
  }
}

function checkWorkflowCompatibility(nodes, edges) {
  const normalizedNodes = normalizeSavedNodes(nodes)
  const normalizedEdges = normalizeSavedEdges(edges)
  const nodeIds = new Set(normalizedNodes.map((node) => node.id))
  const triggerCount = normalizedNodes.filter((node) => node.data?.kind === 'trigger').length
  const actionCount = normalizedNodes.filter((node) => node.data?.kind === 'action').length
  const checks = []

  const missingTypeKeyNodes = normalizedNodes.filter((node) => !node.data?.typeKey || node.data.typeKey.includes('.unknown'))
  checks.push(createCompatibilityCheck(
    'stable-type-keys',
    missingTypeKeyNodes.length ? 'Warning' : 'Passed',
    'Stable type keys',
    missingTypeKeyNodes.length
      ? `${missingTypeKeyNodes.length} block(s) need stable typeKey metadata before backend mapping.`
      : 'Every block has a stable visual typeKey.',
  ))

  const unknownModuleNodes = normalizedNodes.filter((node) => !node.data?.module || node.data.module === 'unknown')
  checks.push(createCompatibilityCheck(
    'known-modules',
    unknownModuleNodes.length ? 'Warning' : 'Passed',
    'Known backend modules',
    unknownModuleNodes.length
      ? `${unknownModuleNodes.length} block(s) are not mapped to a known backend module yet.`
      : 'Every block maps to a known backend module name.',
  ))

  const unknownOperationNodes = normalizedNodes.filter((node) => !node.data?.operation || node.data.operation === 'unknown')
  checks.push(createCompatibilityCheck(
    'known-operations',
    unknownOperationNodes.length ? 'Warning' : 'Passed',
    'Known backend operations',
    unknownOperationNodes.length
      ? `${unknownOperationNodes.length} block(s) are not mapped to a known backend operation yet.`
      : 'Every block maps to a known backend operation name.',
  ))

  const unsafeExecutionNodes = normalizedNodes.filter((node) => node.data?.executionEnabled !== false)
  checks.push(createCompatibilityCheck(
    'execution-flags-disabled',
    unsafeExecutionNodes.length ? 'Error' : 'Passed',
    'Execution disabled per node',
    unsafeExecutionNodes.length
      ? `${unsafeExecutionNodes.length} block(s) are not explicitly marked executionEnabled: false.`
      : 'Every block is explicitly marked executionEnabled: false.',
  ))

  const unsafeSafetyNodes = normalizedNodes.filter((node) => node.data?.safety !== visualOnlySafety)
  checks.push(createCompatibilityCheck(
    'visual-only-safety',
    unsafeSafetyNodes.length ? 'Error' : 'Passed',
    'Visual-only safety',
    unsafeSafetyNodes.length
      ? `${unsafeSafetyNodes.length} block(s) are missing safety: visual-only.`
      : 'Every block is marked safety: visual-only.',
  ))

  const brokenEdges = normalizedEdges.filter((edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target))
  checks.push(createCompatibilityCheck(
    'edge-node-references',
    brokenEdges.length ? 'Error' : 'Passed',
    'Edge node references',
    brokenEdges.length
      ? `${brokenEdges.length} connection(s) reference a missing source or target node.`
      : 'Every connection references nodes in this workflow schema.',
  ))

  checks.push(createCompatibilityCheck(
    'single-trigger-recommended',
    triggerCount === 1 ? 'Passed' : 'Warning',
    'One starting trigger recommended',
    triggerCount === 1
      ? 'This workflow has one starting trigger.'
      : `This workflow has ${triggerCount} trigger(s). Exactly one starting trigger is recommended for this MVP.`,
  ))

  checks.push(createCompatibilityCheck(
    'at-least-one-action-recommended',
    actionCount > 0 ? 'Passed' : 'Warning',
    'At least one action recommended',
    actionCount > 0
      ? 'This workflow includes at least one action block.'
      : 'Add at least one action block before mapping this draft to backend behavior later.',
  ))

  const conditionLabelIssues = normalizedNodes.filter((node) => {
    if (node.data?.kind !== 'condition') return false

    const labels = normalizedEdges
      .filter((edge) => edge.source === node.id)
      .map((edge) => String(edge.label || '').trim().toLowerCase())

    if (labels.length < 2) return false

    return !labels.includes('yes') || !labels.includes('no')
  })
  checks.push(createCompatibilityCheck(
    'condition-branch-labels',
    conditionLabelIssues.length ? 'Warning' : 'Passed',
    'Condition branch labels',
    conditionLabelIssues.length
      ? `${conditionLabelIssues.length} condition node(s) with multiple outgoing paths should have Yes and No labels.`
      : 'Condition branch labels are compatible where multiple paths exist.',
  ))

  checks.push(createCompatibilityCheck(
    'no-execution-enabled-nodes',
    unsafeExecutionNodes.length ? 'Error' : 'Passed',
    'No executable nodes',
    unsafeExecutionNodes.length
      ? 'This schema contains an execution-enabled block and must remain visual-only.'
      : 'The workflow schema contains no execution-enabled blocks.',
  ))

  return {
    status: getCompatibilityStatus(checks),
    checks,
  }
}

function createCompatibilityCheck(id, status, title, message) {
  return { id, status, title, message }
}

function getCompatibilityStatus(checks) {
  if (checks.some((check) => check.status === 'Error')) return 'Error'
  if (checks.some((check) => check.status === 'Warning')) return 'Warning'
  return 'Passed'
}

function getCompatibilityCheckCounts(result) {
  return {
    Passed: result.checks.filter((check) => check.status === 'Passed').length,
    Warning: result.checks.filter((check) => check.status === 'Warning').length,
    Error: result.checks.filter((check) => check.status === 'Error').length,
  }
}
function normalizeSavedNodes(savedNodes) {
  if (!Array.isArray(savedNodes)) return []

  return savedNodes
    .filter((node) => node?.id && node?.data)
    .map((node) => ({
      ...node,
      type: nodeType,
      position: node.position || { x: 100, y: 100 },
      data: normalizeNodeData(node.data),
    }))
}

function normalizeSavedEdges(savedEdges) {
  if (!Array.isArray(savedEdges)) return []

  return savedEdges
    .filter((edge) => edge?.id && edge?.source && edge?.target)
    .map((edge) => ({
      ...defaultEdgeOptions,
      ...edge,
      type: edge.type || 'smoothstep',
    }))
}

function createSettingsForm(node) {
  if (!node) {
    return {
      label: '',
      description: '',
      campaignId: '',
      leadStatus: '',
      draftType: 'manual',
      assignee: '',
      moveLeadStatus: '',
      notificationMessage: '',
      duration: '1',
      unit: 'days',
      yesLabel: 'Yes',
      noLabel: 'No',
    }
  }

  return {
    label: node.data.label,
    description: node.data.description,
    campaignId: node.data.settings?.campaignId || '',
    leadStatus: node.data.settings?.leadStatus || '',
    draftType: node.data.settings?.draftType || 'manual',
    assignee: node.data.settings?.assignee || '',
    moveLeadStatus: node.data.settings?.moveLeadStatus || '',
    notificationMessage: node.data.settings?.notificationMessage || '',
    duration: node.data.settings?.duration || '1',
    unit: node.data.settings?.unit || 'days',
    yesLabel: node.data.settings?.yesLabel || 'Yes',
    noLabel: node.data.settings?.noLabel || 'No',
  }
}

function buildSettingsForNode(node, form) {
  if (node.data.kind === 'trigger') {
    return {
      ...node.data.settings,
      campaignId: form.campaignId,
      leadStatus: form.leadStatus,
    }
  }

  if (node.data.kind === 'action') {
    return {
      ...node.data.settings,
      actionType: node.data.settings?.actionType || node.data.label,
      draftType: form.draftType,
      assignee: form.assignee,
      moveLeadStatus: form.moveLeadStatus,
      notificationMessage: form.notificationMessage,
    }
  }

  if (node.data.kind === 'wait') {
    return {
      ...node.data.settings,
      duration: form.duration,
      unit: form.unit,
    }
  }

  if (node.data.kind === 'condition') {
    return {
      ...node.data.settings,
      conditionType: node.data.settings?.conditionType || node.data.label,
      yesLabel: form.yesLabel,
      noLabel: form.noLabel,
    }
  }

  return { ...node.data.settings }
}

function defaultSettingsForKind(kind, label) {
  if (kind === 'trigger') return { campaignId: '', leadStatus: '' }
  if (kind === 'action') {
    return {
      actionType: label,
      draftType: label.includes('AI') ? 'AI' : 'manual',
      assignee: '',
      moveLeadStatus: '',
      notificationMessage: '',
    }
  }
  if (kind === 'wait') return { duration: parseWaitDuration(label), unit: parseWaitUnit(label) }
  if (kind === 'condition') return { conditionType: label.replace(/^If /, ''), yesLabel: 'Yes', noLabel: 'No' }
  return {}
}

function serializeSchemaNode(node) {
  return {
    id: node.id,
    type: node.data.kind,
    category: node.data.category,
    label: node.data.label,
    typeKey: node.data.typeKey || '',
    module: node.data.module || '',
    operation: node.data.operation || '',
    safety: node.data.safety || visualOnlySafety,
    executionEnabled: node.data.executionEnabled === true ? true : false,
    settings: node.data.settings || {},
  }
}

function serializeEdge(edge) {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label || '',
  }
}

function parseWaitDuration(label) {
  const match = label.match(/\d+/)
  return match ? match[0] : '1'
}

function parseWaitUnit(label) {
  const normalized = label.toLowerCase()
  if (normalized.includes('minute')) return 'minutes'
  if (normalized.includes('hour')) return 'hours'
  return 'days'
}

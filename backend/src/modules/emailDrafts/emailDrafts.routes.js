import { Router } from 'express'

import {
  approveEmailDraftController,
  createEmailDraftController,
  generateAiEmailDraftController,
  generateAiReplyDraftController,
  generateCampaignAiEmailDraftsController,
  getEmailDraftByIdController,
  improveEmailDraftWithAiController,
  listEmailDraftsController,
  listReplyDraftsController,
  rejectEmailDraftController,
  sendReplyDraftController,
  submitEmailDraftForApprovalController,
  updateEmailDraftController,
} from './emailDrafts.controller.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'
import { auditAction } from '../../middleware/audit.js'
import { validateBody } from '../../middleware/validate.js'

export const emailDraftsRouter = Router()

const draftTypeValues = ['primary', 'follow_up', 'followup', 'reply', 'manual']
const draftStatusValues = ['draft', 'saved', 'pending_approval', 'approved', 'rejected', 'sent']
const draftBodySchema = {
  campaignId: { type: 'string' },
  leadId: { type: 'string' },
  campaignLeadId: { type: 'string' },
  replyId: { type: 'string' },
  sentEmailId: { type: 'string' },
  draftType: { type: 'string', enum: draftTypeValues },
  subject: { type: 'string', minLength: 1, maxLength: 500 },
  body: { type: 'string', minLength: 1, maxLength: 50000 },
  status: { type: 'string', enum: draftStatusValues },
}

emailDraftsRouter.get('/', listEmailDraftsController)
emailDraftsRouter.post(
  '/',
  validateBody({
    ...draftBodySchema,
    campaignId: { ...draftBodySchema.campaignId, required: true },
    leadId: { ...draftBodySchema.leadId, required: true },
    subject: { ...draftBodySchema.subject, required: true },
    body: { ...draftBodySchema.body, required: true },
  }),
  requirePermission(permissions.EMAIL_DRAFT_WRITE),
  auditAction('email_draft.create', 'email_draft'),
  createEmailDraftController,
)
emailDraftsRouter.get('/reply-drafts', listReplyDraftsController)
emailDraftsRouter.post(
  '/generate-ai',
  validateBody({
    campaignId: { type: 'string' },
    campaignLeadId: { type: 'string', required: true },
    tone: { type: 'string', maxLength: 80 },
    goal: { type: 'string', maxLength: 1000 },
    callToAction: { type: 'string', maxLength: 500 },
    subject: { type: 'string', maxLength: 500 },
    regenerate: { type: 'boolean' },
  }),
  requirePermission(permissions.EMAIL_DRAFT_WRITE),
  auditAction('email_draft.ai_generate', 'email_draft'),
  generateAiEmailDraftController,
)
emailDraftsRouter.post(
  '/generate-ai/campaign/:campaignId',
  validateBody({
    tone: { type: 'string', maxLength: 80 },
    goal: { type: 'string', maxLength: 1000 },
    callToAction: { type: 'string', maxLength: 500 },
    limit: { type: 'number', min: 1, max: 100 },
    regenerate: { type: 'boolean' },
  }),
  requirePermission(permissions.EMAIL_DRAFT_WRITE),
  auditAction('email_draft.ai_generate_campaign', 'campaign', (req) => req.params.campaignId),
  generateCampaignAiEmailDraftsController,
)
emailDraftsRouter.post(
  '/generate-ai/reply',
  validateBody({
    replyId: { type: 'string', required: true },
    tone: { type: 'string', maxLength: 80 },
    intent: { type: 'string', maxLength: 1000 },
    subject: { type: 'string', maxLength: 500 },
    regenerate: { type: 'boolean' },
  }),
  requirePermission(permissions.EMAIL_DRAFT_WRITE),
  auditAction('email_draft.ai_generate_reply', 'reply'),
  generateAiReplyDraftController,
)
emailDraftsRouter.get('/:id', getEmailDraftByIdController)
emailDraftsRouter.patch(
  '/:id',
  validateBody(draftBodySchema, { requireAtLeastOne: true }),
  requirePermission(permissions.EMAIL_DRAFT_WRITE),
  auditAction('email_draft.update', 'email_draft', (req) => req.params.id),
  updateEmailDraftController,
)
emailDraftsRouter.post(
  '/:id/ai-improve',
  validateBody({
    mode: { type: 'string', enum: ['subject', 'grammar', 'both'] },
    tone: { type: 'string', maxLength: 80 },
  }),
  requirePermission(permissions.EMAIL_DRAFT_WRITE),
  auditAction('email_draft.ai_improve', 'email_draft', (req) => req.params.id),
  improveEmailDraftWithAiController,
)
emailDraftsRouter.post(
  '/:id/submit-for-approval',
  requirePermission(permissions.EMAIL_DRAFT_WRITE),
  auditAction('email_draft.submit_for_approval', 'email_draft', (req) => req.params.id),
  submitEmailDraftForApprovalController,
)
emailDraftsRouter.post(
  '/:id/approve',
  requirePermission(permissions.EMAIL_DRAFT_APPROVE),
  auditAction('email_draft.approve', 'email_draft', (req) => req.params.id),
  approveEmailDraftController,
)
emailDraftsRouter.post(
  '/:id/reject',
  validateBody({
    rejectedReason: { type: 'string', maxLength: 2000 },
  }),
  requirePermission(permissions.EMAIL_DRAFT_APPROVE),
  auditAction('email_draft.reject', 'email_draft', (req) => req.params.id),
  rejectEmailDraftController,
)
emailDraftsRouter.post(
  '/:id/send-reply',
  validateBody({
    emailAccountId: { type: 'string' },
  }),
  requirePermission(permissions.EMAIL_SEND),
  auditAction('email_draft.send_reply', 'email_draft', (req) => req.params.id),
  sendReplyDraftController,
)

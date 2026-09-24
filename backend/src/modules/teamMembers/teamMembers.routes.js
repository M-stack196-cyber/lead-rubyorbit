import { Router } from 'express'

import {
  createTeamMemberController,
  deleteTeamMemberController,
  listTeamMembersController,
  updateTeamMemberController,
} from './teamMembers.controller.js'
import { auditAction } from '../../middleware/audit.js'
import { permissions, requirePermission } from '../../middleware/permissions.js'
import { validateBody } from '../../middleware/validate.js'

export const teamMembersRouter = Router()

const roleValues = ['admin', 'manager', 'operator', 'viewer']
const statusValues = ['active', 'disabled']
const teamMemberBodySchema = {
  fullName: { type: 'string', maxLength: 160 },
  email: { type: 'string', email: true, maxLength: 254 },
  role: { type: 'string', enum: roleValues },
  status: { type: 'string', enum: statusValues },
  authUserId: { type: 'string', maxLength: 120 },
}

teamMembersRouter.get(
  '/',
  requirePermission(permissions.TEAM_MEMBER_MANAGE),
  listTeamMembersController,
)
teamMembersRouter.post(
  '/',
  validateBody({
    ...teamMemberBodySchema,
    email: { ...teamMemberBodySchema.email, required: true },
  }),
  requirePermission(permissions.TEAM_MEMBER_MANAGE),
  auditAction('team_member.create', 'team_member'),
  createTeamMemberController,
)
teamMembersRouter.patch(
  '/:id',
  validateBody(teamMemberBodySchema, { requireAtLeastOne: true }),
  requirePermission(permissions.TEAM_MEMBER_MANAGE),
  auditAction('team_member.update', 'team_member', (req) => req.params.id),
  updateTeamMemberController,
)
teamMembersRouter.delete(
  '/:id',
  requirePermission(permissions.TEAM_MEMBER_MANAGE),
  auditAction('team_member.disable', 'team_member', (req) => req.params.id),
  deleteTeamMemberController,
)

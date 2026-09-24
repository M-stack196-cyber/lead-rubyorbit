import {
  createTeamMember,
  deleteTeamMember,
  listTeamMembers,
  updateTeamMember,
} from './teamMembers.service.js'

export async function listTeamMembersController(_req, res, next) {
  try {
    res.json({
      message: 'Team members fetched successfully.',
      data: await listTeamMembers(),
    })
  } catch (error) {
    next(error)
  }
}

export async function createTeamMemberController(req, res, next) {
  try {
    res.status(201).json({
      message: 'Team member created successfully.',
      data: await createTeamMember(req.body),
    })
  } catch (error) {
    next(error)
  }
}

export async function updateTeamMemberController(req, res, next) {
  try {
    res.json({
      message: 'Team member updated successfully.',
      data: await updateTeamMember(req.params.id, req.body),
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteTeamMemberController(req, res, next) {
  try {
    res.json({
      message: 'Team member disabled successfully.',
      data: await deleteTeamMember(req.params.id),
    })
  } catch (error) {
    next(error)
  }
}

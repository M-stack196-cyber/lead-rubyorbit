import {
  archiveEmailAccount,
  createEmailAccount,
  disableEmailAccount,
  enableEmailAccount,
  getEmailAccountById,
  listEmailAccounts,
  updateEmailAccount,
} from './emailAccounts.service.js'

export async function listEmailAccountsController(_req, res, next) {
  try {
    const result = await listEmailAccounts()

    res.json({
      message: 'Email accounts fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function createEmailAccountController(req, res, next) {
  try {
    const result = await createEmailAccount(req.body)

    res.status(201).json({
      message: 'Email account created successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function getEmailAccountByIdController(req, res, next) {
  try {
    const result = await getEmailAccountById(req.params.id)

    res.json({
      message: 'Email account fetched successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function updateEmailAccountController(req, res, next) {
  try {
    const result = await updateEmailAccount(req.params.id, req.body)

    res.json({
      message: 'Email account updated successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function enableEmailAccountController(req, res, next) {
  try {
    const result = await enableEmailAccount(req.params.id)

    res.json({
      message: 'Email account enabled successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function disableEmailAccountController(req, res, next) {
  try {
    const result = await disableEmailAccount(req.params.id)

    res.json({
      message: 'Email account disabled successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function archiveEmailAccountController(req, res, next) {
  try {
    const result = await archiveEmailAccount(req.params.id)

    res.json({
      message: 'Email account archived successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

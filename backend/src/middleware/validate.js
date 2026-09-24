function createHttpError(message, details = []) {
  const error = new Error(message)
  error.statusCode = 400
  error.details = details
  return error
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== ''
}

function validateRule(value, rule, field) {
  const errors = []

  if (rule.required && !hasValue(value)) {
    return [`${field} is required.`]
  }

  if (!hasValue(value)) {
    return errors
  }

  if (rule.type === 'array') {
    if (!Array.isArray(value)) {
      return [`${field} must be an array.`]
    }

    if (rule.minItems && value.length < rule.minItems) {
      errors.push(`${field} must include at least ${rule.minItems} item(s).`)
    }

    if (rule.itemType) {
      value.forEach((item, index) => {
        if (typeof item !== rule.itemType) {
          errors.push(`${field}[${index}] must be a ${rule.itemType}.`)
        }
      })
    }

    return errors
  }

  if (rule.type === 'number') {
    const numberValue = Number(value)

    if (!Number.isFinite(numberValue)) {
      return [`${field} must be a number.`]
    }

    if (rule.min !== undefined && numberValue < rule.min) {
      errors.push(`${field} must be at least ${rule.min}.`)
    }

    if (rule.max !== undefined && numberValue > rule.max) {
      errors.push(`${field} must be at most ${rule.max}.`)
    }

    return errors
  }

  if (rule.type === 'boolean' && typeof value !== 'boolean') {
    return [`${field} must be a boolean.`]
  }

  if (rule.type === 'object' && !isPlainObject(value)) {
    return [`${field} must be an object.`]
  }

  if (rule.type === 'string') {
    if (typeof value !== 'string') {
      return [`${field} must be a string.`]
    }

    const trimmed = value.trim()

    if (rule.minLength && trimmed.length < rule.minLength) {
      errors.push(`${field} must be at least ${rule.minLength} character(s).`)
    }

    if (rule.maxLength && trimmed.length > rule.maxLength) {
      errors.push(`${field} must be at most ${rule.maxLength} character(s).`)
    }

    if (rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      errors.push(`${field} must be a valid email address.`)
    }
  }

  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(`${field} must be one of: ${rule.enum.join(', ')}.`)
  }

  return errors
}

export function validateBody(schema, { requireAtLeastOne = false } = {}) {
  return (req, _res, next) => {
    const body = req.body || {}

    if (!isPlainObject(body)) {
      next(createHttpError('Request body must be a JSON object.'))
      return
    }

    const errors = []

    for (const [field, rule] of Object.entries(schema)) {
      errors.push(...validateRule(body[field], rule, field))
    }

    if (requireAtLeastOne && !Object.keys(schema).some((field) => hasValue(body[field]))) {
      errors.push('At least one supported field is required.')
    }

    if (errors.length) {
      next(createHttpError('Request validation failed.', errors))
      return
    }

    next()
  }
}

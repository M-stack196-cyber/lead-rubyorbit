const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeLead(rawLead = {}) {
  return {
    name: cleanValue(rawLead.name),
    email: cleanValue(rawLead.email)?.toLowerCase() || '',
    phone: cleanValue(rawLead.phone),
    company: cleanValue(rawLead.company),
    website: cleanValue(rawLead.website),
    linkedin_url: cleanValue(rawLead.linkedin_url),
    location: cleanValue(rawLead.location),
    notes: cleanValue(rawLead.notes),
    source: cleanValue(rawLead.source),
  }
}

export function validateLead(rawLead = {}, seenEmails = new Set()) {
  const lead = normalizeLead(rawLead)
  const errors = []
  const warnings = []

  const hasMeaningfulField = Boolean(
    lead.email || lead.phone || lead.company || lead.name,
  )

  if (!hasMeaningfulField) {
    errors.push('At least one contact field is required: email, phone, company, or name.')
  }

  if (lead.email && !emailRegex.test(lead.email)) {
    errors.push('Invalid email format.')
  }

  let isDuplicate = false

  if (lead.email) {
    if (seenEmails.has(lead.email)) {
      isDuplicate = true
      warnings.push('Duplicate email inside this upload.')
    } else {
      seenEmails.add(lead.email)
    }
  }

  let status = 'valid'

  if (errors.length > 0) {
    status = 'invalid'
  } else if (isDuplicate) {
    status = 'duplicate'
  } else if (!lead.email || !lead.name || !lead.company) {
    status = 'needs_review'
  }

  return {
    ...lead,
    row_status: status,
    errors,
    warnings,
    is_valid: status === 'valid' || status === 'needs_review',
    is_duplicate: isDuplicate,
  }
}

export function validateLeads(rawLeads = []) {
  const seenEmails = new Set()

  return rawLeads.map((lead, index) => ({
    row_number: index + 1,
    ...validateLead(lead, seenEmails),
  }))
}

function cleanValue(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

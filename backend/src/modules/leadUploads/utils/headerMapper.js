const headerMap = {
  name: ['name', 'full_name', 'person_name', 'contact_name', 'lead_name'],
  email: ['email', 'email_address', 'mail', 'contact_email'],
  phone: ['phone', 'phone_number', 'mobile', 'contact_number', 'telephone'],
  company: ['company', 'company_name', 'business_name', 'organization'],
  website: ['website', 'url', 'domain', 'company_website'],
  linkedin_url: ['linkedin', 'linkedin_url', 'linkedin_profile'],
  location: ['location', 'city', 'country', 'address'],
  notes: ['notes', 'note', 'description', 'details'],
  source: ['source', 'lead_source'],
}

export function mapLeadHeaders(row = {}) {
  const normalizedRow = {}

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeKey(key)
    const standardKey = findStandardKey(normalizedKey)

    if (standardKey) {
      normalizedRow[standardKey] = value
    }
  }

  return normalizedRow
}

function findStandardKey(inputKey) {
  for (const [standardKey, aliases] of Object.entries(headerMap)) {
    if (aliases.includes(inputKey)) {
      return standardKey
    }
  }

  return null
}

function normalizeKey(key = '') {
  return String(key)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
}

const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const phoneRegex = /(?:\+?\d[\d\s().-]{7,}\d)/g
const websiteRegex = /https?:\/\/[^\s]+|www\.[^\s]+/gi
const linkedinRegex = /https?:\/\/(?:www\.)?linkedin\.com\/[^\s]+|www\.linkedin\.com\/[^\s]+/gi

export function parseTextToLeads(text = '', source = 'text_upload') {
  const emails = uniqueMatches(text.match(emailRegex))
  const phones = uniqueMatches(text.match(phoneRegex))
  const websites = uniqueMatches(text.match(websiteRegex))
  const linkedins = uniqueMatches(text.match(linkedinRegex))

  const maxRows = Math.max(emails.length, phones.length, websites.length, linkedins.length, 1)

  return Array.from({ length: maxRows }).map((_, index) => ({
    name: '',
    email: emails[index] || '',
    phone: phones[index] || '',
    company: '',
    website: websites[index] || '',
    linkedin_url: linkedins[index] || '',
    location: '',
    notes: text.slice(0, 1000),
    source,
  }))
}

function uniqueMatches(matches = []) {
  return [...new Set(matches || [])].map((value) => value.trim())
}
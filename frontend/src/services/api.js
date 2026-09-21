const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

async function parseApiResponse(response) {
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.message || `API request failed with status ${response.status}`)
  }

  return payload
}

export async function getBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`)

  return parseApiResponse(response)
}

export async function uploadLeadFile(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/api/lead-uploads/upload`, {
    method: 'POST',
    body: formData,
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function getLeadUploadPreview(uploadId) {
  const response = await fetch(`${API_BASE_URL}/api/lead-uploads/${uploadId}/preview`)

  const payload = await parseApiResponse(response)
  return payload.data
}

export async function confirmLeadUpload(uploadId) {
  const response = await fetch(`${API_BASE_URL}/api/lead-uploads/${uploadId}/confirm`, {
    method: 'POST',
  })

  const payload = await parseApiResponse(response)
  return payload.data
}

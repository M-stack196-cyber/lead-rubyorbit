import fs from 'fs/promises'
import { mapLeadHeaders } from '../utils/headerMapper.js'

export async function parseJsonFile(filePath) {
  const fileContent = await fs.readFile(filePath, 'utf8')
  const parsed = JSON.parse(fileContent)

  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.leads)
      ? parsed.leads
      : []

  return rows.map((row) => mapLeadHeaders(row))
}
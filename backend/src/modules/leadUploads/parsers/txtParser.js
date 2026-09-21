import fs from 'fs/promises'
import { parseTextToLeads } from './textLeadExtractor.js'

export async function parseTxtFile(filePath) {
  const text = await fs.readFile(filePath, 'utf8')

  return parseTextToLeads(text, 'txt_upload')
}

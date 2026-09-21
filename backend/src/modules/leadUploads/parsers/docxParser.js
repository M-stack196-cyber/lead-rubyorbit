import mammoth from 'mammoth'
import { parseTextToLeads } from './textLeadExtractor.js'

export async function parseDocxFile(filePath) {
  const result = await mammoth.extractRawText({ path: filePath })
  return parseTextToLeads(result.value || '', 'docx_upload')
}
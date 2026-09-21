import fs from 'fs/promises'
import { parseTextToLeads } from './textLeadExtractor.js'

export async function parsePdfFile(filePath) {
  const buffer = await fs.readFile(filePath)
  const { PDFParse } = await import('pdf-parse')

  const parser = new PDFParse({
    data: buffer,
  })

  const result = await parser.getText()

  await parser.destroy()

  return parseTextToLeads(result.text || '', 'pdf_upload')
}

import xlsx from 'xlsx'
import { mapLeadHeaders } from '../utils/headerMapper.js'

export function parseXlsxFile(filePath) {
  const workbook = xlsx.readFile(filePath)
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    return []
  }

  const worksheet = workbook.Sheets[firstSheetName]
  const rows = xlsx.utils.sheet_to_json(worksheet, {
    defval: '',
  })

  return rows.map((row) => mapLeadHeaders(row))
}
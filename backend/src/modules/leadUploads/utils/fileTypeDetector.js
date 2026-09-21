import path from 'path'

const supportedExtensions = new Set([
  '.csv',
  '.xlsx',
  '.xls',
  '.txt',
  '.json',
  '.doc',
  '.docx',
  '.pdf',
])

export function detectFileType(fileName = '') {
  const extension = path.extname(fileName).toLowerCase()

  if (!supportedExtensions.has(extension)) {
    return {
      supported: false,
      extension,
      type: null,
    }
  }

  const typeMap = {
    '.csv': 'csv',
    '.xlsx': 'xlsx',
    '.xls': 'xlsx',
    '.txt': 'txt',
    '.json': 'json',
    '.doc': 'docx',
    '.docx': 'docx',
    '.pdf': 'pdf',
  }

  return {
    supported: true,
    extension,
    type: typeMap[extension],
  }
}
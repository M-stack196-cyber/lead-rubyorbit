import fs from 'fs'
import csvParser from 'csv-parser'
import { mapLeadHeaders } from '../utils/headerMapper.js'

export function parseCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const rows = []

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        rows.push(mapLeadHeaders(row))
      })
      .on('end', () => {
        resolve(rows)
      })
      .on('error', (error) => {
        reject(error)
      })
  })
}
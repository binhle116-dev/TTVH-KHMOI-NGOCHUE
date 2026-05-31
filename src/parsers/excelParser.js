import * as XLSX from 'xlsx'
import { dateKey, normalizeText, parseDate } from '../utils/shipmentUtils'

function hasTextMatch(left, right) {
  const a = normalizeText(left)
  const b = normalizeText(right)
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

function matchesPost(sourcePost, postCode, postName) {
  return hasTextMatch(sourcePost, postCode) || hasTextMatch(sourcePost, postName)
}

export function parseWorkbookRows(workbook) {
  const sheetName = workbook.SheetNames.find((name) => name.toLowerCase().includes('chi')) || workbook.SheetNames[0]
  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    raw: true,
    defval: '',
  })
  const sourceSheetName = workbook.SheetNames.find((name) => normalizeText(name) === 'nguon')
  const sourceRows = sourceSheetName
    ? XLSX.utils.sheet_to_json(workbook.Sheets[sourceSheetName], { header: 1, raw: true, defval: '' })
        .map((row) => ({
          finalStatus: String(row[24] || '').trim(),
          post: String(row[25] || '').trim(),
        }))
        .filter((row) => row.post)
    : []
  const headerIndex = matrix.findIndex((row) => String(row[0]).trim() === 'Số hiệu BG')
  if (headerIndex < 0) return []

  return matrix
    .slice(headerIndex + 1)
    .map((row) => {
      const parsedDate = parseDate(row[5])
      if (!row[0] || !parsedDate) return null
      const finalStatus = String(row[12] || row[9] || row[7] || '').trim()
      return {
        code: String(row[0]).trim(),
        province: String(row[4] || '#N/A').trim() || '#N/A',
        postCode: String(row[2] || '').trim(),
        deliveryPost: String(row[3] || '').trim(),
        date: dateKey(parsedDate),
        direction: String(row[6] || '#N/A').trim() || '#N/A',
        firstStatus: String(row[7] || '').trim(),
        firstDeliveryDate: parseDate(row[8]) ? dateKey(parseDate(row[8])) : null,
        lastPosition: String(row[11] || '').trim(),
        reasonText: String(row[12] || '').trim(),
        finalStatus,
        sourceNoInfoAtPost: sourceRows.some(
          (sourceRow) =>
            normalizeText(sourceRow.finalStatus).includes('chua co thong tin phat') &&
            matchesPost(sourceRow.post, row[2], row[3]),
        ),
        j3Days: Number.isFinite(Number(row[15])) ? Number(row[15]) : null,
      }
    })
    .filter(Boolean)
}

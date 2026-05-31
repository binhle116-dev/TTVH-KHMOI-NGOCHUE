import * as XLSX from 'xlsx'

export function parseCustomerSupportCsv(csvText) {
  const workbook = XLSX.read(csvText, { type: 'string' })
  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
    header: 1,
    raw: false,
    defval: '',
  })

  return matrix
    .slice(1)
    .map((row) => {
      const code = String(row[2] || '').trim()
      if (!code || code === 'Mã BG hỗ trợ') return null
      const request = String(row[4] || '').trim()
      const finalResult = String(row[20] || row[19] || row[18] || row[17] || '').trim()
      const cause = String(row[21] || '').trim()
      const attempt2 = [row[13], row[14], row[18]].some((value) => String(value || '').trim())
      const attempt3 = [row[15], row[16], row[19]].some((value) => String(value || '').trim())

      return {
        supportDate: String(row[1] || '').trim(),
        code,
        requester: String(row[3] || '').trim(),
        request,
        requestedDeliveryDate: String(row[5] || '').trim(),
        staff: String(row[6] || 'Chưa rõ').trim() || 'Chưa rõ',
        unit: String(row[7] || 'Chưa rõ').trim() || 'Chưa rõ',
        content: String(row[8] || '').trim(),
        finalResult,
        cause,
        attempts: attempt3 ? 3 : attempt2 ? 2 : 1,
      }
    })
    .filter(Boolean)
}

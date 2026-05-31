import * as XLSX from 'xlsx'

export function parseDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return null
    return new Date(parsed.y, parsed.m - 1, parsed.d)
  }

  const text = String(value).trim().split(' ')[0]
  const parts = text.includes('/') ? text.split('/') : text.split('-')
  if (parts.length !== 3) return null
  if (parts[0].length === 4) return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
}

export function dayDiff(start, end) {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.floor((endUtc - startUtc) / 86400000)
}

export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

export function shortDate(key) {
  const [, month, day] = key.split('-')
  return `${day}/${month}`
}

export function normalizeProvince(value) {
  return String(value || '#N/A')
    .replace(/^Tỉnh\s+/i, '')
    .replace(/^TP\.\s+/i, '')
    .replace('Thừa Thiên Huế', 'Huế')
    .trim()
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatPercent(value, digits = 1) {
  return `${Number(value || 0).toFixed(digits)}%`
}

export function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function hasTextMatch(left, right) {
  const a = normalizeText(left)
  const b = normalizeText(right)
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

export function normalizeCode(value) {
  return String(value || '').replace(/\s+/g, '').toUpperCase()
}

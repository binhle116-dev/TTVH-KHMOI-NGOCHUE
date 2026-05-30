import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Clipboard, FileDown, FileSpreadsheet, Upload } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import seedRows from './data/seedRows.json'
import laborShortage from './data/laborShortage.json'
import './App.css'

const SUCCESS = 'Đã phát thành công'
const FAIL = 'Chưa phát được'
const NO_INFO = 'Chưa có TT phát'
const RETURNED = 'Phát hoàn thành công'
const CSKH_CSV_URL =
  'https://docs.google.com/spreadsheets/d/11bry91Q4H0JJMiKB2rjBgJSA85bJ5l0MsnYEQ15cLms/gviz/tq?tqx=out:csv&gid=0'
const COLORS = {
  success: '#43bd83',
  fail: '#eb3b68',
  noInfo: '#f4a51c',
  purple: '#554ce4',
}
const STORAGE_ROWS_KEY = 'sla_dashboard_rows_v1'
const STORAGE_FILENAME_KEY = 'sla_dashboard_filename_v1'

function loadPersistedRows() {
  try {
    const raw = localStorage.getItem(STORAGE_ROWS_KEY)
    if (!raw) return seedRows
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length ? parsed : seedRows
  } catch {
    return seedRows
  }
}

function loadPersistedFileName() {
  try {
    return localStorage.getItem(STORAGE_FILENAME_KEY) || 'C020016132 - PHẠM THỊ NGỌC HUẾ_FN.xlsx'
  } catch {
    return 'C020016132 - PHẠM THỊ NGỌC HUẾ_FN.xlsx'
  }
}

function parseDate(value) {
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

function dayDiff(start, end) {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.floor((endUtc - startUtc) / 86400000)
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function shortDate(key) {
  const [, month, day] = key.split('-')
  return `${day}/${month}`
}

function normalizeProvince(value) {
  return String(value || '#N/A')
    .replace(/^Tỉnh\s+/i, '')
    .replace(/^TP\.\s+/i, '')
    .replace('Thừa Thiên Huế', 'Huế')
    .trim()
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatPercent(value, digits = 1) {
  return `${Number(value || 0).toFixed(digits)}%`
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function hasTextMatch(left, right) {
  const a = normalizeText(left)
  const b = normalizeText(right)
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

function matchesPost(sourcePost, postCode, postName) {
  return hasTextMatch(sourcePost, postCode) || hasTextMatch(sourcePost, postName)
}

function matchesLaborShortage(row) {
  return laborShortage.some((item) => {
    const provinceMatched = hasTextMatch(item.province, row.province) || hasTextMatch(item.province, row.postCode)
    const unitMatched = hasTextMatch(item.unit, row.deliveryPost)
    return provinceMatched || unitMatched
  })
}

function normalizeCode(value) {
  return String(value || '').replace(/\s+/g, '').toUpperCase()
}

function classifySupportOutcome(row, shipment) {
  const finalText = normalizeText(row.finalResult)
  const shipmentStatus = normalizeText(shipment?.finalStatus)

  if (shipmentStatus.includes('da phat thanh cong') || finalText.includes('da phat thanh cong')) return 'success'
  if (shipmentStatus.includes('chua co tt phat') || finalText.includes('chua co thong tin phat')) return 'noInfo'
  if (
    shipmentStatus.includes('phat hoan') ||
    /chuyen hoan|dong ch|da ch |bg da.*ch|hoan sau 3 ca|sau 3 ca phat/.test(finalText)
  ) {
    return 'returned'
  }
  return 'fail'
}

function parseWorkbookRows(workbook) {
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

function parseCustomerSupportCsv(csvText) {
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

function buildCustomerSupportDashboard(supportRows, shipmentRows) {
  const total = supportRows.length
  const uniqueCodes = new Set(supportRows.map((row) => row.code)).size
  const success = supportRows.filter((row) => row.finalResult.includes(SUCCESS)).length
  const returned = supportRows.filter((row) => /hoàn|chuyển hoàn|chuyen hoan/i.test(row.finalResult + row.content)).length
  const multiAttempt = supportRows.filter((row) => row.attempts >= 2).length
  const shipmentMap = new Map(shipmentRows.map((row) => [normalizeCode(row.code), row]))
  const matched = supportRows.filter((row) => shipmentMap.has(normalizeCode(row.code)))
  const matchedSuccess = matched.filter((row) => shipmentMap.get(normalizeCode(row.code))?.finalStatus === SUCCESS).length

  const byRequestMap = supportRows.reduce((acc, row) => {
    const key = row.request || 'Yêu cầu khác'
    acc.set(key, (acc.get(key) || 0) + 1)
    return acc
  }, new Map())
  const byStaffMap = supportRows.reduce((acc, row) => {
    const current = acc.get(row.staff) || { name: row.staff, total: 0, success: 0, multiAttempt: 0 }
    current.total += 1
    if (row.finalResult.includes(SUCCESS)) current.success += 1
    if (row.attempts >= 2) current.multiAttempt += 1
    acc.set(row.staff, current)
    return acc
  }, new Map())
  const byUnitMap = supportRows.reduce((acc, row) => {
    const shipment = shipmentMap.get(normalizeCode(row.code))
    const province = shipment ? normalizeProvince(shipment.province) : 'Chưa match tỉnh phát'
    const current = acc.get(province) || { name: province, total: 0, multiAttempt: 0 }
    current.total += 1
    if (row.attempts >= 2) current.multiAttempt += 1
    acc.set(province, current)
    return acc
  }, new Map())
  const supportNoInfoRows = supportRows
    .filter((row) => classifySupportOutcome(row, shipmentMap.get(normalizeCode(row.code))) === 'noInfo')
    .map((row) => ({
      'Ngày hỗ trợ': row.supportDate,
      'Mã BG hỗ trợ': row.code,
      'Người yêu cầu': row.requester,
      'Yêu cầu của KH': row.request,
      'Ngày CH/phát lại': row.requestedDeliveryDate,
      'Nhân viên BĐ xử lý': row.staff,
      'Đơn vị xử lý trên GG Sheet': row.unit,
      'Nội dung gửi BCP hỗ trợ': row.content,
      'Kết quả phát cuối cùng hỗ trợ KH': row.finalResult,
      'Nguyên nhân': row.cause || 'Chưa phân loại',
      'Số lần hỗ trợ': row.attempts,
    }))
  const causeMap = supportRows.reduce((acc, row) => {
    const shipment = shipmentMap.get(normalizeCode(row.code))
    const notDelivered = shipment ? shipment.finalStatus !== SUCCESS : !row.finalResult.includes(SUCCESS)
    const key =
      notDelivered && shipment && matchesLaborShortage(shipment)
        ? 'Thiếu bưu tá/lao động phát'
        : row.cause || 'Chưa phân loại'
    acc.set(key, (acc.get(key) || 0) + 1)
    return acc
  }, new Map())

  return {
    total,
    uniqueCodes,
    success,
    successRate: total ? (success / total) * 100 : 0,
    returned,
    returnedRate: total ? (returned / total) * 100 : 0,
    multiAttempt,
    multiAttemptRate: total ? (multiAttempt / total) * 100 : 0,
    matched,
    matchedSuccessRate: matched.length ? (matchedSuccess / matched.length) * 100 : 0,
    byRequest: [...byRequestMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5),
    byStaff: [...byStaffMap.values()].sort((a, b) => b.total - a.total).slice(0, 5),
    byUnit: [...byUnitMap.values()].sort((a, b) => b.multiAttempt - a.multiAttempt || b.total - a.total).slice(0, 5),
    causes: [...causeMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5),
    supportNoInfoRows,
    daily: [...supportRows.reduce((acc, row) => {
      const key = row.supportDate || 'Chưa rõ ngày'
      const current = acc.get(key) || {
        date: key,
        total: 0,
        success: 0,
        fail: 0,
        noInfo: 0,
        returned: 0,
        notSuccess: 0,
        secondAttempt: 0,
      }
      const outcome = classifySupportOutcome(row, shipmentMap.get(normalizeCode(row.code)))
      current.total += 1
      current[outcome] += 1
      current.notSuccess = current.total - current.success
      if (row.attempts >= 2) current.secondAttempt += 1
      acc.set(key, current)
      return acc
    }, new Map()).values()].map((row) => ({
      ...row,
      successRate: row.total ? (row.success / row.total) * 100 : 0,
      notSuccessRate: row.total ? (row.notSuccess / row.total) * 100 : 0,
      failRate: row.total ? (row.fail / row.total) * 100 : 0,
      noInfoRate: row.total ? (row.noInfo / row.total) * 100 : 0,
      returnedRate: row.total ? (row.returned / row.total) * 100 : 0,
    })),
  }
}

function summarizeRows(group) {
  const today = new Date()
  const total = group.length
  const ptc = group.filter((row) => row.finalStatus === SUCCESS).length
  const phtc = group.filter((row) => row.finalStatus === RETURNED).length
  const completed = ptc + phtc
  const fail = group.filter((row) => row.finalStatus === FAIL).length
  const noInfo = group.filter((row) => row.finalStatus === NO_INFO).length
  const firstFail = group.filter((row) => row.firstStatus === FAIL).length
  const slaOk = group.filter((row) => {
    const acceptedDate = parseDate(row.date)
    if (!acceptedDate) return false
    const firstDeliveryDate = parseDate(row.firstDeliveryDate)
    if (firstDeliveryDate) return dayDiff(acceptedDate, firstDeliveryDate) <= 3
    return dayDiff(acceptedDate, today) <= 3
  }).length

  return {
    total,
    ptc,
    phtc,
    completed,
    fail,
    noInfo,
    firstFail,
    ptcRate: total ? (ptc / total) * 100 : 0,
    completionRate: total ? (completed / total) * 100 : 0,
    sla: total ? (slaOk / total) * 100 : 0,
  }
}

function buildDashboard(rows) {
  const sortedDates = [...new Set(rows.map((row) => row.date))].sort()
  const today = new Date()

  const totals = summarizeRows(rows)
  const total = totals.total
  const ptc = totals.ptc
  const completed = totals.completed
  const fail = rows.filter((row) => row.firstStatus === FAIL).length
  const noInfo = totals.noInfo
  const ptcRate = totals.ptcRate
  const slaRate = totals.sla

  const daily = sortedDates.map((key) => ({
    date: shortDate(key),
    rawDate: key,
    ...summarizeRows(rows.filter((row) => row.date === key)),
  }))

  const directionOrder = ['Nội tỉnh', 'NAM', 'BẮC']
  const directions = directionOrder.map((direction) => {
    const group = rows.filter((row) => row.direction === direction)
    const summary = summarizeRows(group)
    return {
      name: direction === 'NAM' ? 'Hướng Nam' : direction === 'BẮC' ? 'Hướng Bắc' : direction,
      rawName: direction,
      total: summary.total,
      ptcRate: summary.ptcRate,
      sla: summary.sla,
      value: summary.sla,
    }
  })

  const qualityRows = sortedDates.flatMap((date) =>
    directionOrder
      .map((direction) => {
        const group = rows.filter((row) => row.date === date && row.direction === direction)
        if (!group.length) return null
        return {
          date: shortDate(date),
          direction: direction === 'NAM' ? 'Hướng Nam' : direction === 'BẮC' ? 'Hướng Bắc' : direction,
          ...summarizeRows(group),
        }
      })
      .filter(Boolean),
  )

  const status = [
    { name: 'Thành công', value: completed, color: COLORS.success },
    { name: 'Lỗi phát', value: fail, color: COLORS.fail },
    { name: 'Chưa có TT', value: noInfo, color: COLORS.noInfo },
    { name: 'Khác', value: Math.max(total - ptc - fail - noInfo, 0), color: '#cbd5e1' },
  ].filter((item) => item.value > 0)

  const provinceMap = rows.reduce((acc, row) => {
    if (row.firstStatus === FAIL) {
      const province = normalizeProvince(row.province)
      acc.set(province, (acc.get(province) || 0) + 1)
    }
    return acc
  }, new Map())
  const topProvinces = [...provinceMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
  const peakDay = [...daily].sort((a, b) => b.total - a.total)[0]
  const weakestDay = [...daily].sort((a, b) => a.sla - b.sla)[0]
  const topDirection = [...directions].sort((a, b) => b.total - a.total)[0]
  const bestSlaDirection = [...directions].sort((a, b) => b.sla - a.sla)[0]
  const hasNoDeliverySignal = (row) => {
    const firstStatusText = normalizeText(row.firstStatus)
    const finalStatusText = normalizeText(row.finalStatus)
    const hasFirstDeliveryInfo = Boolean(parseDate(row.firstDeliveryDate))
    const firstIsNoInfo =
      !firstStatusText ||
      firstStatusText.includes('chua co tt phat') ||
      firstStatusText.includes('chua co thong tin phat')
    const finalIsNoInfo =
      finalStatusText.includes('chua co tt phat') ||
      finalStatusText.includes('chua co thong tin phat')
    return !hasFirstDeliveryInfo && firstIsNoInfo && finalIsNoInfo
  }
  const deliveryPostOverJ3NoInfo = rows.filter((row) => {
    const acceptedDate = parseDate(row.date)
    if (!acceptedDate) return false
    return row.sourceNoInfoAtPost && dayDiff(acceptedDate, today) > 3 && hasNoDeliverySignal(row)
  })
  const appointmentRows = rows.filter((row) => {
    const text = `${row.reasonText || ''} ${row.firstStatus || ''} ${row.finalStatus || ''}`.toLowerCase()
    return /hẹn|hen|phát lại|phat lai|chờ phát|cho phat/.test(text)
  })
  const missedAppointmentRows = appointmentRows.filter((row) => row.finalStatus !== SUCCESS && row.finalStatus !== RETURNED)
  const noInfoRows = rows.filter((row) => row.finalStatus === NO_INFO)
  const noInfoCauseMap = noInfoRows.reduce((acc, row) => {
    const cause = matchesLaborShortage(row) ? 'BCVH thiếu lao động phát' : 'Lý do khác'
    acc.set(cause, (acc.get(cause) || 0) + 1)
    return acc
  }, new Map())
  const riskMetrics = [
    {
      name: 'Tồn BC phát quá J+3',
      value: deliveryPostOverJ3NoInfo.length,
      rate: total ? (deliveryPostOverJ3NoInfo.length / total) * 100 : 0,
      fill: '#ef476f',
    },
    {
      name: 'Hẹn giao chưa đi đúng ngày',
      value: missedAppointmentRows.length,
      rate: appointmentRows.length ? (missedAppointmentRows.length / appointmentRows.length) * 100 : 0,
      fill: '#f59e0b',
    },
    {
      name: 'Chưa có thông tin phát',
      value: noInfoRows.length,
      rate: total ? (noInfoRows.length / total) * 100 : 0,
      fill: COLORS.noInfo,
    },
  ]
  const noInfoCauses = [...noInfoCauseMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
  const noInfoExportRows = noInfoRows.map((row) => ({
    'Số hiệu BG': row.code,
    'Ngày chấp nhận': row.date,
    'Tỉnh': row.province,
    'Mã BCVH': row.postCode || '',
    'BCVH/Bưu cục phát': row.deliveryPost || '',
    'Hướng chuyển': row.direction,
    'Trạng thái phát cuối cùng': row.finalStatus,
    'Vị trí cuối cùng': row.lastPosition || '',
    'Nguyên nhân': matchesLaborShortage(row) ? 'BCVH thiếu lao động phát' : 'Lý do khác',
  }))

  return {
    ...totals,
    total,
    ptc,
    fail,
    noInfo,
    ptcRate,
    slaRate,
    daily,
    qualityRows,
    directions,
    peakDay,
    weakestDay,
    topDirection,
    bestSlaDirection,
    status,
    topProvinces,
    riskMetrics,
    noInfoCauses,
    noInfoExportRows,
    latestDate: sortedDates.at(-2) || sortedDates.at(-1) || '2026-05-16',
  }
}

function InsightPanel({ data, supportData }) {
  const directionShare = data.topDirection?.total ? (data.topDirection.total / data.total) * 100 : 0
  const earlyDays = data.daily.slice(0, 6)
  const laterDays = data.daily.slice(6)
  const earlySlaValues = earlyDays.map((row) => row.sla)
  const laterSlaValues = laterDays.map((row) => row.sla)
  const earlySlaRange = `${formatPercent(Math.min(...earlySlaValues), 0)} - ${formatPercent(Math.max(...earlySlaValues), 0)}`
  const laterSlaAvg = laterSlaValues.length
    ? laterSlaValues.reduce((sum, value) => sum + value, 0) / laterSlaValues.length
    : 0
  const highPtcDays = [...data.daily]
    .sort((a, b) => b.ptcRate - a.ptcRate)
    .slice(0, 3)
    .map((row) => row.date)
    .join(', ')
  const lowPtcDays = data.daily.filter((row) => row.ptcRate < data.ptcRate).map((row) => row.date).join(', ')
  const firstDay = data.daily[0]?.date
  const sixthDay = data.daily[5]?.date
  const seventhDay = data.daily[6]?.date
  const lastDay = data.daily.at(-1)?.date
  const supportPeakDay = [...supportData.daily].sort((a, b) => b.total - a.total)[0]

  return (
    <section className="insight-panel" aria-label="Nhận xét vận hành" data-export-module="nhan_xet_van_hanh">
      <span>TRUNG TÂM VẬN HÀNH - NHẬN XÉT BỔ SUNG</span>
      <h3>Đánh giá tỷ lệ Đạt SLA & Phát thành công theo chuỗi thời gian</h3>
      <p>
        Theo dữ liệu Dashboard, tổng sản lượng toàn trình ghi nhận <strong>{formatNumber(data.total)}</strong> bưu gửi,
        gồm: Phát thành công thuần (PTC) <strong>{formatNumber(data.ptc)}</strong> bưu gửi, đạt{' '}
        <strong>{formatPercent(data.ptcRate)}</strong>; phát hoàn thành công <strong>{formatNumber(data.phtc)}</strong>{' '}
        bưu gửi; lỗi phát <strong>{formatNumber(data.fail)}</strong> bưu gửi; chưa có thông tin phát{' '}
        <strong>{formatNumber(data.noInfo)}</strong> bưu gửi. Tỷ lệ Đạt SLA J+3 hiện đạt{' '}
        <strong>{formatPercent(data.slaRate)}</strong>.
      </p>
      <p>
        Đánh giá theo chuỗi thời gian: các ngày <strong>{firstDay} đến {sixthDay}</strong> cơ bản đã có dữ liệu phát/lỗi
        phát để đánh giá SLA, tỷ lệ Đạt SLA dao động khoảng <strong>{earlySlaRange}</strong>. Từ ngày{' '}
        <strong>{seventhDay}</strong> đến <strong>{lastDay}</strong>, tỷ lệ Đạt SLA bình quân đạt{' '}
        <strong>{formatPercent(laterSlaAvg)}</strong>; ngày cần theo dõi sát nhất là <strong>{data.weakestDay?.date}</strong>{' '}
        do SLA thấp nhất trong chuỗi. Hướng chuyển chủ đạo là <strong>{data.topDirection?.name}</strong>, chiếm{' '}
        <strong>{formatPercent(directionShare)}</strong> tổng sản lượng; hướng có SLA tốt nhất là{' '}
        <strong>{data.bestSlaDirection?.name}</strong> với <strong>{formatPercent(data.bestSlaDirection?.sla)}</strong>.
      </p>
      <p>
        Về tỷ lệ phát thành công (PTC): các ngày <strong>{highPtcDays}</strong> đang ghi nhận tỷ lệ PTC cao nhất trong
        chuỗi. Các ngày {lowPtcDays ? <strong>{lowPtcDays}</strong> : <strong>không có ngày thấp hơn bình quân</strong>}{' '}
        có tỷ lệ PTC thấp hơn mức bình quân, chủ yếu cần tiếp tục theo dõi nhóm khách hẹn, không liên hệ được, hàng phát
        lại và các bưu gửi chưa có thông tin phát.
      </p>
      <p>
        Về công tác CSKH theo ngày: tổng số đơn cần CSKH theo Google Sheet là{' '}
        <strong>{formatNumber(supportData.total)}</strong> yêu cầu trên <strong>{formatNumber(supportData.uniqueCodes)}</strong>{' '}
        mã bưu gửi. Trong đó, hỗ trợ thành công <strong>{formatNumber(supportData.success)}</strong> đơn, đạt{' '}
        <strong>{formatPercent(supportData.successRate)}</strong>; chưa phát thành công{' '}
        <strong>{formatNumber(supportData.total - supportData.success)}</strong> đơn, chiếm{' '}
        <strong>{formatPercent(100 - supportData.successRate)}</strong>; cần hỗ trợ lần 2 trở lên{' '}
        <strong>{formatNumber(supportData.multiAttempt)}</strong> đơn. Ngày phát sinh nhiều yêu cầu CSKH nhất là{' '}
        <strong>{supportPeakDay?.date}</strong> với <strong>{formatNumber(supportPeakDay?.total)}</strong> yêu cầu.
      </p>
    </section>
  )
}

function KpiCard({ label, value, accent, sub }) {
  return (
    <article className="kpi-card" style={{ '--accent': accent }}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub ? <em>{sub}</em> : null}
    </article>
  )
}

function DonutChart({ items, total }) {
  const segments = items.reduce(
    (acc, item) => {
      const end = acc.cursor + (item.value / total) * 100
      return {
        cursor: end,
        values: [...acc.values, `${item.color} ${acc.cursor}% ${end}%`],
      }
    },
    { cursor: 0, values: [] },
  ).values
  const largest = [...items].sort((a, b) => b.value - a.value)[0]

  return (
    <div className="donut-wrap">
      <div className="donut" style={{ background: `conic-gradient(${segments.join(', ')})` }}>
        <div className="donut-hole" />
      </div>
      {largest ? <strong className="donut-label">{formatPercent((largest.value / total) * 100)}</strong> : null}
    </div>
  )
}

function OverviewTable({ data }) {
  return (
    <table className="dashboard-table overview-table">
      <thead>
        <tr>
          <th>NGÀY NHẬN</th>
          <th>SẢN LƯỢNG</th>
          <th>PTC</th>
          <th>PHTC</th>
          <th>TỈ LỆ PTC</th>
          <th>CHƯA CÓ THÔNG TIN PHÁT</th>
          <th>ĐẠT SLA</th>
        </tr>
      </thead>
      <tbody>
        {data.daily.map((row) => (
          <tr key={row.date}>
            <td>{row.date}</td>
            <td>{formatNumber(row.total)}</td>
            <td className="green">{formatNumber(row.ptc)}</td>
            <td className="green-soft">{formatNumber(row.phtc)}</td>
            <td className="rate-cell">{formatPercent(row.ptcRate)}</td>
            <td className="amber">{formatNumber(row.noInfo)}</td>
            <td>
              <span className={`sla-chip ${row.sla >= 80 ? 'hot' : ''}`}>{formatPercent(row.sla)}</span>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td>TỔNG CỘNG</td>
          <td>{formatNumber(data.total)}</td>
          <td>{formatNumber(data.ptc)}</td>
          <td>{formatNumber(data.phtc)}</td>
          <td>{formatPercent(data.ptcRate)}</td>
          <td>{formatNumber(data.noInfo)}</td>
          <td>{formatPercent(data.slaRate)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

function QualityTable({ rows }) {
  return (
    <table className="dashboard-table quality-table">
      <thead>
        <tr>
          <th>NGÀY</th>
          <th>HƯỚNG CHUYỂN</th>
          <th>SẢN LƯỢNG</th>
          <th>PTC</th>
          <th>PHTC</th>
          <th>TỈ LỆ PTC</th>
          <th>CHƯA CÓ THÔNG TIN PHÁT</th>
          <th>ĐẠT SLA</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.date}-${row.direction}`}>
            <td>{row.date}</td>
            <td>{row.direction}</td>
            <td>{formatNumber(row.total)}</td>
            <td className="green">{formatNumber(row.ptc)}</td>
            <td className="green-soft">{formatNumber(row.phtc)}</td>
            <td className="rate-cell">{formatPercent(row.ptcRate)}</td>
            <td className="amber">{formatNumber(row.noInfo)}</td>
            <td>
              <span className={`sla-chip ${row.sla >= 80 ? 'hot' : ''}`}>{formatPercent(row.sla)}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function RiskIndicatorsPanel({ metrics, causes, exportRows }) {
  function exportNoInfoRows() {
    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chua co TTP')
    worksheet['!cols'] = [
      { wch: 18 },
      { wch: 14 },
      { wch: 22 },
      { wch: 12 },
      { wch: 28 },
      { wch: 14 },
      { wch: 24 },
      { wch: 28 },
      { wch: 26 },
    ]
    XLSX.writeFile(workbook, 'danh_sach_bg_chua_co_thong_tin_phat.xlsx')
  }

  return (
    <article className="panel risk-panel" data-export-module="danh_gia_ton_phat_chua_ttp">
      <div className="risk-head">
        <div>
          <h2>ĐÁNH GIÁ TỒN PHÁT & CHƯA CÓ THÔNG TIN PHÁT</h2>
          <span>Theo trạng thái hiện tại và mốc phát lần đầu</span>
        </div>
        <button className="export-excel" type="button" onClick={exportNoInfoRows} disabled={!exportRows.length}>
          <FileSpreadsheet size={14} /> Bưu gửi chưa phát được
        </button>
      </div>
      <div className="risk-grid">
        <div className="risk-chart">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={metrics} layout="vertical" margin={{ top: 8, right: 52, left: 102, bottom: 4 }}>
              <CartesianGrid horizontal={false} stroke="#edf0f6" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={106} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#667085', fontWeight: 900 }} />
              <Tooltip formatter={(value, name, item) => [`${formatNumber(value)} đơn (${formatPercent(item.payload.rate)})`, name]} cursor={{ fill: 'transparent' }} />
              <Bar isAnimationActive={false} dataKey="value" radius={[0, 7, 7, 0]} barSize={28} label={{ position: 'right', formatter: (value) => formatNumber(value), fill: '#111827', fontWeight: 900 }}>
                {metrics.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="cause-list">
          <h3>Nguyên nhân nhóm chưa có TTP</h3>
          {causes.length ? (
            causes.map((item) => (
              <div className="cause-row" key={item.name}>
                <span>{item.name}</span>
                <strong>{formatNumber(item.value)}</strong>
              </div>
            ))
          ) : (
            <p>Không phát sinh bưu gửi chưa có thông tin phát.</p>
          )}
        </div>
      </div>      <p className="risk-note">
        "Tồn BC phát quá J+3" chỉ tính khi bưu gửi đã đến BCVH dự kiến (đối chiếu Nguon!Z với Chi tiết!C/D), trạng thái
        Nguon!Y là chưa có thông tin phát, chưa có ngày phát lần đầu và số ngày từ chấp nhận đến hiện tại vượt quá J+3.
        Nguyên nhân "BCVH thiếu lao động phát" được xác định bằng danh sách thiếu bưu tá (cột B/D) so với Chi tiết!C/D;
        phần còn lại ghi nhận là lý do khác.
      </p>
    </article>
  )
}

function CustomerSupportPanel({ data, loading, error }) {
  function exportSupportNoInfoRows() {
    const worksheet = XLSX.utils.json_to_sheet(data.supportNoInfoRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chua co thong tin phat')
    worksheet['!cols'] = [
      { wch: 14 },
      { wch: 18 },
      { wch: 20 },
      { wch: 28 },
      { wch: 16 },
      { wch: 20 },
      { wch: 26 },
      { wch: 36 },
      { wch: 36 },
      { wch: 24 },
      { wch: 12 },
    ]
    XLSX.writeFile(workbook, 'danh_sach_bg_chua_co_thong_tin_phat_cskh.xlsx')
  }

  return (
    <section className="panel cskh-panel" aria-label="Đánh giá công tác CSKH" data-export-module="danh_gia_cskh">
      <div className="cskh-head">
        <div>
          <h2>ĐÁNH GIÁ CÔNG TÁC CSKH / HỖ TRỢ KHL</h2>
          <span>{loading ? 'Đang tải dữ liệu Google Sheet...' : error ? 'Không tải được Google Sheet' : 'Nguồn: Tổng hợp thông tin hỗ trợ KHL'}</span>
        </div>
        <div className="cskh-head-actions">
          {error ? <em>{error}</em> : null}
          <button className="export-excel" type="button" onClick={exportSupportNoInfoRows} disabled={!data.supportNoInfoRows.length}>
            <FileSpreadsheet size={14} /> Xuất bưu gửi chưa có thông tin phát
          </button>
        </div>
      </div>

      <div className="cskh-kpis">
        <div>
          <span>Tổng yêu cầu</span>
          <strong>{formatNumber(data.total)}</strong>
          <small>{formatNumber(data.uniqueCodes)} mã BG duy nhất</small>
        </div>
        <div>
          <span>Phát TC sau hỗ trợ</span>
          <strong>{formatPercent(data.successRate)}</strong>
          <small>{formatNumber(data.success)} yêu cầu</small>
        </div>
        <div>
          <span>Hỗ trợ lần 2+</span>
          <strong>{formatPercent(data.multiAttemptRate)}</strong>
          <small>{formatNumber(data.multiAttempt)} yêu cầu</small>
        </div>
        <div>
          <span>Chuyển hoàn sau hỗ trợ</span>
          <strong>{formatPercent(data.returnedRate)}</strong>
          <small>{formatNumber(data.returned)} yêu cầu</small>
        </div>
      </div>

      <div className="cskh-daily">
        <h3>Đánh giá CSKH theo ngày</h3>
        <div className="cskh-daily-grid">
          {data.daily.map((day) => (
            <article className="cskh-day-card" key={day.date}>
              <header>
                <strong>Ngày {day.date}</strong>
                <span>{formatNumber(day.total)} đơn</span>
              </header>
              <div className="cskh-day-row">
                <span>Chưa phát được (Đang xử lý, chuyển tin...)</span>
                <b>{formatNumber(day.fail)}</b>
                <em>{formatPercent(day.failRate)}</em>
              </div>
              <div className="cskh-day-row success">
                <span>Đã phát thành công</span>
                <b>{formatNumber(day.success)}</b>
                <em>{formatPercent(day.successRate)}</em>
              </div>
              <div className="cskh-day-row warning">
                <span>Chưa có thông tin phát (Visibility Blackout)</span>
                <b>{formatNumber(day.noInfo)}</b>
                <em>{formatPercent(day.noInfoRate)}</em>
              </div>
              <div className="cskh-day-row returned">
                <span>Bưu gửi đã chuyển hoàn sau 3 ca phát</span>
                <b>{formatNumber(day.returned)}</b>
                <em>{formatPercent(day.returnedRate)}</em>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="cskh-grid">
        <div className="cskh-chart">
          <h3>Cơ cấu yêu cầu KH</h3>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={data.byRequest} layout="vertical" margin={{ top: 6, right: 36, left: 122, bottom: 2 }}>
              <CartesianGrid horizontal={false} stroke="#edf0f6" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={126} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#667085', fontWeight: 900 }} />
              <Tooltip formatter={(value) => `${formatNumber(value)} yêu cầu`} cursor={{ fill: 'transparent' }} />
              <Bar isAnimationActive={false} dataKey="value" fill={COLORS.purple} radius={[0, 7, 7, 0]} barSize={24} label={{ position: 'right', fill: COLORS.purple, fontWeight: 900 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="cskh-list">
          <h3>Top nhân viên CSKH</h3>
          {data.byStaff.map((item) => (
            <div className="cskh-row" key={item.name}>
              <span>{item.name}</span>
              <strong>{formatNumber(item.total)}</strong>
              <small>{item.success ? `${formatNumber(item.success)} PTC` : `${formatNumber(item.multiAttempt)} lần 2+`}</small>
            </div>
          ))}
        </div>

        <div className="cskh-list">
          <h3>Đơn vị cần nhắc nhiều</h3>
          {data.byUnit.map((item) => (
            <div className="cskh-row" key={item.name}>
              <span>{item.name}</span>
              <strong>{formatNumber(item.multiAttempt)}</strong>
              <small>{formatNumber(item.total)} yêu cầu</small>
            </div>
          ))}
        </div>

        <div className="cskh-list">
          <h3>Nguyên nhân sau hỗ trợ</h3>
          {data.causes.map((item) => (
            <div className="cskh-row" key={item.name}>
              <span>{item.name}</span>
              <strong>{formatNumber(item.value)}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function App() {
  const [rows, setRows] = useState(loadPersistedRows)
  const [supportRows, setSupportRows] = useState([])
  const [supportLoading, setSupportLoading] = useState(true)
  const [supportError, setSupportError] = useState('')
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [fileName, setFileName] = useState(loadPersistedFileName)
  const inputRef = useRef(null)
  const data = useMemo(() => buildDashboard(rows), [rows])
  const supportData = useMemo(() => buildCustomerSupportDashboard(supportRows, rows), [supportRows, rows])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ROWS_KEY, JSON.stringify(rows))
    } catch {
      // Ignore storage write errors.
    }
  }, [rows])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FILENAME_KEY, fileName)
    } catch {
      // Ignore storage write errors.
    }
  }, [fileName])

  useEffect(() => {
    let active = true
    async function loadSupportSheet() {
      try {
        setSupportLoading(true)
        const response = await fetch(CSKH_CSV_URL)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const csv = await response.text()
        const parsed = parseCustomerSupportCsv(csv)
        if (active) {
          setSupportRows(parsed)
          setSupportError('')
        }
      } catch (err) {
        if (active) setSupportError(err instanceof Error ? err.message : 'Không tải được dữ liệu')
      } finally {
        if (active) setSupportLoading(false)
      }
    }
    loadSupportSheet()
    return () => {
      active = false
    }
  }, [])

  async function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    const parsedRows = parseWorkbookRows(workbook)
    if (parsedRows.length) {
      setRows(parsedRows)
      setFileName(file.name)
    }
    event.target.value = ''
  }

  function copySummary() {
    const text = [
      'SLA OPERATIONS DASHBOARD',
      `Tổng sản lượng: ${formatNumber(data.total)}`,
      `Tỉ lệ SLA J+3: ${formatPercent(data.slaRate)}`,
      `PTC + PHTC: ${formatNumber(data.ptc)}`,
      `Lỗi phát: ${formatNumber(data.fail)}`,
      `Chưa TT: ${formatNumber(data.noInfo)}`,
    ].join('\n')
    navigator.clipboard?.writeText(text)
  }

  async function exportModulesToPdf() {
    if (isExportingPdf) return
    const modules = Array.from(document.querySelectorAll('[data-export-module]'))
    if (!modules.length) return

    setIsExportingPdf(true)
    try {
      const pageWidth = 297
      const pageHeight = 210
      const margin = 8
      const maxWidth = pageWidth - margin * 2
      const maxHeight = pageHeight - margin * 2
      const dateToken = new Date().toISOString().slice(0, 10)

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      })

      const groupedIndexes = [[0, 1, 2], [3], [4], [5, 6, 7]]
      const groups = groupedIndexes
        .map((indexes) => indexes.map((index) => modules[index]).filter(Boolean))
        .filter((group) => group.length)

      const createGroupCanvas = async (group) => {
        if (group.length === 1) {
          return html2canvas(group[0], {
            scale: Math.max(2, window.devicePixelRatio || 1),
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
          })
        }

        const stage = document.createElement('div')
        const stageWidth = Math.max(...group.map((el) => el.getBoundingClientRect().width))
        stage.style.position = 'fixed'
        stage.style.left = '-100000px'
        stage.style.top = '0'
        stage.style.width = `${Math.ceil(stageWidth)}px`
        stage.style.background = '#ffffff'
        stage.style.padding = '0'
        stage.style.margin = '0'
        stage.style.zIndex = '-1'

        group.forEach((el, index) => {
          const clone = el.cloneNode(true)
          clone.style.margin = '0'
          clone.style.width = `${Math.ceil(stageWidth)}px`
          if (index > 0) clone.style.marginTop = '12px'
          stage.appendChild(clone)
        })

        document.body.appendChild(stage)
        try {
          return await html2canvas(stage, {
            scale: Math.max(2, window.devicePixelRatio || 1),
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
          })
        } finally {
          stage.remove()
        }
      }

      for (let i = 0; i < groups.length; i += 1) {
        const canvas = await createGroupCanvas(groups[i])
        const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height)
        const renderWidth = canvas.width * scale
        const renderHeight = canvas.height * scale
        const x = (pageWidth - renderWidth) / 2
        const y = (pageHeight - renderHeight) / 2
        if (i > 0) pdf.addPage('a4', 'landscape')
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', x, y, renderWidth, renderHeight, undefined, 'FAST')
      }

      pdf.save(`SLA_dashboard_grouped_${dateToken}.pdf`)
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" />
          <div>
            <h1>SLA OPERATIONS DASHBOARD</h1>
            <p>PHẠM THỊ NGỌC HUẾ <span /> C020016132</p>
          </div>
        </div>
        <div className="actions">
          <button className="date-pill" type="button">Mốc báo cáo: {shortDate(data.latestDate)}/2026</button>
          <input ref={inputRef} className="file-input" type="file" accept=".xlsx,.xls" onChange={handleFile} />
          <button className="action upload" type="button" onClick={() => inputRef.current?.click()}>
            <Upload size={15} /> Nạp Excel
          </button>
          <button className="action pdf" type="button" onClick={exportModulesToPdf} disabled={isExportingPdf}>
            <FileDown size={15} /> {isExportingPdf ? 'Đang xuất PDF...' : 'Xuất PDF (Khổ ngang)'}
          </button>
          <button className="action copy" type="button" onClick={copySummary}>
            <Clipboard size={15} /> Copy
          </button>
        </div>
      </header>

      <section className="kpi-grid" aria-label="KPI tổng quan" data-export-module="kpi_tong_quan">
        <KpiCard label="TỔNG SẢN LƯỢNG" value={formatNumber(data.total)} accent="#64748b" sub={fileName} />
        <KpiCard label="TỈ LỆ SLA J+3" value={formatPercent(data.slaRate)} accent={COLORS.purple} />
        <KpiCard label="PHÁT TC (PTC)" value={formatNumber(data.ptc)} accent={COLORS.success} />
        <KpiCard label="LỖI PHÁT" value={formatNumber(data.fail)} accent={COLORS.fail} />
        <KpiCard label="CHƯA TT (KTC)" value={formatNumber(data.noInfo)} accent={COLORS.noInfo} />
      </section>

      <InsightPanel data={data} supportData={supportData} />

      <RiskIndicatorsPanel metrics={data.riskMetrics} causes={data.noInfoCauses} exportRows={data.noInfoExportRows} />

      <CustomerSupportPanel data={supportData} loading={supportLoading} error={supportError} />

      <section className="content-grid">
        <article className="panel table-panel" data-export-module="bien_dong_sla_chi_tiet">
          <div className="panel-head">
            <div className="panel-title">
              <FileSpreadsheet size={16} />
              <h2>BIẾN ĐỘNG SẢN LƯỢNG & HIỆU SUẤT SLA J+3 CHI TIẾT</h2>
            </div>
            <div className="tab-list" role="tablist" aria-label="Chế độ xem bảng">
              <button
                className={activeTab === 'overview' ? 'active' : ''}
                type="button"
                role="tab"
                aria-selected={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
              >
                Tổng quan
              </button>
              <button
                className={activeTab === 'quality' ? 'active' : ''}
                type="button"
                role="tab"
                aria-selected={activeTab === 'quality'}
                onClick={() => setActiveTab('quality')}
              >
                Chất lượng theo ngày / hướng
              </button>
            </div>
          </div>
          <div className="table-scroll">
            {activeTab === 'overview' ? <OverviewTable data={data} /> : <QualityTable rows={data.qualityRows} />}
          </div>
        </article>

        <aside className="side-grid">
          <article className="panel chart-panel" data-export-module="hieu_suat_sla_theo_huong">
            <h2>HIỆU SUẤT SLA THEO HƯỚNG (%)</h2>
            <ResponsiveContainer width="100%" height={238}>
              <BarChart data={data.directions} margin={{ top: 26, right: 14, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#edf0f6" />
                <XAxis dataKey="name" interval={0} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#667085', fontWeight: 700 }} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip formatter={(value) => formatPercent(value)} cursor={{ fill: 'transparent' }} />
                <Bar isAnimationActive={false} dataKey="value" radius={[8, 8, 0, 0]} fill={COLORS.purple} barSize={54} label={{ position: 'top', formatter: (value) => formatPercent(value), fill: COLORS.purple, fontWeight: 900 }} />
              </BarChart>
            </ResponsiveContainer>
          </article>

          <article className="panel chart-panel donut-card" data-export-module="cau_truc_trang_thai">
            <h2>CẤU TRÚC TRẠNG THÁI (%)</h2>
            <DonutChart items={data.status} total={data.total} />
            <div className="legend">
              {data.status.map((item) => (
                <span key={item.name}><i style={{ background: item.color }} /> {item.name}</span>
              ))}
            </div>
          </article>

          <article className="panel province-panel" data-export-module="top_5_tinh_qua_sla">
            <h2>TOP 5 TỈNH QUÁ SLA (SỐ ĐƠN LỖI THỰC TẾ)</h2>
            <ResponsiveContainer width="100%" height={286}>
              <BarChart data={data.topProvinces} layout="vertical" margin={{ top: 8, right: 42, left: 74, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke="#edf0f6" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={88} tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: '#707786', fontWeight: 800 }} />
                <Tooltip formatter={(value) => `${value} đơn`} cursor={{ fill: 'transparent' }} />
                <Bar isAnimationActive={false} dataKey="value" fill={COLORS.fail} radius={[0, 7, 7, 0]} barSize={28} label={{ position: 'right', fill: COLORS.fail, fontWeight: 900 }} />
              </BarChart>
            </ResponsiveContainer>
          </article>

        </aside>
      </section>
    </main>
  )
}

export default App




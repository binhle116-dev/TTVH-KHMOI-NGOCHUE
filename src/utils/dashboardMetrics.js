import laborShortage from '../data/laborShortage.json'
import { FAIL, NO_INFO, RETURNED, SUCCESS } from '../config/statusConfig'
import {
  dayDiff,
  formatPercent,
  normalizeCode,
  normalizeProvince,
  normalizeText,
  parseDate,
} from './shipmentUtils'

function hasTextMatch(left, right) {
  const a = normalizeText(left)
  const b = normalizeText(right)
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

function matchesLaborShortage(row) {
  return laborShortage.some((item) => {
    const provinceMatched = hasTextMatch(item.province, row.province) || hasTextMatch(item.province, row.postCode)
    const unitMatched = hasTextMatch(item.unit, row.deliveryPost)
    return provinceMatched || unitMatched
  })
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
    completedRate: total ? (completed / total) * 100 : 0,
    sla: total ? (slaOk / total) * 100 : 0,
  }
}

export function buildCustomerSupportDashboard(supportRows, shipmentRows) {
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
    .filter((row) => {
      const shipment = shipmentMap.get(normalizeCode(row.code))
      return shipment?.finalStatus === NO_INFO || classifySupportOutcome(row, shipment) === 'noInfo'
    })
    .map((row) => {
      const shipment = shipmentMap.get(normalizeCode(row.code))
      return {
        'Mã BG': row.code,
        'Ngày CSKH': row.supportDate,
        'Yêu cầu': row.request,
        'Kết quả cuối': row.finalResult,
        'Trạng thái SLA': shipment?.finalStatus || 'Chưa match',
        'Tỉnh phát': shipment?.province || '',
        'BC phát': shipment?.deliveryPost || '',
      }
    })

  const causeMap = supportRows.reduce((acc, row) => {
    const shipment = shipmentMap.get(normalizeCode(row.code))
    const notDelivered = shipment ? shipment.finalStatus !== SUCCESS : !row.finalResult.includes(SUCCESS)
    const key =
      notDelivered && shipment && matchesLaborShortage(shipment)
        ? 'Thiếu bưu tá/lao động phát tại tỉnh'
        : row.cause || 'Lý do khác'
    acc.set(key, (acc.get(key) || 0) + 1)
    return acc
  }, new Map())

  const dailyMap = supportRows.reduce((acc, row) => {
    const key = row.supportDate || 'Chưa rõ ngày'
    const current = acc.get(key) || {
      date: key,
      total: 0,
      fail: 0,
      success: 0,
      noInfo: 0,
      returned: 0,
    }
    current.total += 1
    const outcome = classifySupportOutcome(row, shipmentMap.get(normalizeCode(row.code)))
    if (outcome === 'success') current.success += 1
    else if (outcome === 'noInfo') current.noInfo += 1
    else if (outcome === 'returned') current.returned += 1
    else current.fail += 1
    acc.set(key, current)
    return acc
  }, new Map())

  return {
    total,
    uniqueCodes,
    success,
    pending: total - success,
    pendingRate: total ? ((total - success) / total) * 100 : 0,
    successRate: total ? (success / total) * 100 : 0,
    returned,
    returnedRate: total ? (returned / total) * 100 : 0,
    matchedCount: matched.length,
    matchedRate: total ? (matched.length / total) * 100 : 0,
    matchedSuccess,
    matchedSuccessRate: matched.length ? (matchedSuccess / matched.length) * 100 : 0,
    multiAttempt,
    multiAttemptRate: total ? (multiAttempt / total) * 100 : 0,
    byRequest: [...byRequestMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    byStaff: [...byStaffMap.values()].sort((a, b) => b.total - a.total).slice(0, 5),
    byUnit: [...byUnitMap.values()].sort((a, b) => b.total - a.total).slice(0, 8),
    causes: [...causeMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    daily: [...dailyMap.values()].sort((a, b) => {
      const aDate = parseDate(a.date)
      const bDate = parseDate(b.date)
      if (!aDate || !bDate) return String(a.date).localeCompare(String(b.date))
      return aDate - bDate
    }),
    supportNoInfoRows,
  }
}

export function buildDashboard(rows) {
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
    date: key,
    ...summarizeRows(rows.filter((row) => row.date === key)),
  }))

  const directionOrder = ['Nội tỉnh', 'NAM', 'BẮC']
  const directions = directionOrder.map((direction) => {
    const group = rows.filter((row) => row.direction === direction)
    const summary = summarizeRows(group)
    return {
      name: direction,
      total: summary.total,
      sla: summary.sla,
      ptcRate: summary.ptcRate,
      color: COLORS_BY_DIRECTION[direction] || '#6b6ce8',
    }
  })

  const qualityRows = sortedDates.flatMap((date) =>
    directionOrder.map((direction) => {
      const group = rows.filter((row) => row.date === date && row.direction === direction)
      const summary = summarizeRows(group)
      return {
        date,
        direction,
        total: summary.total,
        ptc: summary.ptc,
        phtc: summary.phtc,
        ptcRate: summary.ptcRate,
        fail: summary.fail,
        noInfo: summary.noInfo,
        sla: summary.sla,
      }
    }),
  )

  const status = [
    { label: 'Thành công', value: completed, color: '#43bd83' },
    { label: 'Lỗi phát', value: fail, color: '#eb3b68' },
    { label: 'Chưa có TTP', value: noInfo, color: '#f4a51c' },
    { label: 'Khác', value: Math.max(0, total - completed - fail - noInfo), color: '#c2c8d6' },
  ]

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
      finalStatusText.includes('chua co tt phat') || finalStatusText.includes('chua co thong tin phat')
    return !hasFirstDeliveryInfo && firstIsNoInfo && finalIsNoInfo
  }

  const deliveryPostOverJ3NoInfo = rows.filter((row) => {
    const acceptedDate = parseDate(row.date)
    if (!acceptedDate) return false
    return hasNoDeliverySignal(row) && row.sourceNoInfoAtPost && dayDiff(acceptedDate, today) > 3
  })
  const appointmentRows = rows.filter((row) => {
    const text = `${row.reasonText || ''} ${row.firstStatus || ''} ${row.finalStatus || ''}`.toLowerCase()
    return /hẹn|hen/.test(text)
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
      label: 'Tồn BC phát quá J+3',
      value: deliveryPostOverJ3NoInfo.length,
      rate: total ? (deliveryPostOverJ3NoInfo.length / total) * 100 : 0,
    },
    {
      label: 'Hẹn giao chưa đi đúng ngày',
      value: missedAppointmentRows.length,
      rate: appointmentRows.length ? (missedAppointmentRows.length / appointmentRows.length) * 100 : 0,
    },
    {
      label: 'Chưa có thông tin phát',
      value: noInfoRows.length,
      rate: total ? (noInfoRows.length / total) * 100 : 0,
    },
  ]
  const noInfoCauses = [...noInfoCauseMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  const noInfoExportRows = noInfoRows.map((row) => ({
    'Mã BG': row.code,
    'Ngày nhận': row.date,
    'Tỉnh phát': row.province,
    'BC phát': row.deliveryPost,
    'Hướng': row.direction,
    'TT phát lần đầu': row.firstStatus || '',
    'Ngày TT phát lần đầu': row.firstDeliveryDate || '',
    'Trạng thái cuối': row.finalStatus || '',
    'Lý do': matchesLaborShortage(row) ? 'BCVH thiếu lao động phát' : 'Lý do khác',
  }))

  return {
    total,
    ptc,
    completed,
    fail,
    noInfo,
    ptcRate,
    slaRate,
    daily,
    directions,
    status,
    topProvinces,
    peakDay,
    weakestDay,
    topDirection,
    bestSlaDirection,
    qualityRows,
    riskMetrics,
    noInfoCauses,
    noInfoExportRows,
  }
}

const COLORS_BY_DIRECTION = {
  'Nội tỉnh': '#554ce4',
  NAM: '#554ce4',
  'Hướng Nam': '#554ce4',
  BẮC: '#554ce4',
  'Hướng Bắc': '#554ce4',
}

export { formatPercent }

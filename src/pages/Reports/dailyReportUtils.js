export function localReportDate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function dailyReportRequest(kind, date, technicianId = '') {
  const params = { date }
  if (kind === 'service-list' && technicianId) params.technician_id = technicianId
  const endpoint = kind === 'summary' ? '/reports/daily-summary/' : '/reports/daily-service-list/'
  return { endpoint, pdfEndpoint: `${endpoint}pdf/`, params }
}

export function formatReportCurrency(value) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(value) || 0)
}

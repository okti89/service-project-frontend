import assert from 'node:assert/strict'
import test from 'node:test'
import { dailyReportRequest, formatReportCurrency, localReportDate } from './dailyReportUtils.js'

test('daily summary uses only the selected date and its own endpoints', () => {
  assert.deepEqual(dailyReportRequest('summary', '2026-09-27', 'ignored-technician'), {
    endpoint: '/reports/daily-summary/',
    pdfEndpoint: '/reports/daily-summary/pdf/',
    params: { date: '2026-09-27' },
  })
})

test('general daily list does not apply a technician filter', () => {
  assert.deepEqual(dailyReportRequest('service-list', '2026-09-27'), {
    endpoint: '/reports/daily-service-list/',
    pdfEndpoint: '/reports/daily-service-list/pdf/',
    params: { date: '2026-09-27' },
  })
})

test('technician filter is identical for the list and PDF request', () => {
  assert.deepEqual(dailyReportRequest('service-list', '2026-09-26', 'technician-1').params, {
    date: '2026-09-26', technician_id: 'technician-1',
  })
})

test('initial date uses the local calendar rather than UTC', () => {
  assert.equal(localReportDate(new Date(2026, 8, 27, 0, 15)), '2026-09-27')
})

test('currency formatting preserves decimal API values and Turkish characters', () => {
  assert.equal(formatReportCurrency('1250.50'), new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(1250.5))
  assert.equal(formatReportCurrency(null), new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(0))
})

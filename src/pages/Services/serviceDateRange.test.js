import assert from 'node:assert/strict'
import test from 'node:test'
import { getServiceDateRange } from './serviceDateRange.js'

test('default range contains only the selected local day', () => {
  assert.deepEqual(getServiceDateRange(new Date(2026, 8, 27, 23, 59)), {
    start_date: '2026-09-27', end_date: '2026-09-27',
  })
})

test('weekly range runs from Monday to Sunday', () => {
  assert.deepEqual(getServiceDateRange(new Date(2026, 8, 27), 'weekly'), {
    start_date: '2026-09-21', end_date: '2026-09-27',
  })
})

test('weekly range can cross the year boundary', () => {
  assert.deepEqual(getServiceDateRange(new Date(2026, 0, 1), 'weekly'), {
    start_date: '2025-12-29', end_date: '2026-01-04',
  })
})

test('monthly range handles leap years', () => {
  assert.deepEqual(getServiceDateRange(new Date(2028, 1, 20), 'monthly'), {
    start_date: '2028-02-01', end_date: '2028-02-29',
  })
})

test('monthly range includes all days in the calendar month', () => {
  assert.deepEqual(getServiceDateRange(new Date(2026, 8, 27), 'monthly'), {
    start_date: '2026-09-01', end_date: '2026-09-30',
  })
})

test('yearly range contains only the selected year', () => {
  assert.deepEqual(getServiceDateRange(new Date(2026, 8, 27), 'yearly'), {
    start_date: '2026-01-01', end_date: '2026-12-31',
  })
})

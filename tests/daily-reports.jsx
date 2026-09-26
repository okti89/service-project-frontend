import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import { DailyServiceList, DailySummary } from '../src/pages/Reports/DailyReport'
import api from '../src/api/api'

const requests = []
let notify = () => {}
let failNext = false
api.defaults.adapter = async (config) => {
  requests.push({ url: config.url, params: config.params })
  notify([...requests])
  await new Promise((resolve) => setTimeout(resolve, config.params?.date === '2026-09-25' ? 1000 : 120))
  if (config.signal?.aborted) throw Object.assign(new Error('Canceled'), { code: 'ERR_CANCELED' })
  if (failNext && config.url.includes('/reports/')) {
    failNext = false
    throw { response: { data: { detail: 'Test raporu yüklenemedi.' } } }
  }
  const filtered = !!config.params?.technician_id
  const row = {
    id: 'service-1', time: '09:30', receipt_number: 'SRV-001', customer_name: 'Test Müşterisi',
    customer_phone: '0555 000 00 00', customer_address: 'Test servis adresi', device_name: 'Test Cihazı',
    operation_name: 'Bakım', technician_name: filtered ? 'Zeynep Test' : 'Ahmet Test',
    status_name: 'Planlandı', status_code: 'assigned', total_amount: '1250.50', payment_method: 'Kart',
  }
  let data
  if (config.url === '/technicians/technician-list/') {
    data = [{ id: 'tech-2', full_name: 'Zeynep Test' }, { id: 'tech-1', full_name: 'Ahmet Test' }]
  } else if (config.url.endsWith('/pdf/')) {
    data = new Blob(['%PDF-1.4\n%%EOF'], { type: 'application/pdf' })
  } else if (config.url === '/reports/daily-summary/') {
    data = { report_date: config.params.date, total_services: 1, total_revenue: '1250.50', collected_total: '750.00', outstanding_total: '500.50', services: config.params.date === '2026-09-24' ? [] : [row], payment_distribution: [{ name: 'Kart', amount: '750.00' }] }
  } else if (config.url === '/reports/daily-service-list/') {
    data = { report_date: config.params.date, total_services: 1, planned_count: 1, in_progress_count: 0, completed_count: 0, technician_name: filtered ? row.technician_name : '', services: [row] }
  } else {
    throw new Error(`Unexpected request: ${config.url}`)
  }
  return { data, status: 200, statusText: 'OK', headers: {}, config }
}

export default function DailyReportsSmokeTest() {
  const [log, setLog] = useState(requests)
  useEffect(() => {
    notify = setLog
    return () => { notify = () => {} }
  }, [])
  return <MemoryRouter initialEntries={['/dashboard/daily-summary']}>
    <nav className="p-3 d-flex gap-3"><Link to="/dashboard/daily-summary">Test: İcmal</Link><Link to="/dashboard/daily-service-lists">Test: Servisler</Link><button onClick={() => { failNext = true }}>Fail next report</button></nav>
    <Routes><Route path="/dashboard/daily-summary" element={<DailySummary />} /><Route path="/dashboard/daily-service-lists" element={<DailyServiceList />} /></Routes>
    <pre aria-label="API request log" className="p-3">{JSON.stringify(log, null, 2)}</pre>
  </MemoryRouter>
}

const root = createRoot(document.getElementById('root'))
root.render(<DailyReportsSmokeTest />)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())

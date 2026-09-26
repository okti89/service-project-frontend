import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import axios from 'axios'
import 'bootstrap/dist/css/bootstrap.min.css'
import Customers from '../src/pages/Customers/Customers'
import CustomerSelect from '../src/components/CustomerSelect'
import api from '../src/api/api'

// Synthetic fixtures only: this page never contacts the production backend.
const fixtures = Array.from({ length: 125 }, (_, index) => ({
  id: `customer-${index}`, full_name: `Customer ${String(index).padStart(3, '0')}`,
  phone_number: `0555000${String(index).padStart(4, '0')}`, address: 'Test address', note: '',
  is_deleted: index >= 120,
}))
let failSecondPage = false
api.defaults.adapter = async (config) => {
  if (config.url !== '/customers/customers/') throw new Error('Unexpected test request')
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 250)
    config.signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new axios.CanceledError())
    }, { once: true })
  })
  if (config.signal?.aborted) throw new axios.CanceledError()
  const { page, page_size: size, search, status } = config.params
  if (page === 2 && failSecondPage) {
    failSecondPage = false
    throw new Error('Synthetic second-page failure')
  }
  const found = fixtures.filter((row) => `${row.full_name} ${row.phone_number}`.toLowerCase().includes(search.toLowerCase()))
  const rows = found.filter((row) => status === 'active' ? !row.is_deleted : status === 'inactive' ? row.is_deleted : true)
  return { status: 200, statusText: 'OK', headers: {}, config, data: {
    count: rows.length, results: rows.slice((page - 1) * size, page * size), next: page * size < rows.length ? 'next' : null,
    summary: { total: found.length, active: found.filter((row) => !row.is_deleted).length, inactive: found.filter((row) => row.is_deleted).length },
  } }
}

export default function SmokeTest() {
  const [customer, setCustomer] = useState(null)
  return <MemoryRouter><main className="container py-4">
    <h1 className="h5">Synthetic Customer Pagination Test</h1>
    <label className="d-block mb-3"><input type="checkbox" onChange={(event) => { failSecondPage = event.target.checked }} /> Fail the next second page</label>
    <div className="mb-4" style={{ maxWidth: 440 }}><CustomerSelect customer={customer} onSelect={setCustomer} /></div>
    <Customers />
  </main></MemoryRouter>
}

const root = createRoot(document.getElementById('root'))
root.render(<SmokeTest />)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())

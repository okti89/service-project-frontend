import { useEffect, useId, useRef, useState } from 'react'
import { Button, Form, Spinner } from 'react-bootstrap'
import useCustomerPages from '../hooks/useCustomerPages'
import CustomerLoadingStatus from './CustomerLoadingStatus'

export default function CustomerSelect({ customer, onSelect }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const listId = useId()
  const { scrollRootRef, sentinelRef, ...pages } = useCustomerPages({ enabled: open, search, status: 'active', pageSize: 20 })

  useEffect(() => {
    if (!open) return
    const dismiss = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])

  const select = (value) => {
    onSelect(value)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="position-relative" onKeyDown={(event) => {
      if (event.key === 'Escape') setOpen(false)
    }}>
      <button type="button" className="form-select text-start" aria-label="Müşteri seç"
        aria-expanded={open} aria-haspopup="listbox" aria-controls={listId} onClick={() => setOpen((value) => !value)}>
        {customer?.id ? `${customer.full_name} - ${customer.phone_number || ''}` : 'Müşteri seçin'}
      </button>
      {open ? (
        <div className="position-absolute start-0 end-0 bg-white border rounded shadow p-2" style={{ zIndex: 1060 }}>
          <Form.Control autoFocus placeholder="İsim veya telefon ile ara..." aria-label="Müşteri ara"
            value={search} onChange={(event) => setSearch(event.target.value)} className="mb-2" />
          {customer?.id ? <Button size="sm" variant="link" onClick={() => select(null)}>Seçimi temizle</Button> : null}
          <div ref={scrollRootRef} style={{ maxHeight: 260, overflowY: 'auto' }}>
            <div id={listId} role="listbox" aria-label="Müşteri arama sonuçları">
              {pages.isLoading ? <div className="text-center p-3"><Spinner animation="border" size="sm" /></div> : null}
              {pages.customers.map((item) => (
                <button key={item.id} type="button" role="option" aria-selected={String(item.id) === String(customer?.id)}
                  className="btn btn-light w-100 text-start mb-1" onClick={() => select(item)}>
                  <span className="d-block fw-semibold">{item.full_name}</span>
                  <small className="text-muted">{item.phone_number || '-'}</small>
                </button>
              ))}
              {!pages.isLoading && !pages.isSearching && !pages.error && !pages.customers.length
                ? <div className="text-muted text-center p-3">Müşteri bulunamadı.</div> : null}
            </div>
            <CustomerLoadingStatus {...pages} sentinelRef={sentinelRef} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

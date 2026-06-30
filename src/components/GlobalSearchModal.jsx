import { useEffect, useMemo, useState } from 'react'
import { Badge, Form, Modal, Spinner } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { FaBoxOpen, FaTools, FaUserCog, FaUsers } from 'react-icons/fa'
import api from '../api/api'

const typeMeta = {
  customer: { label: 'Müşteri', icon: <FaUsers />, route: '/dashboard/customers', color: 'primary' },
  service: { label: 'Servis', icon: <FaTools />, route: '/dashboard/services', color: 'warning' },
  technician: { label: 'Teknisyen', icon: <FaUserCog />, route: '/dashboard/technicians', color: 'info' },
  product: { label: 'Ürün', icon: <FaBoxOpen />, route: '/dashboard/inventory', color: 'success' },
}

function flattenResults(data) {
  const customers = (data?.customers || []).map((item) => ({ ...item, type: 'customer' }))
  const services = (data?.services || []).map((item) => ({ ...item, type: 'service' }))
  const technicians = (data?.technicians || []).map((item) => ({ ...item, type: 'technician' }))
  const products = (data?.products || []).map((item) => ({ ...item, type: 'product' }))
  return [...services, ...customers, ...technicians, ...products]
}

const GlobalSearchModal = ({ show, initialQuery = '', onHide }) => {
  const navigate = useNavigate()
  const [query, setQuery] = useState(initialQuery || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState({ customers: [], services: [], technicians: [], products: [], total: 0 })

  useEffect(() => {
    if (show) {
      setQuery(initialQuery || '')
    }
  }, [show, initialQuery])

  useEffect(() => {
    if (!show) return
    if (!query || query.trim().length < 2) {
      setResult({ customers: [], services: [], technicians: [], products: [], total: 0 })
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await api.get('/global-search/', { params: { q: query.trim() } })
        setResult(response.data || { customers: [], services: [], technicians: [], products: [], total: 0 })
      } catch {
        setResult({ customers: [], services: [], technicians: [], products: [], total: 0 })
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query, show])

  const rows = useMemo(() => flattenResults(result), [result])

  const handleItemClick = (row) => {
    const meta = typeMeta[row.type] || {}
    navigate(meta.route || '/dashboard')
    if (typeof onHide === 'function') onHide()
  }

  return (
    <Modal show={show} onHide={onHide} centered size="lg" className="global-search-modal">
      <Modal.Header closeButton>
        <Modal.Title>Arama</Modal.Title>
      </Modal.Header>
      <Modal.Body className="global-search-body">
        <Form.Control
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Müşteri, servis fiş no, teknisyen, ürün kodu..."
          className="mb-3"
        />

        <div className="global-search-summary">
          <Badge bg="primary">Müşteri: {result.customers?.length || 0}</Badge>
          <Badge bg="warning" text="dark">Servis: {result.services?.length || 0}</Badge>
          <Badge bg="info">Teknisyen: {result.technicians?.length || 0}</Badge>
          <Badge bg="success">Ürün: {result.products?.length || 0}</Badge>
          <Badge bg="dark">Toplam: {result.total || 0}</Badge>
        </div>

        {loading ? (
          <div className="global-search-loading">
            <Spinner animation="border" size="sm" className="me-2" />
            Araniyor...
          </div>
        ) : rows.length === 0 ? (
          <div className="global-search-empty">
            En az 2 karakter yaziniz. Sonuçlar burada listelenir.
          </div>
        ) : (
          <div className="global-search-results">
            {rows.map((row) => {
              const meta = typeMeta[row.type] || {}
              return (
                <button
                  key={`${row.type}-${row.id}`}
                  type="button"
                  className="global-search-item"
                  onClick={() => handleItemClick(row)}
                >
                  <span className="global-search-item-icon">{meta.icon}</span>
                  <span className="global-search-item-main">
                    <strong>{row.title || '-'}</strong>
                    <small>{row.subtitle || '-'}</small>
                  </span>
                  <Badge bg={meta.color || 'secondary'}>{meta.label || row.type}</Badge>
                </button>
              )

            })}
          </div>
        )}
      </Modal.Body>
    </Modal>
  )
}

export default GlobalSearchModal

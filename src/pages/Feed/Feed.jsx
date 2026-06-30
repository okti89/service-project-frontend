import { useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap'
import { FaBell, FaBoxes, FaMoneyBillWave, FaReceipt, FaRegClock, FaTools, FaUserCog, FaFilter, FaSync } from 'react-icons/fa'
import api from '../../api/api'
import '../Home/Dashboard.css'

function toList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

function timeLabel(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function feedMeta(entity) {
  const map = {
    service: { icon: <FaTools />, label: 'Teknik Servis', tone: 'service', badgeBg: 'bg-info-subtle text-info border-info-subtle' },
    technician: { icon: <FaUserCog />, label: 'Teknisyen', tone: 'tech', badgeBg: 'bg-primary-subtle text-primary border-primary-subtle' },
    shift: { icon: <FaRegClock />, label: 'Mesai / Vardiya', tone: 'shift', badgeBg: 'bg-warning-subtle text-warning border-warning-subtle' },
    stock: { icon: <FaBoxes />, label: 'Stok / Depo', tone: 'stock', badgeBg: 'bg-purple-subtle text-purple border-purple-subtle' },
    payment: { icon: <FaMoneyBillWave />, label: 'Finans / Ödeme', tone: 'payment', badgeBg: 'bg-success-subtle text-success border-success-subtle' },
    payroll: { icon: <FaReceipt />, label: 'Bordro / Maaş', tone: 'payroll', badgeBg: 'bg-danger-subtle text-danger border-danger-subtle' },
  }
  return map[entity] || { icon: <FaBell />, label: 'Sistem', tone: 'default', badgeBg: 'bg-light text-dark' }
}

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function getCurrentYear() {
  return String(new Date().getFullYear())
}

const Feed = () => {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [period, setPeriod] = useState('monthly')
  const [selectedDate, setSelectedDate] = useState(getToday())
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())

  const load = async () => {
    setIsLoading(true)
    setError('')
    try {
      const params = { limit: 180, period }
      if (period === 'daily') params.date = selectedDate
      if (period === 'monthly') params.month = selectedMonth
      if (period === 'yearly') params.year = selectedYear

      const response = await api.get('/notifications/feed/', { params })
      setItems(toList(response.data))
    } catch {
      setError('Haber akışı yüklenemedi.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [period, selectedDate, selectedMonth, selectedYear])

  const filtered = useMemo(() => {
    if (!typeFilter) return items
    return items.filter((item) => item.entity === typeFilter)
  }, [items, typeFilter])

  return (
    <div className="container-fluid py-4 px-3" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-extrabold m-0 text-dark d-flex align-items-center">
            <FaBell className="me-3 text-primary" />
            Haber & Aktivite Akışı
          </h2>
          <p className="text-muted small mb-0 mt-1">Sistem üzerinde gerçekleşen tüm operasyonel ve finansal aktiviteleri gerçek zamanlı takip edin.</p>
        </div>
        <Button variant="white" className="border shadow-sm d-flex align-items-center gap-2 fw-semibold" onClick={load} disabled={isLoading}>
          <FaSync className={isLoading ? 'fa-spin' : ''} />
          Yenile
        </Button>
      </div>

      {/* Filter bar */}
      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Body className="p-3">
          <Row className="g-3 align-items-end">
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-bold text-secondary small d-flex align-items-center gap-2">
                  <FaFilter className="text-primary" />
                  Dönem Filtresi
                </Form.Label>
                <Form.Select
                  size="sm"
                  className="rounded-3 py-2 border-secondary-subtle"
                  value={period}
                  onChange={(event) => setPeriod(event.target.value)}
                >
                  <option value="daily">Günlük Akış</option>
                  <option value="monthly">Aylık Akış</option>
                  <option value="yearly">Yıllık Akış</option>
                </Form.Select>
              </Form.Group>
            </Col>
            
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-bold text-secondary small">Dönem Seçimi</Form.Label>
                {period === 'daily' && (
                  <Form.Control
                    size="sm"
                    className="rounded-3 py-2 border-secondary-subtle"
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                  />
                )}
                {period === 'monthly' && (
                  <Form.Control
                    size="sm"
                    className="rounded-3 py-2 border-secondary-subtle"
                    type="month"
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                  />
                )}
                {period === 'yearly' && (
                  <Form.Control
                    size="sm"
                    className="rounded-3 py-2 border-secondary-subtle"
                    type="number"
                    min={2000}
                    max={2100}
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(event.target.value)}
                  />
                )}
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-bold text-secondary small">Aktivite Tipi</Form.Label>
                <Form.Select
                  size="sm"
                  className="rounded-3 py-2 border-secondary-subtle"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                >
                  <option value="">Tüm Aktivite Tipleri</option>
                  <option value="service">Teknik Servis</option>
                  <option value="technician">Teknisyen</option>
                  <option value="shift">Mesai / Vardiya</option>
                  <option value="stock">Stok / Depo</option>
                  <option value="payment">Finans / Ödeme</option>
                  <option value="payroll">Bordro / Maaş</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={3}>
              <Button variant="primary" className="w-100 fw-bold py-2 rounded-3 shadow-sm" onClick={load} disabled={isLoading}>
                Listele
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger" className="rounded-3 shadow-sm">{error}</Alert>}

      {/* Feed Timeline Card */}
      <Card className="border shadow-sm rounded-4 bg-white overflow-hidden">
        <Card.Body className="p-4">
          {isLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted mt-2 small">Aktiviteler getiriliyor...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-5">
              <div className="text-muted fs-5 mb-2">Gösterilecek Aktivite Yok</div>
              <p className="text-muted small mb-0">Seçilen dönem ve kriterlere uygun herhangi bir işlem kaydı bulunamadı.</p>
            </div>
          ) : (
            <div className="feed-list">
              {filtered.map((item) => {
                const meta = feedMeta(item.entity)
                return (
                  <div className={`feed-card tone-${meta.tone} p-3 mb-2 rounded-3 border-light border bg-light-subtle d-flex align-items-start gap-3`} key={item.id}>
                    <div className="feed-icon d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', fontSize: '1.1rem', borderRadius: '12px' }}>
                      {meta.icon}
                    </div>
                    <div className="feed-main flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                        <div>
                          <h6 className="feed-title fw-bold text-dark mb-1">{item.title}</h6>
                          <p className="feed-description text-muted small mb-2">{item.message || '-'}</p>
                        </div>
                        <Badge className={`border rounded-pill px-2.5 py-1.5 fw-semibold ${meta.badgeBg}`}>
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="feed-meta d-flex justify-content-between align-items-center mt-2 border-top pt-2" style={{ fontSize: '0.75rem' }}>
                        <span className="text-muted d-flex align-items-center gap-1">
                          <FaRegClock size={11} /> {timeLabel(item.created_at)}
                        </span>
                        {item.related_screen ? (
                          <a href={item.related_screen} className="feed-link text-primary fw-bold text-decoration-none">
                            İlgili Ekrana Git &rarr;
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}

export default Feed


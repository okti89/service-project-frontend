import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Badge, Button, ButtonGroup, Card, Col, Form, InputGroup, Row, Spinner, Tab, Tabs, Table } from 'react-bootstrap'
import {
  FaCalendarAlt,
  FaClock,
  FaFilter,
  FaMapMarkerAlt,
  FaPlay,
  FaRedo,
  FaRoute,
  FaSignInAlt,
  FaSignOutAlt,
  FaStopwatch,
  FaUserCog,
  FaUsers,
} from 'react-icons/fa'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/api'
import './WorkingHours.css'

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function getMonthDateRange(monthValue) {
  if (!monthValue || monthValue.length !== 7) return { startDate: '', endDate: '' }
  const [yearText, monthText] = monthValue.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!year || !month) return { startDate: '', endDate: '' }

  const lastDay = new Date(year, month, 0).getDate()
  return {
    startDate: `${monthValue}-01`,
    endDate: `${monthValue}-${String(lastDay).padStart(2, '0')}`,
  }
}

function readName(tech) {
  return (
    `${tech?.user?.first_name || ''} ${tech?.user?.last_name || ''}`.trim() ||
    tech?.user?.email ||
    '-'
  )
}

function getInitials(tech) {
  const name = readName(tech)
  if (!name || name === '-') return '?'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function asTimeText(value) {
  if (!value) return '-'
  return String(value).slice(0, 5)
}

function asDateText(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function asDateTimeText(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function statusMeta(status) {
  const map = {
    in_progress: { label: 'Devam Ediyor', bg: 'warning', icon: <FaPlay /> },
    completed: { label: 'Tamamlandı', bg: 'success', icon: <FaStopwatch /> },
  }
  return map[status] || { label: status || '-', bg: 'secondary', icon: null }
}

function durationHoursFromDateTimes(startDateTime, endDateTime) {
  if (!startDateTime || !endDateTime) return 0
  const start = new Date(startDateTime)
  const end = new Date(endDateTime)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  if (diff <= 0) return 0
  return diff
}

function durationFromDateTime(startDateTime, endDateTime) {
  if (!startDateTime || !endDateTime) return '-'
  const start = new Date(startDateTime)
  const end = new Date(endDateTime)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-'
  const diff = (end.getTime() - start.getTime()) / (1000 * 60)
  if (diff <= 0) return '-'
  const hours = Math.floor(diff / 60)
  const mins = Math.round(diff % 60)
  return hours > 0 ? `${hours}s ${mins}d` : `${mins} dk`
}

function formatHours(value) {
  const hours = Number(value || 0)
  const whole = Math.floor(hours)
  const mins = Math.round((hours - whole) * 60)
  if (whole === 0) return `${mins} dk`
  if (mins === 0) return `${whole} saat`
  return `${whole}s ${mins}dk`
}

const WorkingHours = ({ defaultTab = 'shifts' }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialMonth = searchParams.get('month') || getCurrentMonth()
  const initialRange = getMonthDateRange(initialMonth)

  const [month, setMonth] = useState(initialMonth)
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') || initialRange.startDate)
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') || initialRange.endDate)
  const [technicians, setTechnicians] = useState([])
  const [selectedTechnician, setSelectedTechnician] = useState(searchParams.get('technician') || '')
  const [shiftRows, setShiftRows] = useState([])
  const [locationRows, setLocationRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || defaultTab)
  const lastDetailsRequestKeyRef = useRef('')

  useEffect(() => {
    let alive = true

    const loadTechnicians = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await api.get('/technicians/technician-list/')
        const list = Array.isArray(response.data) ? response.data : []
        if (!alive) return
        setTechnicians(list)
        if (list.length > 0) {
          const requestedTechnician = searchParams.get('technician')
          const hasRequested = list.some((item) => item.id === requestedTechnician)
          if (hasRequested) {
            setSelectedTechnician(requestedTechnician)
          } else {
            setSelectedTechnician((prev) => prev || list[0].id)
          }
        }
      } catch {
        if (!alive) return
        setError('Teknisyen listesi yüklenemedi.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    loadTechnicians()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const params = {}
    if (selectedTechnician) params.technician = selectedTechnician
    if (month) params.month = month
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    if (activeTab) params.tab = activeTab
    setSearchParams(params, { replace: true })
  }, [selectedTechnician, month, dateFrom, dateTo, activeTab, setSearchParams])

  useEffect(() => {
    if (!selectedTechnician) return

    let alive = true

    const loadDetails = async () => {
      const requestKey = [selectedTechnician, month, dateFrom, dateTo].join('|')
      if (lastDetailsRequestKeyRef.current === requestKey) return
      lastDetailsRequestKeyRef.current = requestKey

      setLoading(true)
      setError('')
      try {
        const { startDate, endDate } = getMonthDateRange(month)
        const attendanceUsesDateRange = Boolean(dateFrom && dateTo)
        const locationStart = dateFrom || startDate
        const locationEnd = dateTo || endDate

        const summaryRes = await api.get('/technicians/working-hours-summary/', {
          params: {
            technician: selectedTechnician,
            ...(attendanceUsesDateRange
              ? { start_date: dateFrom, end_date: dateTo }
              : { month }),
            include_open: true,
            date_from: locationStart,
            date_to: locationEnd,
          },
        })

        if (!alive) return
        setShiftRows(Array.isArray(summaryRes?.data?.shifts) ? summaryRes.data.shifts : [])
        setLocationRows(Array.isArray(summaryRes?.data?.location_logs) ? summaryRes.data.location_logs : [])
      } catch {
        if (!alive) return
        setError('Mesai veya lokasyon verileri yüklenemedi.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    loadDetails()
    return () => {
      alive = false
    }
  }, [selectedTechnician, month, dateFrom, dateTo])

  const metrics = useMemo(() => {
    let totalHours = 0
    let workedDays = 0
    let activeShifts = 0
    let completedShifts = 0

    shiftRows.forEach((row) => {
      const status = row?.shift_status || (row?.end_time ? 'completed' : 'in_progress')
      if (status === 'completed' || status === 'in_progress') {
        workedDays += 1
      }
      if (status === 'in_progress') activeShifts += 1
      if (status === 'completed') completedShifts += 1
      totalHours += durationHoursFromDateTimes(row?.start_time, row?.end_time)
    })

    return {
      totalHours,
      workedDays,
      activeShifts,
      completedShifts,
      visits: locationRows.length,
      openVisits: locationRows.filter((item) => !item?.left_at).length,
    }
  }, [shiftRows, locationRows])

  const selectedTechnicianData = useMemo(
    () => technicians.find((item) => item.id === selectedTechnician) || null,
    [technicians, selectedTechnician],
  )
  const selectedTechnicianName = readName(selectedTechnicianData)

  useEffect(() => {
    const nextTab = searchParams.get('tab') || defaultTab
    setActiveTab((current) => (current === nextTab ? current : nextTab))
  }, [defaultTab, searchParams])

  const resetFilters = () => {
    const currentMonth = getCurrentMonth()
    setMonth(currentMonth)
    const range = getMonthDateRange(currentMonth)
    setDateFrom(range.startDate)
    setDateTo(range.endDate)
  }

  return (
    <div className="working-hours-page">
      <Card className="working-hero border-0">
        <Card.Body className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="working-hero-avatar" aria-hidden>
              {getInitials(selectedTechnicianData)}
            </div>
            <div>
              <div className="working-hero-eyebrow">Çalışma Takibi</div>
              <h3 className="working-hero-title">Teknisyen Mesai Saatleri</h3>
              <div className="working-hero-subtitle">
                <FaUsers className="me-2" />
                {selectedTechnicianName} için mesai ve lokasyon geçmişi
              </div>
            </div>
          </div>
          <div className="working-hero-meta">
            <Badge bg="light" text="dark" className="me-2">
              {new Date(dateFrom || Date.now()).toLocaleDateString('tr-TR')} - {new Date(dateTo || Date.now()).toLocaleDateString('tr-TR')}
            </Badge>
            <Badge bg="info">{shiftRows.length} Mesai</Badge>
          </div>
        </Card.Body>
      </Card>

      <Card className="working-filter-card border-0 shadow-sm">
        <Card.Body>
          <div className="working-filter-title">
            <FaFilter className="me-2 text-primary" />
            Filtreler
          </div>
          <Row className="g-3 align-items-end">
            <Col xs={12} md={4} lg={4}>
              <Form.Label className="small fw-semibold text-muted mb-1">Teknisyen</Form.Label>
              <InputGroup>
                <InputGroup.Text><FaUserCog /></InputGroup.Text>
                <Form.Select
                  value={selectedTechnician}
                  onChange={(event) => setSelectedTechnician(event.target.value)}
                  disabled={technicians.length === 0}
                >
                  {technicians.length === 0 && <option value="">Teknisyen bulunamadı</option>}
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {readName(tech)}
                    </option>
                  ))}
                </Form.Select>
              </InputGroup>
            </Col>
            <Col xs={6} md={3} lg={3}>
              <Form.Label className="small fw-semibold text-muted mb-1">Ay</Form.Label>
              <InputGroup>
                <InputGroup.Text><FaCalendarAlt /></InputGroup.Text>
                <Form.Control
                  type="month"
                  value={month}
                  onChange={(event) => {
                    const nextMonth = event.target.value
                    setMonth(nextMonth)
                    const nextRange = getMonthDateRange(nextMonth)
                    setDateFrom(nextRange.startDate)
                    setDateTo(nextRange.endDate)
                  }}
                />
              </InputGroup>
            </Col>
            <Col xs={6} md={2} lg={2}>
              <Form.Label className="small fw-semibold text-muted mb-1">Baslangic</Form.Label>
              <Form.Control
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </Col>
            <Col xs={6} md={2} lg={2}>
              <Form.Label className="small fw-semibold text-muted mb-1">Bitis</Form.Label>
              <Form.Control
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </Col>
            <Col xs={6} md={1} lg={1} className="d-grid">
              <Button variant="outline-secondary" onClick={resetFilters} title="Filtreleri sifirla">
                <FaRedo />
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error ? <Alert variant="danger" className="mb-3">{error}</Alert> : null}

      <Row className="g-3">
        <Col xs={6} md={3}>
          <Card className="metric-card metric-card--primary border-0 shadow-sm h-100">
            <Card.Body>
              <div className="metric-icon metric-icon--primary"><FaClock /></div>
              <div className="metric-value">{formatHours(metrics.totalHours)}</div>
              <div className="metric-label">Toplam Mesai</div>
              <div className="metric-foot">
                <Badge bg="success" pill className="me-1">{metrics.completedShifts} tamamlanan</Badge>
                {metrics.activeShifts > 0 ? (
                  <Badge bg="warning" text="dark" pill>{metrics.activeShifts} aktif</Badge>
                ) : null}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="metric-card metric-card--success border-0 shadow-sm h-100">
            <Card.Body>
              <div className="metric-icon metric-icon--success"><FaCalendarAlt /></div>
              <div className="metric-value">{metrics.workedDays}</div>
              <div className="metric-label">Çalışılan Gün</div>
              <div className="metric-foot text-muted small">
                Seçili tarih aralığında
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="metric-card metric-card--info border-0 shadow-sm h-100">
            <Card.Body>
              <div className="metric-icon metric-icon--info"><FaRoute /></div>
              <div className="metric-value">{metrics.visits}</div>
              <div className="metric-label">Lokasyon Ziyareti</div>
              <div className="metric-foot">
                {metrics.openVisits > 0 ? (
                  <Badge bg="warning" text="dark" pill>{metrics.openVisits} acik</Badge>
                ) : (
                  <span className="text-muted small">Tum ziyaretler kapali</span>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="metric-card metric-card--neutral border-0 shadow-sm h-100">
            <Card.Body>
              <div className="metric-icon metric-icon--neutral"><FaMapMarkerAlt /></div>
              <div className="metric-value metric-value--text">{selectedTechnicianName}</div>
              <div className="metric-label">Seçili Teknisyen</div>
              <div className="metric-foot text-muted small">
                {selectedTechnicianData?.user?.phone_number || 'Telefon eklenmemiş'}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="working-content-card border-0 shadow-sm">
        <Card.Body>
          <Tabs
            activeKey={activeTab}
            onSelect={(key) => setActiveTab(key)}
            className="working-tabs mb-3"
          >
            <Tab
              eventKey="shifts"
              title={
                <span>
                  <FaStopwatch className="me-2" />
                  Mesai Kayıtları
                  <Badge bg="primary" pill className="ms-2">{shiftRows.length}</Badge>
                </span>
              }
            >
              {loading ? (
                <div className="working-loading">
                  <Spinner animation="border" variant="primary" />
                </div>
              ) : shiftRows.length === 0 ? (
                <div className="working-empty">
                  <FaStopwatch className="working-empty-icon" />
                  <div className="working-empty-title">Mesai kaydı bulunamadı</div>
                  <div className="working-empty-text">
                    Seçili filtreler için bu teknisyene ait mesai kaydı yok.
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="working-table mb-0 align-middle">
                    <thead>
                      <tr>
                        <th><FaCalendarAlt className="me-2" />Tarih</th>
                        <th>Durum</th>
                        <th><FaSignInAlt className="me-2" />Baslangic</th>
                        <th><FaSignOutAlt className="me-2" />Bitis</th>
                        <th><FaClock className="me-2" />Sure</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shiftRows.map((row) => {
                        const rowStatus = row?.shift_status || (row?.end_time ? 'completed' : 'in_progress')
                        const meta = statusMeta(rowStatus)
                        return (
                          <tr key={row.id}>
                            <td className="fw-semibold">{asDateText(row?.date)}</td>
                            <td>
                              <Badge bg={meta.bg} className="working-status-badge">
                                {meta.icon ? <span className="me-1">{meta.icon}</span> : null}
                                {meta.label}
                              </Badge>
                            </td>
                            <td>{asDateTimeText(row?.start_time)}</td>
                            <td>{asDateTimeText(row?.end_time)}</td>
                            <td className="fw-semibold">{durationFromDateTime(row?.start_time, row?.end_time)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
            </Tab>

            <Tab
              eventKey="locations"
              title={
                <span>
                  <FaMapMarkerAlt className="me-2" />
                  Lokasyon Geçmişi
                  <Badge bg="info" pill className="ms-2">{locationRows.length}</Badge>
                </span>
              }
            >
              {loading ? (
                <div className="working-loading">
                  <Spinner animation="border" variant="primary" />
                </div>
              ) : locationRows.length === 0 ? (
                <div className="working-empty">
                  <FaMapMarkerAlt className="working-empty-icon" />
                  <div className="working-empty-title">Lokasyon kaydı yok</div>
                  <div className="working-empty-text">
                    Bu teknisyenin seçili tarih aralığında lokasyon logu bulunmuyor.
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="working-table mb-0 align-middle">
                    <thead>
                      <tr>
                        <th><FaSignInAlt className="me-2" />Varis</th>
                        <th><FaSignOutAlt className="me-2" />Ayrilis</th>
                        <th><FaClock className="me-2" />Sure</th>
                        <th>Servis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locationRows.map((row) => (
                        <tr key={row.id}>
                          <td className="fw-semibold">{asDateTimeText(row?.arrived_at)}</td>
                          <td>{asDateTimeText(row?.left_at)}</td>
                          <td className="fw-semibold">{durationFromDateTime(row?.arrived_at, row?.left_at)}</td>
                          <td>
                            {row?.service_receipt_number ? (
                              <Badge bg="primary">#{row.service_receipt_number}</Badge>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </div>
  )
}

export default WorkingHours



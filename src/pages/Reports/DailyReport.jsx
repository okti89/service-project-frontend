import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { FaCalendarAlt, FaChartLine, FaClipboardList, FaFilePdf, FaSync } from 'react-icons/fa'
import toast from 'react-hot-toast'
import api from '../../api/api'
import { dailyReportRequest, formatReportCurrency, localReportDate } from './dailyReportUtils'

function errorMessage(error, fallback) {
  const data = error?.response?.data
  if (typeof data?.detail === 'string') return data.detail
  if (typeof data?.error === 'string') return data.error
  for (const field of ['date', 'technician_id']) {
    if (typeof data?.[field] === 'string') return data[field]
    if (Array.isArray(data?.[field])) return data[field].join(' ')
  }
  return fallback
}

function Metric({ label, value, color }) {
  return (
    <Col xs={6} xl={3}>
      <Card className="border-0 shadow-sm rounded-4 h-100">
        <Card.Body className="p-3">
          <div className="small text-muted mb-2">{label}</div>
          <div className={`fs-4 fw-bold text-${color || 'dark'}`} style={{ overflowWrap: 'anywhere' }}>{value}</div>
        </Card.Body>
      </Card>
    </Col>
  )
}

function DailyReport({ kind }) {
  const isSummary = kind === 'summary'
  const title = isSummary ? 'Günlük İcmal' : 'Günlük Servis Listeleri'
  const [date, setDate] = useState(localReportDate)
  const [technicianId, setTechnicianId] = useState('')
  const [technicians, setTechnicians] = useState([])
  const [technicianError, setTechnicianError] = useState('')
  const [techniciansLoading, setTechniciansLoading] = useState(!isSummary)
  const [revision, setRevision] = useState(0)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const request = dailyReportRequest(kind, date, technicianId)
  const HeaderIcon = isSummary ? FaChartLine : FaClipboardList

  useEffect(() => {
    if (isSummary) return undefined
    const controller = new AbortController()
    async function loadTechnicians() {
      setTechnicianError('')
      setTechniciansLoading(true)
      try {
        const response = await api.get('/technicians/technician-list/', { signal: controller.signal, timeout: 20000 })
        if (controller.signal.aborted) return
        const rows = Array.isArray(response.data) ? response.data : response.data?.results || []
        setTechnicians(rows.map((row) => ({
          id: row.id,
          name: row.full_name || [row.user?.first_name, row.user?.last_name].filter(Boolean).join(' ') || row.user?.email || 'Teknisyen',
        })).sort((a, b) => a.name.localeCompare(b.name, 'tr')))
      } catch (failure) {
        if (!controller.signal.aborted) setTechnicianError(errorMessage(failure, 'Teknisyen listesi yüklenemedi. Yenile ile tekrar deneyebilirsiniz.'))
      } finally {
        if (!controller.signal.aborted) setTechniciansLoading(false)
      }
    }
    loadTechnicians()
    return () => controller.abort()
  }, [isSummary, revision])

  useEffect(() => {
    const controller = new AbortController()
    async function loadReport() {
      setLoading(true)
      setError('')
      setReport(null)
      if (!date) {
        setError('Lütfen bir tarih seçin.')
        setLoading(false)
        return
      }
      const { endpoint, params } = dailyReportRequest(kind, date, technicianId)
      try {
        const response = await api.get(endpoint, { params, signal: controller.signal, timeout: 20000 })
        if (!controller.signal.aborted) setReport(response.data)
      } catch (failure) {
        if (!controller.signal.aborted) setError(errorMessage(failure, 'Günlük rapor yüklenemedi. Lütfen tekrar deneyin.'))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    loadReport()
    return () => controller.abort()
  }, [kind, date, technicianId, revision])

  async function exportPdf() {
    // Open during the click so browsers do not block a tab opened after the request.
    const preview = window.open('', '_blank')
    if (preview) preview.opener = null
    setExporting(true)
    try {
      const response = await api.get(request.pdfEndpoint, { params: request.params, responseType: 'blob', timeout: 60000 })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      if (preview && !preview.closed) {
        preview.location.href = url
      } else {
        const download = document.createElement('a')
        download.href = url
        download.download = `${isSummary ? 'gunluk_icmal' : 'gunluk_servis_listesi'}_${date}.pdf`
        download.click()
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (failure) {
      preview?.close()
      if (failure.response?.data instanceof Blob) {
        try { failure.response.data = JSON.parse(await failure.response.data.text()) } catch { /* Non-JSON server error. */ }
      }
      toast.error(errorMessage(failure, 'PDF oluşturulamadı.'))
    } finally {
      setExporting(false)
    }
  }

  const services = report?.services || []
  return (
    <div className="container-fluid py-4 px-3" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark d-flex align-items-center gap-3"><HeaderIcon className="text-primary" />{title}</h2>
          <p className="text-muted small mb-0 mt-2">
            {isSummary ? 'Seçilen günün servis gelirleri, tahsilatları ve kalan alacakları.' : 'Seçilen günün servis programı, müşteri bilgileri ve teknisyen görevleri.'}
          </p>
        </div>
        <Button as={Link} to={isSummary ? '/dashboard/daily-service-lists' : '/dashboard/daily-summary'} variant="outline-primary">
          {isSummary ? 'Servis Listelerine Git' : 'Günlük İcmale Git'}
        </Button>
      </div>
      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col xs={12} md={4} xl={3}>
              <Form.Group controlId={`${kind}-date`}>
                <Form.Label className="small fw-semibold"><FaCalendarAlt className="me-2 text-primary" />Rapor Tarihi</Form.Label>
                <Form.Control type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </Form.Group>
            </Col>
            {!isSummary && (
              <Col xs={12} md={4} xl={3}>
                <Form.Group controlId="daily-list-technician">
                  <Form.Label className="small fw-semibold">Teknisyen</Form.Label>
                  <Form.Select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)} disabled={techniciansLoading}>
                    <option value="">{techniciansLoading ? 'Teknisyenler yükleniyor…' : 'Tüm teknisyenler'}</option>
                    {technicians.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            )}
            <Col className="d-flex flex-wrap gap-2 ms-md-auto" xs={12} md="auto">
              <Button variant="light" className="border" disabled={loading} onClick={() => {
                setTechnicianError('')
                if (!isSummary) setTechniciansLoading(true)
                setRevision((value) => value + 1)
              }}><FaSync className="me-2" />Yenile</Button>
              <Button variant="primary" disabled={!date || loading || !!error || exporting} onClick={exportPdf}>
                {exporting ? <Spinner size="sm" className="me-2" /> : <FaFilePdf className="me-2" />}
                {exporting ? 'PDF hazırlanıyor…' : isSummary ? 'İcmal PDF' : technicianId ? 'Teknisyen Listesi PDF' : 'Genel Servis Listesi PDF'}
              </Button>
            </Col>
          </Row>
          {technicianError && <Alert variant="warning" className="mt-3 mb-0">{technicianError}</Alert>}
        </Card.Body>
      </Card>
      {loading ? (
        <div className="text-center py-5" role="status"><Spinner animation="border" variant="primary" /><p className="text-muted mt-3">{title} yükleniyor…</p></div>
      ) : error ? (
        <Alert variant="danger" role="alert">{error}<Button variant="outline-danger" size="sm" className="ms-3" onClick={() => setRevision((value) => value + 1)}>Tekrar Dene</Button></Alert>
      ) : report ? (
        <>
          <Row className="g-3 mb-4">
            <Metric label="Toplam Servis" value={report.total_services} />
            {isSummary ? <>
              <Metric label="Servis Geliri" value={formatReportCurrency(report.total_revenue)} color="primary" />
              <Metric label="Günlük Tahsilat" value={formatReportCurrency(report.collected_total)} color="success" />
              <Metric label="Kalan Alacak" value={formatReportCurrency(report.outstanding_total)} color="warning" />
            </> : <>
              <Metric label="Planlanan" value={report.planned_count} color="primary" />
              <Metric label="İşlemde" value={report.in_progress_count} color="warning" />
              <Metric label="Tamamlanan" value={report.completed_count} color="success" />
            </>}
          </Row>
          <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4">
            <Card.Header className="bg-white py-3 border-0 d-flex flex-wrap align-items-center justify-content-between gap-2">
              <h6 className="fw-bold m-0">{isSummary ? 'Gelir ve Tahsilat Listesi' : report.technician_name ? `${report.technician_name} - Servis Programı` : 'Günlük Servis Programı'}</h6>
              <Badge bg="light" text="dark">{services.length} servis</Badge>
            </Card.Header>
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light"><tr>
                <th className="ps-3">Saat / Fiş No</th><th>Müşteri</th><th>{isSummary ? 'İşlem' : 'Cihaz / Arıza'}</th><th>Teknisyen</th><th>Durum</th>
                {isSummary ? <><th>Ödeme Yöntemi</th><th className="text-end pe-3">Servis Tutarı</th></> : <th className="pe-3">Adres</th>}
              </tr></thead>
              <tbody>
                {!services.length && <tr><td colSpan={isSummary ? 7 : 6} className="text-center text-muted py-5">Seçilen tarih ve filtreye uygun servis bulunamadı.</td></tr>}
                {services.map((service) => <tr key={service.id}>
                  <td className="ps-3 text-nowrap"><div className="fw-semibold">{service.time}</div><small className="text-muted">{service.receipt_number}</small></td>
                  <td><div className="fw-semibold">{service.customer_name}</div>{!isSummary && <small className="text-muted">{service.customer_phone}</small>}</td>
                  <td style={{ minWidth: 180, maxWidth: 320, overflowWrap: 'anywhere' }}>{!isSummary && service.device_name && <div className="fw-semibold">{service.device_name}</div>}{service.operation_name}</td>
                  <td>{service.technician_name}</td>
                  <td><Badge bg={service.status_code === 'completed' ? 'success' : service.status_code === 'in_progress' ? 'warning' : 'secondary'}>{service.status_name}</Badge></td>
                  {isSummary ? <><td>{service.payment_method}</td><td className="text-end pe-3 text-nowrap fw-semibold">{formatReportCurrency(service.total_amount)}</td></> : <td className="pe-3" style={{ minWidth: 180, maxWidth: 300, overflowWrap: 'anywhere' }}>{service.customer_address}</td>}
                </tr>)}
              </tbody>
            </Table>
          </Card>
          {isSummary && <Card className="border-0 shadow-sm rounded-4">
            <Card.Body>
              <h6 className="fw-bold mb-3">Günlük Tahsilat Dağılımı</h6>
              <p className="small text-muted">Tahsilat, seçilen gün alınan tüm servis ödemelerini kapsar. Kalan alacak, o güne planlanan servislerin güncel bakiyesidir.</p>
              {!(report.payment_distribution || []).length ? <p className="text-muted mb-0">Seçilen gün tahsilat bulunamadı.</p> :
                (report.payment_distribution || []).map((payment) => <div key={payment.name} className="d-flex justify-content-between gap-3 border-top py-2"><span>{payment.name}</span><strong className="text-success">{formatReportCurrency(payment.amount)}</strong></div>)}
            </Card.Body>
          </Card>}
        </>
      ) : null}
    </div>
  )
}

export function DailySummary() {
  return <DailyReport kind="summary" />
}

export function DailyServiceList() {
  return <DailyReport kind="service-list" />
}

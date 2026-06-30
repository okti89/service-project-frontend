import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Modal,
  ProgressBar,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap'
import {
  FaChartBar,
  FaChartLine,
  FaFilePdf,
  FaFilter,
  FaMoneyBillWave,
  FaSync,
  FaTrophy,
  FaUsersCog,
  FaWrench,
} from 'react-icons/fa'
import toast from 'react-hot-toast'

import api from '../../api/api'

const MONTH_OPTIONS = [
  { value: '', label: 'Tüm Aylar' },
  { value: '1', label: 'Ocak' },
  { value: '2', label: 'Şubat' },
  { value: '3', label: 'Mart' },
  { value: '4', label: 'Nisan' },
  { value: '5', label: 'Mayıs' },
  { value: '6', label: 'Haziran' },
  { value: '7', label: 'Temmuz' },
  { value: '8', label: 'Ağustos' },
  { value: '9', label: 'Eylül' },
  { value: '10', label: 'Ekim' },
  { value: '11', label: 'Kasım' },
  { value: '12', label: 'Aralık' },
]

const now = new Date()
const DEFAULT_FILTERS = {
  year: String(now.getFullYear()),
  month: '',
}

function readApiError(error, fallback) {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data.detail === 'string') return data.detail
  if (typeof data.error === 'string') return data.error
  if (typeof data === 'object') {
    const firstEntry = Object.entries(data).find(([, value]) => value)
    if (firstEntry && Array.isArray(firstEntry[1])) return String(firstEntry[1][0])
    if (firstEntry && typeof firstEntry[1] === 'string') return firstEntry[1]
  }
  return fallback
}

function formatCurrency(value) {
  const numeric = Number(value || 0)
  if (Number.isNaN(numeric)) return '₺0,00'
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(numeric)
}

function formatCount(value) {
  return Number(value || 0).toLocaleString('tr-TR')
}

function formatDate(value) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getQueryParams(filters) {
  const params = {}
  if (filters.year) params.year = filters.year
  if (filters.month) params.month = filters.month
  return params
}

const StatCard = ({ title, value, countText, countLabel = 'Kayıt:', bgColor }) => (
  <Card
    className="border-0 shadow-sm h-100"
    style={{
      backgroundColor: bgColor,
      color: '#ffffff',
      borderRadius: '12px',
    }}
  >
    <Card.Body className="p-3 d-flex flex-column justify-content-between" style={{ minHeight: '110px' }}>
      <div>
        <small className="opacity-75 d-block mb-1 text-uppercase fw-semibold" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
          {title}
        </small>
        <h4 className="m-0 fw-bold" style={{ whiteSpace: 'nowrap', fontSize: '1.2rem' }}>
          {formatCurrency(value)}
        </h4>
      </div>
      {countText !== undefined && (
        <div
          className="mt-2 pt-2 d-flex justify-content-between align-items-center"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.15)',
            fontSize: '0.75rem',
          }}
        >
          <span className="opacity-75">{countLabel}</span>
          <span className="fw-bold">{countText}</span>
        </div>
      )}
    </Card.Body>
  </Card>
)

function Reports() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [general, setGeneral] = useState(null)
  const [technicianRows, setTechnicianRows] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const [detailModal, setDetailModal] = useState({ show: false, technician: null })
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 7 }, (_, index) => String(currentYear - 5 + index))
  }, [])

  const sortedByRevenue = useMemo(() => {
    return [...technicianRows].sort(
      (a, b) => Number(b.total_revenue_generated || 0) - Number(a.total_revenue_generated || 0)
    )
  }, [technicianRows])

  const sortedByServiceCount = useMemo(() => {
    return [...technicianRows].sort(
      (a, b) => Number(b.completed_services_count || 0) - Number(a.completed_services_count || 0)
    )
  }, [technicianRows])

  const topTechnician = sortedByRevenue[0] || null
  const totalTechnicianRevenue = sortedByRevenue.reduce(
    (sum, row) => sum + Number(row.total_revenue_generated || 0),
    0
  )

  const fetchReports = useCallback(async () => {
    setIsLoading(true)
    const params = getQueryParams(filters)
    try {
      const [generalRes, technicianRes, dashboardRes] = await Promise.all([
        api.get('/reports/general/', { params }),
        api.get('/reports/technician/', { params }),
        api.get('/reports/dashboard/', { params }),
      ])
      setGeneral(generalRes.data || null)
      setTechnicianRows(Array.isArray(technicianRes.data) ? technicianRes.data : [])
      setDashboard(dashboardRes.data || null)
    } catch (error) {
      toast.error(readApiError(error, 'Rapor verileri yüklenemedi.'))
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const openTechnicianDetail = async (technician) => {
    setDetailModal({ show: true, technician })
    setDetailLoading(true)
    setDetailData(null)
    try {
      const params = getQueryParams(filters)
      const technicianPath = technician.technician_id || 'unassigned'
      const response = await api.get(`/reports/technician/${technicianPath}/`, { params })
      setDetailData(response.data || null)
    } catch (error) {
      toast.error(readApiError(error, 'Teknisyen detay raporu yüklenemedi.'))
    } finally {
      setDetailLoading(false)
    }
  }

  const exportPdf = async (type) => {
    const params = new URLSearchParams({
      ...getQueryParams(filters),
      export: 'pdf',
    })
    const endpoint =
      type === 'general' ? '/reports/general/' : '/reports/technician/'

    try {
      const response = await api.get(`${endpoint}?${params.toString()}`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 15000)
    } catch (error) {
      toast.error(readApiError(error, 'PDF oluşturulamadi.'))
    }
  }

  return (
    <div className="container-fluid py-4 px-3" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-extrabold m-0 text-dark d-flex align-items-center">
            <FaChartLine className="me-3 text-primary" />
            Performans Analitiği & Raporlar
          </h2>
          <p className="text-muted small mb-0 mt-1">İşletmenizin finansal ve operasyonel performans verilerini analiz edin.</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Button variant="white" className="border shadow-sm d-flex align-items-center gap-2 fw-semibold" onClick={fetchReports} disabled={isLoading}>
            <FaSync className={isLoading ? 'fa-spin' : ''} />
            Yenile
          </Button>
          <Button variant="danger" className="shadow-sm d-flex align-items-center gap-2 fw-semibold" onClick={() => exportPdf('general')}>
            <FaFilePdf /> Genel Rapor PDF
          </Button>
          <Button variant="outline-danger" className="shadow-sm bg-white d-flex align-items-center gap-2 fw-semibold" onClick={() => exportPdf('technician')}>
            <FaFilePdf /> Teknisyen PDF
          </Button>
        </div>
      </div>

      {/* Filters Seçtion */}
      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Body className="p-3">
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold text-secondary small d-flex align-items-center gap-2">
                  <FaFilter className="text-primary" />
                  Yıl Seçimi
                </Form.Label>
                <Form.Select
                  size="sm"
                  className="rounded-3 py-2 border-secondary-subtle"
                  value={filters.year}
                  onChange={(event) => setFilters((prev) => ({ ...prev, year: event.target.value }))}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year} Yılı
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold text-secondary small">Ay Seçimi</Form.Label>
                <Form.Select
                  size="sm"
                  className="rounded-3 py-2 border-secondary-subtle"
                  value={filters.month}
                  onChange={(event) => setFilters((prev) => ({ ...prev, month: event.target.value }))}
                >
                  {MONTH_OPTIONS.map((month) => (
                    <option key={month.value || 'all'} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Button variant="primary" className="w-100 fw-bold py-2.5 rounded-3 shadow-sm" onClick={fetchReports} disabled={isLoading}>
                Uygula ve Raporla
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {isLoading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-2 small">Veri modelleri hesaplanıyor...</p>
        </div>
      ) : (
        <>
          {/* Metrics row - Moved to top */}
          <Row className="g-3 mb-4">
            <Col md={6} xl={2}>
              <StatCard
                title="Toplam Ciro"
                value={general?.total_revenue}
                countText={general?.total_services}
                countLabel="Toplam Servis:"
                bgColor="#38a169"
              />
            </Col>
            <Col md={6} xl={2}>
              <StatCard
                title="Tahsil Edilmemiş"
                value={general?.outstanding_receivables}
                countText={general?.total_overdue_receivables}
                countLabel="Fatura Sayısı:"
                bgColor="#dd6b20"
              />
            </Col>
            <Col md={6} xl={2}>
              <StatCard
                title="Toplam Gider"
                value={general?.total_expenses}
                countText={general?.total_customers}
                countLabel="Toplam Müşteri:"
                bgColor="#e53e3e"
              />
            </Col>
            <Col md={6} xl={2}>
              <StatCard
                title="İptal"
                value={general?.total_reversal}
                countText={general?.total_cancelled_services}
                countLabel="İptal Edilen:"
                bgColor="#718096"
              />
            </Col>
            <Col md={12} xl={4}>
              <Card
                className="border-0 shadow-sm h-100"
                style={{
                  backgroundColor: '#5a67d8',
                  color: '#ffffff',
                  borderRadius: '12px',
                }}
              >
                <Card.Body className="p-3 d-flex flex-column justify-content-between" style={{ minHeight: '110px' }}>
                  <div>
                    <small className="opacity-75 d-block mb-1 text-uppercase fw-semibold" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                      Net Kâr Durumu
                    </small>
                    <h3 className="m-0 fw-bold" style={{ fontSize: '1.75rem' }}>
                      {formatCurrency(general?.total_profit)}
                    </h3>
                  </div>
                  <div className="mt-2 pt-2 d-flex justify-content-between align-items-center" style={{ borderTop: '1px solid rgba(255,255,255,0.15)', fontSize: '0.75rem' }}>
                    <span className="opacity-75">Tamamlanan Servisler</span>
                    <span className="fw-bold">{general?.total_completed_services} Adet</span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Leaders & Insights Row */}
          <Row className="g-4 mb-4">
            <Col lg={8}>
              <Card className="border shadow-sm rounded-4 overflow-hidden bg-white">
                <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center border-0">
                  <h6 className="m-0 fw-bold text-dark d-flex align-items-center">
                    <FaTrophy className="me-2 text-warning" />
                    Teknik Servis Ciro Sıralaması
                  </h6>
                  <Badge bg="dark" className="rounded-pill px-2.5 py-1.5">{sortedByRevenue.length} Aktif Teknisyen</Badge>
                </Card.Header>
                <div className="table-responsive">
                  <Table hover className="mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '60px' }} className="py-3 px-4">Sıra</th>
                        <th>Teknisyen</th>
                        <th>Tamamlanan Servis</th>
                        <th>Oluşturduğu Ciro</th>
                        <th className="text-end py-3 px-4">Operasyon</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedByRevenue.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-5 text-muted">
                            Filtreye uygun teknisyen verisi bulunamadı.
                          </td>
                        </tr>
                      ) : null}
                      {sortedByRevenue.map((row, index) => (
                        <tr key={row.technician_id || 'unassigned-services'}>
                          <td className="py-3 px-4">
                            <span
                              className={`d-inline-flex align-items-center justify-content-center rounded-circle fw-bold text-dark`}
                              style={{
                                width: '28px',
                                height: '28px',
                                fontSize: '0.8rem',
                                backgroundColor: index === 0 ? '#fef3c7' : index === 1 ? '#e2e8f0' : index === 2 ? '#ffedd5' : '#f1f5f9',
                                color: index === 0 ? '#d97706' : '#475569'
                              }}
                            >
                              {index + 1}
                            </span>
                          </td>
                          <td className="fw-semibold text-dark">{row.technician_name}</td>
                          <td className="fw-semibold text-muted">{formatCount(row.completed_services_count)} İş</td>
                          <td className="fw-extrabold text-success">{formatCurrency(row.total_revenue_generated)}</td>
                          <td className="text-end py-3 px-4">
                            <Button size="sm" variant="light" className="border text-primary fw-semibold px-3 py-1.5 rounded-3" onClick={() => openTechnicianDetail(row)}>
                              Detay Analiz
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card>
            </Col>

            <Col lg={4}>
              <Card className="border shadow-sm rounded-4 mb-4 bg-white">
                <Card.Header className="bg-white py-3 border-0">
                  <h6 className="m-0 fw-bold text-dark d-flex align-items-center">
                    <FaUsersCog className="me-2 text-info" />
                    Özet Analiz & İçgörüler
                  </h6>
                </Card.Header>
                <Card.Body className="p-4 pt-2">
                  <div className="mb-3 border-bottom pb-2">
                    <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.65rem' }}>Lider Teknisyen (Ciro)</small>
                    <span className="fw-bold text-dark d-block mt-0.5">{topTechnician?.technician_name || '-'}</span>
                    <span className="text-success small fw-extrabold">
                      {topTechnician ? formatCurrency(topTechnician.total_revenue_generated) : 'Veri yok'}
                    </span>
                  </div>

                  <div className="mb-3 border-bottom pb-2">
                    <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.65rem' }}>Teknisyen Toplam Cirosu</small>
                    <span className="fw-extrabold text-dark d-block fs-5 mt-0.5">{formatCurrency(totalTechnicianRevenue)}</span>
                  </div>

                  <div>
                    <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.65rem' }}>Ortalama Personel Hasılatı</small>
                    <span className="fw-extrabold text-primary d-block fs-5 mt-0.5">
                      {sortedByRevenue.length > 0
                        ? formatCurrency(totalTechnicianRevenue / sortedByRevenue.length)
                        : formatCurrency(0)}
                    </span>
                  </div>
                </Card.Body>
              </Card>

              <Card className="border shadow-sm rounded-4 bg-white">
                <Card.Header className="bg-white py-3 border-0">
                  <h6 className="m-0 fw-bold text-dark d-flex align-items-center">
                    <FaWrench className="me-2 text-secondary" />
                    Servis Adet Sıralaması
                  </h6>
                </Card.Header>
                <Card.Body className="p-3 pt-1">
                  <div className="d-flex flex-column gap-2">
                    {sortedByServiceCount.slice(0, 5).map((row, idx) => (
                      <div key={row.technician_id || 'unassigned-services'} className="d-flex justify-content-between align-items-center p-2 rounded-3 border-light bg-light-subtle border">
                        <span className="small fw-semibold text-dark">{idx + 1}. {row.technician_name}</span>
                        <Badge bg="secondary" className="rounded-pill px-2.5 py-1.5">{formatCount(row.completed_services_count)} Servis</Badge>
                      </div>
                    ))}
                    {sortedByServiceCount.length === 0 ? (
                      <Alert variant="light" className="mb-0 py-2 text-muted small text-center">
                        Servis adedi verisi bulunamadı.
                      </Alert>
                    ) : null}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Charts Row */}
          <Row className="g-4 mb-4">
            <Col lg={6}>
              <Card className="border shadow-sm rounded-4 h-100 overflow-hidden bg-white">
                <Card.Header className="bg-white py-3 border-0">
                  <h6 className="m-0 fw-bold text-dark d-flex align-items-center">
                    <FaChartBar className="me-2 text-primary" />
                    Servis Durum Dağılım Oranları
                  </h6>
                </Card.Header>
                <Card.Body className="p-4">
                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-1 small text-muted">
                      <span className="fw-semibold text-dark">Tamamlanan İşler</span>
                      <strong>{Number(general?.total_completed_services_percentage || 0).toFixed(1)}%</strong>
                    </div>
                    <ProgressBar now={Number(general?.total_completed_services_percentage || 0)} variant="success" className="rounded-pill" style={{ height: '8px' }} />
                  </div>
                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-1 small text-muted">
                      <span className="fw-semibold text-dark">Süreçte Bekleyenler</span>
                      <strong>{Number(general?.total_pending_services_percentage || 0).toFixed(1)}%</strong>
                    </div>
                    <ProgressBar now={Number(general?.total_pending_services_percentage || 0)} variant="warning" className="rounded-pill" style={{ height: '8px' }} />
                  </div>
                  <div>
                    <div className="d-flex justify-content-between mb-1 small text-muted">
                      <span className="fw-semibold text-dark">İptal Edilenler</span>
                      <strong>{Number(general?.total_cancelled_services_percentage || 0).toFixed(1)}%</strong>
                    </div>
                    <ProgressBar now={Number(general?.total_cancelled_services_percentage || 0)} variant="danger" className="rounded-pill" style={{ height: '8px' }} />
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6}>
              <Card className="border shadow-sm rounded-4 h-100 overflow-hidden bg-white">
                <Card.Header className="bg-white py-3 border-0">
                  <h6 className="m-0 fw-bold text-dark d-flex align-items-center">
                    <FaMoneyBillWave className="me-2 text-success" />
                    Aylık Ciro Dağılım Grafiği
                  </h6>
                </Card.Header>
                <Card.Body className="p-4">
                  {(dashboard?.monthly_revenue || []).length === 0 ? (
                    <div className="text-muted text-center py-5 small">Bu dönem için aylık analitik veri bulunamadı.</div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {(dashboard?.monthly_revenue || []).map((row) => {
                        const maxTotal = Math.max(
                          ...((dashboard?.monthly_revenue || []).map((entry) => Number(entry.total || 0))),
                          1
                        )
                        const percent = (Number(row.total || 0) / maxTotal) * 100
                        return (
                          <div key={row.name}>
                            <div className="d-flex justify-content-between small text-muted mb-1">
                              <span className="fw-bold text-dark">{row.name}</span>
                              <strong className="text-dark">{formatCurrency(row.total)}</strong>
                            </div>
                            <ProgressBar now={percent} className="rounded-pill" style={{ height: '8px', backgroundColor: '#e2e8f0' }} />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* Technician detail modal */}
      <Modal
        show={detailModal.show}
        onHide={() => {
          setDetailModal({ show: false, technician: null })
          setDetailData(null)
        }}
        size="xl"
        centered
        scrollable
      >
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold text-dark">{detailModal.technician?.technician_name || 'Teknisyen'} Detay Analizi</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-0">
          {detailLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted mt-2 small">Teknisyen performans verileri yükleniyor...</p>
            </div>
          ) : !detailData ? (
            <Alert variant="warning" className="mb-0">
              Detay verisi yüklenemedi.
            </Alert>
          ) : (
            <>
              {/* Stat boxes inside modal */}
              <Row className="g-3 mb-4">
                <Col md={4}>
                  <Card className="border bg-light rounded-3">
                    <Card.Body className="py-2.5 px-3">
                      <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: '0.65rem' }}>Tamamlanan Servisler</small>
                      <span className="fw-bold fs-5 text-dark">{formatCount(detailData.completed_services_count)} İş</span>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="border bg-light rounded-3">
                    <Card.Body className="py-2.5 px-3">
                      <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: '0.65rem' }}>Süreçte Bekleyenler</small>
                      <span className="fw-bold fs-5 text-dark">{formatCount(detailData.pending_services_count)} İş</span>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="border bg-success-subtle bg-opacity-10 rounded-3">
                    <Card.Body className="py-2.5 px-3">
                      <small className="text-success d-block fw-bold text-uppercase" style={{ fontSize: '0.65rem' }}>Oluşturulan Toplam Hasılat</small>
                      <span className="fw-bold fs-5 text-success">{formatCurrency(detailData.total_revenue_generated)}</span>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Detail Table */}
              <Card className="border rounded-4 overflow-hidden shadow-sm">
                <div className="table-responsive">
                  <Table hover className="mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th className="py-3 px-4">Fiş No</th>
                        <th>Müşteri</th>
                        <th>Cihaz</th>
                        <th>Durum</th>
                        <th>Tarih</th>
                        <th className="text-end py-3 px-4">Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailData.services || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-5 text-muted">
                            Bu filtreye uygun herhangi bir servis kaydı bulunmamaktadır.
                          </td>
                        </tr>
                      ) : null}

                      {(detailData.services || []).map((service) => (
                        <tr key={service.id}>
                          <td className="py-3 px-4 fw-bold">{service.receipt_number || '-'}</td>
                          <td className="fw-semibold text-dark">{service.customer_full_name || '-'}</td>
                          <td>{[service.device_brand, service.device_model].filter(Boolean).join(' ') || '-'}</td>
                          <td>
                            <span className={`badge px-2 py-1 rounded-pill ${service.is_completed ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-warning border border-warning-subtle'}`} style={{ fontSize: '0.75rem' }}>
                              {(() => {
                                const status = String(service.service_status || '').toLowerCase();
                                if (status === 'assigned') return 'Atandı';
                                if (status === 'unassigned') return 'Atanmadı';
                                if (status === 'pending') return 'Beklemede';
                                if (status === 'completed') return 'Tamamlandı';
                                if (status === 'cancelled') return 'İptal Edildi';
                                return service.service_status || (service.is_completed ? 'Tamamlandı' : 'Süreçte');
                              })()}
                            </span>
                          </td>
                          <td className="text-muted">{formatDate(service.completed_at || service.scheduled_date)}</td>
                          <td className="fw-bold text-dark text-end py-3 px-4">{formatCurrency(service.total_payment)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  )
}

export default Reports


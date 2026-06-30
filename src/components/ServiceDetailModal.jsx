/**
 * Yeniden kullanılabilir servis detay modalı.
 * - serviceId prop'u ile detayı kendisi çeker.
 * - onClose prop'u ile kapatılır.
 * - Mevcut Services.jsx içindeki detay modalıyla aynı görsel tasarıma sahiptir.
 * - Customers.jsx ve Services.jsx gibi her sayfada modal olarak kullanılabilir,
 *   kullanıcı sayfada kalmaya devam eder.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Col,
  Form,
  InputGroup,
  Modal,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap'
import {
  FaEnvelope,
  FaFilePdf,
  FaPlus,
  FaTools,
  FaTrash,
  FaWhatsapp,
  FaWrench,
} from 'react-icons/fa'
import toast from 'react-hot-toast'

import api from '../api/api'
import { getServiceStatusMeta, SERVICE_STATUS_LIST } from '../constants/serviceStatuses'

function formatDateTime(value) {
  if (!value) return '-'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return '-'
  return dt.toLocaleString('tr-TR')
}

function formatPhoneInput(value) {
  const digits = String(value || '').replace(/\D/g, '')
  let normalized = digits
  if (normalized.startsWith('90')) normalized = normalized.slice(2)
  if (normalized.startsWith('0')) normalized = normalized.slice(1)
  normalized = normalized.slice(0, 10)
  if (!normalized) return ''
  const parts = []
  if (normalized.slice(0, 3)) parts.push(normalized.slice(0, 3))
  if (normalized.slice(3, 6)) parts.push(normalized.slice(3, 6))
  if (normalized.slice(6, 8)) parts.push(normalized.slice(6, 8))
  if (normalized.slice(8, 10)) parts.push(normalized.slice(8, 10))
  return '0' + parts.join(' ')
}

function getStatusClass(code) {
  const status = String(code || '')
  if (status === 'completed') return 'is-completed'
  if (status === 'in_progress') return 'is-progress'
  if (status === 'postponed' || status === 'assigned') return 'is-assigned'
  if (status === 'cancelled') return 'is-cancelled'
  return 'is-new'
}

function readApiError(error, fallback) {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data.detail === 'string') return data.detail
  if (typeof data.error === 'string') return data.error
  if (typeof data === 'object') {
    const firstEntry = Object.entries(data).find(([, v]) => v)
    if (firstEntry) {
      const [, v] = firstEntry
      if (Array.isArray(v) && v.length > 0) return String(v[0])
      if (typeof v === 'string') return v
    }
  }
  return fallback
}

function parseDownloadFilename(contentDisposition) {
  if (!contentDisposition) return ''
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(contentDisposition)
  if (!match) return ''
  try {
    return decodeURIComponent(match[1] || match[2] || '')
  } catch (e) {
    return match[1] || match[2] || ''
  }
}

function getPdfDownloadName(service) {
  const id = service?.id || ''
  return `Servis_Formu_${service?.receipt_number || id}.pdf`
}

const ServiceDetailModal = ({ serviceId, initialService = null, show, onClose, onUpdated }) => {
  const [service, setService] = useState(initialService)
  const [isLoading, setIsLoading] = useState(Boolean(serviceId))
  const [activeTab, setActiveTab] = useState('overview')
  const [actionLoadingKey, setActionLoadingKey] = useState('')
  const fetchedOnceRef = useRef(false)

  const statusMeta = useMemo(() => {
    return getServiceStatusMeta(service?.service_status, SERVICE_STATUS_LIST) || {
      label: service?.service_status || '-',
      color: '#6B7280',
      badge: 'secondary',
    }
  }, [service])

  const paymentSummary = useMemo(() => {
    const items = service?.items || []
    const payments = service?.payments || []
    const totalFromItems = items.reduce((sum, item) => sum + Number(item?.total_price || 0), 0)
    const total = service?.total_price ?? totalFromItems
    const paid = payments.reduce((sum, p) => sum + Number(p?.amount || 0), 0)
    const remaining = Math.max(0, Number(total || 0) - paid)
    return { total: Number(total || 0), paid, remaining }
  }, [service])

  const fetchService = async (id) => {
    if (!id) return
    setIsLoading(true)
    try {
      const res = await api.get(`/services/admin-services/${id}/`)
      setService(res.data)
      if (typeof onUpdated === 'function') onUpdated(res.data)
    } catch (error) {
      toast.error(readApiError(error, 'Servis detayı yüklenemedi.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!show) return
    if (initialService && initialService.id === serviceId && fetchedOnceRef.current) {
      // zaten elimizde var
      setIsLoading(false)
      return
    }
    fetchedOnceRef.current = true
    if (serviceId) {
      fetchService(serviceId)
    } else if (initialService) {
      setService(initialService)
      setIsLoading(false)
    }
  }, [serviceId, show, initialService])

  const closeAndReset = () => {
    setActiveTab('overview')
    setActionLoadingKey('')
    if (typeof onClose === 'function') onClose()
  }

  const downloadServiceFormPdf = async () => {
    if (!service?.id) return
    setActionLoadingKey(`pdf-${service.id}`)
    try {
      const response = await api.get(`/services/admin-services/${service.id}/form-pdf/`, {
        responseType: 'blob',
      })
      const fileUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = parseDownloadFilename(response?.headers?.['content-disposition']) || getPdfDownloadName(service)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(fileUrl)
      toast.success('Servis formu PDF indirildi.')
    } catch (error) {
      toast.error(readApiError(error, 'Servis PDF oluşturulamadı.'))
    } finally {
      setActionLoadingKey('')
    }
  }

  const downloadWarrantyPdf = async () => {
    if (!service?.id) return
    setActionLoadingKey(`warranty-pdf-${service.id}`)
    try {
      const response = await api.get(`/services/admin-services/${service.id}/warranty-pdf/?months=24`, {
        responseType: 'blob',
      })
      const fileUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = parseDownloadFilename(response?.headers?.['content-disposition']) || `Garanti_Belgesi_${service.receipt_number || service.id}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(fileUrl)
      toast.success('Garanti belgesi indirildi.')
    } catch (error) {
      toast.error(readApiError(error, 'Garanti belgesi oluşturulamadı.'))
    } finally {
      setActionLoadingKey('')
    }
  }

  const sendServiceFormEmail = async () => {
    if (!service?.id) return
    const requested = window.prompt('Gönderilecek e-posta adresi', '')
    const email = String(requested || '').trim()
    if (!email) {
      toast.error('E-posta adresi gerekli.')
      return
    }
    setActionLoadingKey(`mail-${service.id}`)
    try {
      const response = await api.post(`/services/admin-services/${service.id}/send-form-email/`, { email })
      toast.success(response?.data?.detail || 'Servis formu e-posta ile gönderildi.')
    } catch (error) {
      toast.error(readApiError(error, 'E-posta gönderimi başarısız.'))
    } finally {
      setActionLoadingKey('')
    }
  }

  const sendStatusWhatsApp = async () => {
    if (!service?.id) return
    setActionLoadingKey(`wa-${service.id}`)
    try {
      const response = await api.post(`/services/admin-services/${service.id}/whatsapp-status-link/`, {
        status: service.service_status,
      })
      const url = response?.data?.whatsapp_url
      if (!url) {
        toast.error('WhatsApp linki oluşturulamadı.')
        return
      }
      window.open(url, '_blank')
      toast.success('WhatsApp penceresi açıldı.')
    } catch (error) {
      toast.error(readApiError(error, 'WhatsApp bildirimi gönderilemedi.'))
    } finally {
      setActionLoadingKey('')
    }
  }

  return (
    <Modal show={show} onHide={closeAndReset} size="xl" dialogClassName="service-detail-modal">
      <Modal.Header closeButton className="bg-light align-items-start pb-3 border-bottom">
        <div className="w-100 pe-3">
          {isLoading || !service ? (
            <Modal.Title className="d-flex align-items-center gap-2">
              <FaWrench className="text-warning" /> Servis Detayı
            </Modal.Title>
          ) : (
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div className="d-flex flex-wrap align-items-center gap-3">
                <FaWrench className="text-warning fs-3" />
                <div>
                  <h5 className="mb-0 fw-bold">
                    #{service.receipt_number || '-'} - {service.customer_full_name || '-'}
                  </h5>
                  <div className="text-muted small">{formatPhoneInput(service.customer_phone) || '-'}</div>
                </div>
                <div className={`service-status-pill ms-lg-2 ${getStatusClass(service.service_status)}`}>
                  {statusMeta.label}
                </div>
              </div>
              <div className="d-flex gap-2">
                <Button
                  size="sm"
                  variant="outline-dark"
                  onClick={downloadServiceFormPdf}
                  disabled={actionLoadingKey === `pdf-${service.id}`}
                >
                  <FaFilePdf className="me-1" /> PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline-info"
                  onClick={downloadWarrantyPdf}
                  disabled={actionLoadingKey === `warranty-pdf-${service.id}`}
                >
                  <FaFilePdf className="me-1" /> Garanti
                </Button>
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={sendServiceFormEmail}
                  disabled={actionLoadingKey === `mail-${service.id}`}
                >
                  <FaEnvelope className="me-1" /> E-posta
                </Button>
                <Button
                  size="sm"
                  variant="outline-success"
                  onClick={sendStatusWhatsApp}
                  disabled={actionLoadingKey === `wa-${service.id}`}
                >
                  <FaWhatsapp className="me-1" /> WhatsApp
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal.Header>
      <Modal.Body className="service-detail-board pt-3">
        {isLoading || !service ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        ) : (
          <>
            <div
              className="service-detail-status-strip"
              style={{ background: `linear-gradient(90deg, ${service.status_color || statusMeta.color || '#6B7280'} 0%, ${(service.status_color || statusMeta.color || '#6B7280')}55 100%)` }}
            />

            <div className="service-tabs mb-3">
              <Button size="sm" variant={activeTab === 'overview' ? 'dark' : 'outline-dark'} onClick={() => setActiveTab('overview')}>Genel</Button>
              <Button size="sm" variant={activeTab === 'operations' ? 'dark' : 'outline-dark'} onClick={() => setActiveTab('operations')}>İşlemler</Button>
              <Button size="sm" variant={activeTab === 'payments' ? 'dark' : 'outline-dark'} onClick={() => setActiveTab('payments')}>Ödemeler</Button>
              <Button size="sm" variant={activeTab === 'timeline' ? 'dark' : 'outline-dark'} onClick={() => setActiveTab('timeline')}>Durum Geçmişi</Button>
              <Button size="sm" variant={activeTab === 'media' ? 'dark' : 'outline-dark'} onClick={() => setActiveTab('media')}>Medya</Button>
            </div>

            {activeTab === 'overview' && (
              <Row className="g-3">
                <Col lg={7}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Header className="bg-light fw-semibold">Servis Detayları</Card.Header>
                    <Card.Body className="p-3">
                      <Row className="g-2">
                        <Col md={6}>
                          <div className="service-meta-card">
                            <div className="meta-label">Cihaz</div>
                            <div className="meta-value">
                              {[service.device_type_name, service.device_brand_name, service.device_model_name].filter(Boolean).join(' / ') || '-'}
                            </div>
                          </div>
                        </Col>
                        <Col md={6}>
                          <div className="service-meta-card">
                            <div className="meta-label">Teknisyen</div>
                            <div className="meta-value">{service.technician_name || '-'}</div>
                          </div>
                        </Col>
                        <Col md={6}>
                          <div className="service-meta-card">
                            <div className="meta-label">Randevu</div>
                            <div className="meta-value">{formatDateTime(service.scheduled_date)}</div>
                          </div>
                        </Col>
                        <Col md={6}>
                          <div className="service-meta-card">
                            <div className="meta-label">Adres</div>
                            <div className="meta-value">{service.customer_address || '-'}</div>
                          </div>
                        </Col>
                        <Col md={12}>
                          <div className="service-meta-card">
                            <div className="meta-label">Arıza Notu</div>
                            <div className="meta-value">{service.fault_description || '-'}</div>
                          </div>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
                <Col lg={5}>
                  <div className="d-flex flex-column gap-3 h-100">
                    <div className="d-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="service-kpi-card is-info m-0 px-2 py-1">
                        <span>Toplam</span>
                        <strong>{paymentSummary.total.toLocaleString('tr-TR')} ₺</strong>
                      </div>
                      <div className="service-kpi-card is-success m-0 px-2 py-1">
                        <span>Alınan</span>
                        <strong>{paymentSummary.paid.toLocaleString('tr-TR')} ₺</strong>
                      </div>
                      <div className="service-kpi-card is-warning m-0 px-2 py-1">
                        <span>Kalan</span>
                        <strong>{paymentSummary.remaining.toLocaleString('tr-TR')} ₺</strong>
                      </div>
                      <div className="service-kpi-card is-neutral m-0 px-2 py-1">
                        <span>İşlem</span>
                        <strong>{(service.items || []).length}</strong>
                      </div>
                    </div>
                    <Card className="border-0 shadow-sm flex-grow-1">
                      <Card.Header className="bg-light fw-semibold">Son Durum Geçmişi</Card.Header>
                      <Card.Body>
                        <Table size="sm" className="m-0">
                          <thead>
                            <tr>
                              <th>Durum</th>
                              <th className="text-end">Tarih</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(service.timeline || []).slice(0, 5).map((line) => (
                              <tr key={line.id}>
                                <td>{line.new_status_name || '-'}</td>
                                <td className="text-end">{formatDateTime(line.timestamp)}</td>
                              </tr>
                            ))}
                            {(service.timeline || []).length === 0 ? (
                              <tr>
                                <td colSpan={2} className="text-center text-muted">Kayıt yok</td>
                              </tr>
                            ) : null}
                          </tbody>
                        </Table>
                      </Card.Body>
                    </Card>
                  </div>
                </Col>
              </Row>
            )}

            {activeTab === 'operations' && (
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-light fw-semibold">İşlemler</Card.Header>
                <Card.Body>
                  <Table size="sm" className="m-0">
                    <thead>
                      <tr>
                        <th>İşlem</th>
                        <th className="text-center">Adet</th>
                        <th className="text-end">Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(service.items || []).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center text-muted">Kayıt yok</td>
                        </tr>
                      ) : (
                        (service.items || []).map((item) => (
                          <tr key={item.id}>
                            <td>
                              <div className="fw-semibold">{item.name || '-'}</div>
                              {item.product_name ? <small className="d-block text-primary">{item.product_name}</small> : null}
                              {item.description ? <small className="text-muted">{item.description}</small> : null}
                            </td>
                            <td className="text-center">{item.quantity || 0}</td>
                            <td className="text-end">{Number(item.total_price || 0).toLocaleString('tr-TR')} ₺</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                  <div className="text-muted small mt-3">
                    <FaTools className="me-1" /> İşlem ekleme/düzenleme için lütfen Servisler sayfasını kullanın.
                  </div>
                </Card.Body>
              </Card>
            )}

            {activeTab === 'payments' && (
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-light fw-semibold">Ödemeler</Card.Header>
                <Card.Body>
                  <div className="d-flex flex-wrap gap-3 mb-3 small">
                    <div><strong>Toplam:</strong> {paymentSummary.total.toLocaleString('tr-TR')} ₺</div>
                    <div><strong>Ödenen:</strong> {paymentSummary.paid.toLocaleString('tr-TR')} ₺</div>
                    <div className={paymentSummary.remaining > 0 ? 'text-danger fw-semibold' : 'text-success fw-semibold'}>
                      <strong>Kalan:</strong> {paymentSummary.remaining.toLocaleString('tr-TR')} ₺
                    </div>
                  </div>
                  <Table size="sm" className="m-0">
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>Yöntem</th>
                        <th className="text-end">Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(service.payments || []).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center text-muted">Kayıt yok</td>
                        </tr>
                      ) : (
                        (service.payments || []).map((pay) => (
                          <tr key={pay.id}>
                            <td>{formatDateTime(pay.created_at)}</td>
                            <td>{pay.payment_method_name || '-'}</td>
                            <td className="text-end">{Number(pay.amount || 0).toLocaleString('tr-TR')} ₺</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                  <div className="text-muted small mt-3">
                    Ödeme ekleme/düzenleme için lütfen Servisler sayfasını kullanın.
                  </div>
                </Card.Body>
              </Card>
            )}

            {activeTab === 'timeline' && (
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-light fw-semibold">Durum Geçmişi</Card.Header>
                <Card.Body>
                  <Table size="sm" className="m-0">
                    <thead>
                      <tr>
                        <th>Durum</th>
                        <th>Not</th>
                        <th className="text-end">Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(service.timeline || []).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center text-muted">Kayıt yok</td>
                        </tr>
                      ) : (
                        (service.timeline || []).map((line) => (
                          <tr key={line.id}>
                            <td>
                              <Badge bg="info">{line.new_status_name || '-'}</Badge>
                            </td>
                            <td>{line.note || '-'}</td>
                            <td className="text-end">{formatDateTime(line.timestamp)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}

            {activeTab === 'media' && (
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-light fw-semibold">Medya & İmzalar</Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <h6 className="fw-semibold">Fotoğraflar</h6>
                      <div className="d-flex flex-wrap gap-2">
                        {(service.photos || []).length === 0 ? (
                          <div className="text-muted small">Fotoğraf kaydı yok</div>
                        ) : (
                          (service.photos || []).map((photo) => (
                            <img
                              key={photo.id}
                              src={photo.image || photo.url || ''}
                              alt={photo.caption || 'Servis fotoğrafı'}
                              style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 6 }}
                              className="border"
                            />
                          ))
                        )}
                      </div>
                    </Col>
                    <Col md={6}>
                      <h6 className="fw-semibold">İmzalar</h6>
                      <div className="d-flex flex-wrap gap-2">
                        {(service.signatures || []).length === 0 ? (
                          <div className="text-muted small">İmza kaydı yok</div>
                        ) : (
                          (service.signatures || []).map((sign) => (
                            <div key={sign.id} className="d-flex flex-column gap-1">
                              {sign.customer_signature ? (
                                <img src={sign.customer_signature} alt="Müşteri imzası" style={{ width: 120, height: 60, objectFit: 'contain', background: '#fff' }} className="border" />
                              ) : null}
                              {sign.technician_signature ? (
                                <img src={sign.technician_signature} alt="Teknisyen imzası" style={{ width: 120, height: 60, objectFit: 'contain', background: '#fff' }} className="border" />
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>
                    </Col>
                  </Row>
                  <div className="text-muted small mt-3">
                    Fotoğraf / imza yükleme için lütfen Servisler sayfasını kullanın.
                  </div>
                </Card.Body>
              </Card>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={closeAndReset}>Kapat</Button>
      </Modal.Footer>
    </Modal>
  )
}

export default ServiceDetailModal
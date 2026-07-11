import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import api from '../../api/api'
import './PublicServiceTracking.css'

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const formatMoney = (value) => {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(Number.isFinite(amount) ? amount : 0)
}

const joinDeviceName = (service) => {
  const parts = [service?.device_type_name, service?.device_brand_name, service?.device_model_name]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
  return parts.length ? parts.join(' / ') : '-'
}

const buildPdfFileName = (service) => {
  const receipt = String(service?.receipt_number || service?.id || 'servis').trim()
  const customer = String(service?.masked_customer_name || 'müşteri')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w-]/g, '')

  return `ServisFormu_${customer || 'müşteri'}_${receipt}.pdf`
}

const resolveLogoUrl = (logoPath) => {
  if (!logoPath) return ''
  if (/^https?:\/\//i.test(logoPath)) return logoPath

  const baseUrl = api.defaults.baseURL || ''
  if (!baseUrl) return logoPath

  try {
    const parsed = new URL(baseUrl)
    const apiOrigin = `${parsed.protocol}//${parsed.host}`
    return `${apiOrigin}${logoPath.startsWith('/') ? '' : '/'}${logoPath}`
  } catch {
    return logoPath
  }
}

const DEFAULT_COMPANY = {
  name: 'Servis Yönetim Sistemi',
  logo: null,
  phone_number: '',
  email: '',
  address: '',
}

const PublicServiceTracking = () => {
  const { serviceId } = useParams()
  const [searchParams] = useSearchParams()
  const accessToken = searchParams.get('access_token') || ''

  const [service, setService] = useState(null)
  const [company, setCompany] = useState(DEFAULT_COMPANY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')

  useEffect(() => {
    let ignore = false

    const fetchData = async () => {
      if (!serviceId) {
        setError('Takip bağlantısı geçersiz.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const [serviceResponse, companyResponse] = await Promise.all([
          api.get(`/services/public-services/${serviceId}/`),
          api.get('/config/public/company/').catch(() => ({ data: DEFAULT_COMPANY })),
        ])

        if (ignore) return

        setService(serviceResponse.data)
        setCompany({
          ...DEFAULT_COMPANY,
          ...(companyResponse?.data || {}),
        })
      } catch (err) {
        if (!ignore) {
          setError(err?.response?.data?.detail || 'Servis bilgisi alınamadı.')
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    void fetchData()

    return () => {
      ignore = true
    }
  }, [accessToken, serviceId])

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl)
      }
    }
  }, [pdfPreviewUrl])

  const timeline = useMemo(() => {
    return Array.isArray(service?.timeline) ? [...service.timeline].reverse() : []
  }, [service])

  const summaryItems = useMemo(() => ([
    { label: 'Servis No', value: `#${service?.receipt_number || service?.id || '-'}` },
    { label: 'Müşteri', value: service?.masked_customer_name || '-' },
    { label: 'İşlem Tarihi', value: formatDateTime(service?.created_at) },
    { label: 'Cihaz', value: joinDeviceName(service) },
  ]), [service])

  const loadPdfBlobUrl = async () => {
    if (!serviceId || !accessToken) return ''

    setPdfLoading(true)
    setPdfError('')

    try {
      const response = await api.get(`/services/public-services/${serviceId}/form-pdf/`, {
        params: { access_token: accessToken },
        responseType: 'blob',
      })

      return window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
    } catch {
      setPdfError('PDF alınamadı. Lütfen daha sonra tekrar deneyin.')
      return ''
    } finally {
      setPdfLoading(false)
    }
  }

  const handlePreviewPdf = async () => {
    const nextUrl = await loadPdfBlobUrl()
    if (!nextUrl) return

    if (pdfPreviewUrl) {
      window.URL.revokeObjectURL(pdfPreviewUrl)
    }
    setPdfPreviewUrl(nextUrl)
  }

  const handleDownloadPdf = async () => {
    const nextUrl = await loadPdfBlobUrl()
    if (!nextUrl) return

    const link = document.createElement('a')
    link.href = nextUrl
    link.setAttribute('download', buildPdfFileName(service))
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(nextUrl)
  }

  return (
    <main className="public-service-page">
      <seçtion className="public-service-shell" aria-live="polite">
        <header className="public-service-brandbar">
          <div className="public-service-brand">
            {company?.logo ? (
              <img src={resolveLogoUrl(company.logo)} alt={company?.name || 'Firma logosu'} className="public-service-brand-logo" />
            ) : (
              <div className="public-service-brand-fallback">S</div>
            )}
            <div className="public-service-brand-copy">
              <span className="public-service-eyebrow">Müşteri Portalı</span>
              <h1>{company?.name || 'Servis Yönetim Sistemi'}</h1>
            </div>
          </div>
          <div className="public-service-brand-meta">
            {company?.phone_number ? <span>{company.phone_number}</span> : null}
            {company?.email ? <span>{company.email}</span> : null}
          </div>
        </header>

        {loading ? (
          <div className="public-service-state">Servis bilgisi yükleniyor.</div>
        ) : error ? (
          <div className="public-service-state is-error">{error}</div>
        ) : (
          <>
            <seçtion className="public-service-hero-card">
              <div className="public-service-hero-copy">
                <span className="public-service-ticket">Servis Takibi</span>
                <h2>{service?.status_name || 'Servis Durumu'}</h2>
                <p>Servis kaydınızın son durumu, özet bilgileri ve servis formu burada yer alır.</p>
              </div>
              <div className="public-service-hero-side">
                {service?.status_name ? (
                  <span className="public-service-status" style={{ '--status-color': service.status_color || '#2563eb' }}>
                    {service.status_name}
                  </span>
                ) : null}
                <div className="public-service-actions">
                  <button type="button" onClick={handlePreviewPdf} className="public-service-action-btn" disabled={pdfLoading}>
                    {pdfLoading ? 'Hazırlanıyor...' : 'PDF Görüntüle'}
                  </button>
                  <button type="button" onClick={handleDownloadPdf} className="public-service-action-btn is-secondary" disabled={pdfLoading}>
                    PDF İndir
                  </button>
                </div>
              </div>
            </seçtion>

            <seçtion className="public-service-summary-grid">
              {summaryItems.map((item) => (
                <article key={item.label} className="public-service-info-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </seçtion>

            {pdfError ? <div className="public-service-inline-error">{pdfError}</div> : null}

            <seçtion className="public-service-portal-grid">
              <article className="public-service-panel public-service-panel-soft">
                <div className="public-service-panel-head">
                  <div>
                    <h3>Arıza Açıklaması</h3>
                    <p>Tarafımıza iletilen servis notu</p>
                  </div>
                </div>
                <div className="public-service-note-card">
                  {service?.fault_description || 'Açıklama bilgisi bulunmuyor.'}
                </div>
              </article>

              <article className="public-service-panel public-service-panel-soft">
                <div className="public-service-panel-head">
                  <div>
                    <h3>Toplam Tutar</h3>
                    <p>Servis işlem toplamı</p>
                  </div>
                </div>
                <div className="public-service-amount-card">
                  <span>Toplam</span>
                  <strong>{formatMoney(service?.total_price)}</strong>
                </div>
              </article>

              <article className="public-service-panel public-service-panel-soft">
                <div className="public-service-panel-head">
                  <div>
                    <h3>Servis Formu</h3>
                    <p>Belgeyi görüntüleyin veya indirin</p>
                  </div>
                </div>
                <div className="public-service-doc-actions">
                  <button type="button" onClick={handlePreviewPdf} className="public-service-action-btn" disabled={pdfLoading}>
                    {pdfLoading ? 'Hazırlanıyor...' : 'PDF Görüntüle'}
                  </button>
                  <button type="button" onClick={handleDownloadPdf} className="public-service-action-btn is-secondary" disabled={pdfLoading}>
                    PDF İndir
                  </button>
                </div>
              </article>

              <article className="public-service-panel public-service-panel-soft">
                <div className="public-service-panel-head">
                  <div>
                    <h3>Son Güncelleme</h3>
                    <p>Servis kaydındaki en son hareket</p>
                  </div>
                </div>
                <div className="public-service-note-card is-compact">
                  {formatDateTime(service?.updated_at)}
                </div>
              </article>
            </seçtion>

            {pdfPreviewUrl ? (
              <seçtion className="public-service-panel public-service-pdf-panel">
                <div className="public-service-panel-head">
                  <div>
                    <h3>PDF Önizleme</h3>
                    <p>Servis formu görüntüsü</p>
                  </div>
                  <button type="button" className="public-service-text-btn" onClick={() => setPdfPreviewUrl('')}>
                    Kapat
                  </button>
                </div>
                <div className="public-service-pdf-frame-wrap">
                  <iframe title="Servis Formu PDF" src={pdfPreviewUrl} className="public-service-pdf-frame" />
                </div>
              </seçtion>
            ) : null}

            <seçtion className="public-service-lower-grid">
              <article className="public-service-panel">
                <div className="public-service-panel-head">
                  <div>
                    <h3>İşlem Özeti</h3>
                    <p>Serviste yapılan işlemler</p>
                  </div>
                </div>
                <ul className="public-service-items">
                  {(service?.items || []).length > 0 ? service.items.map((item) => (
                    <li key={item.id}>
                      <div>
                        <strong>{item.operation_name || item.custom_name || 'İşlem'}</strong>
                        {item.description ? <span>{item.description}</span> : null}
                      </div>
                      <em>{item.quantity || 1} adet</em>
                    </li>
                  )) : <li className="is-empty">İşlem kaydı bulunmuyor.</li>}
                </ul>
              </article>

              <article className="public-service-panel">
                <div className="public-service-panel-head">
                  <div>
                    <h3>Durum Geçmişi</h3>
                    <p>Servis sürecindeki son güncellemeler</p>
                  </div>
                </div>
                <ol className="public-service-timeline">
                  {timeline.length > 0 ? timeline.map((line) => (
                    <li key={line.id}>
                      <span className="timeline-dot" style={{ '--status-color': line.new_status_color || '#64748b' }} />
                      <div>
                        <strong>{line.new_status_name || '-'}</strong>
                        <span>{formatDateTime(line.timestamp)}</span>
                      </div>
                    </li>
                  )) : <li className="is-empty">Henüz durum geçmişi bulunmuyor.</li>}
                </ol>
              </article>
            </seçtion>
          </>
        )}
      </seçtion>
    </main>
  )
}

export default PublicServiceTracking

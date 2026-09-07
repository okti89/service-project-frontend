import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { toast } from 'react-hot-toast'
import {
  FaDownload,
  FaEdit,
  FaEnvelope,
  FaExchangeAlt,
  FaFileInvoiceDollar,
  FaPlus,
  FaSearch,
  FaShareAlt,
  FaTimes,
  FaTrash,
} from 'react-icons/fa'

import api from '../../api/api'
import './Quotes.css'

const newItem = () => ({
  product: '',
  name: '',
  description: '',
  quantity: 1,
  unit_price: '',
})

const emptyForm = () => ({
  customer: '',
  note: '',
  valid_until: '',
  items: [newItem()],
})

const asArray = (data) => {
  if (Array.isArray(data)) return data
  return Array.isArray(data?.results) ? data.results : []
}

const money = (value) => new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value || 0)) + ' TL'

const formatDate = (value) => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data
  if (typeof data?.detail === 'string') return data.detail
  if (typeof data === 'string') return data
  if (data && typeof data === 'object') {
    const first = Object.values(data)[0]
    if (Array.isArray(first)) {
      const nested = first[0]
      if (typeof nested === 'string') return nested
      if (nested && typeof nested === 'object') {
        const nestedMessage = Object.values(nested)[0]
        if (Array.isArray(nestedMessage)) return nestedMessage[0]
      }
    }
  }
  return fallback
}

const quoteState = (quote) => {
  if (quote.converted_service) return { label: 'Servise dönüştürüldü', bg: 'success' }
  if (quote.sent_at) return { label: 'Gönderildi', bg: 'primary' }
  return { label: 'Taslak', bg: 'secondary' }
}

const Quotes = () => {
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionKey, setActionKey] = useState('')
  const [search, setSearch] = useState('')
  const [formModal, setFormModal] = useState({ open: false, quote: null })
  const [detailQuote, setDetailQuote] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [convertModal, setConvertModal] = useState({ open: false, quote: null })
  const [convertForm, setConvertForm] = useState({ scheduled_date: '', technician: '' })

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true)
    try {
      const [quoteResponse, customerResponse, productResponse, technicianResponse] = await Promise.all([
        api.get('/quotes/'),
        api.get('/customers/customer-list/?status=all'),
        api.get('/products/products/'),
        api.get('/technicians/technician-list/?include_inactive=false').catch(() => ({ data: [] })),
      ])
      setQuotes(asArray(quoteResponse.data))
      setCustomers(asArray(customerResponse.data))
      setProducts(asArray(productResponse.data).filter((product) => product.is_active !== false))
      setTechnicians(asArray(technicianResponse.data))
    } catch (error) {
      toast.error(getErrorMessage(error, 'Teklif verileri yüklenemedi.'))
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredQuotes = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('tr-TR')
    if (!term) return quotes
    return quotes.filter((quote) => [
      quote.quote_number,
      quote.customer_detail?.full_name,
      quote.customer_detail?.phone_number,
      quote.note,
    ].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR').includes(term))
  }, [quotes, search])

  const openForm = (quote = null) => {
    if (quote) {
      setForm({
        customer: String(quote.customer || ''),
        note: quote.note || '',
        valid_until: quote.valid_until || '',
        items: quote.items?.length
          ? quote.items.map((item) => ({
            product: item.product ? String(item.product) : '',
            name: item.name || '',
            description: item.description || '',
            quantity: item.quantity || 1,
            unit_price: item.unit_price ?? '',
          }))
          : [newItem()],
      })
    } else {
      setForm(emptyForm())
    }
    setDetailQuote(null)
    setFormModal({ open: true, quote })
  }

  const closeForm = () => {
    if (saving) return
    setFormModal({ open: false, quote: null })
    setForm(emptyForm())
  }

  const updateItem = (index, field, value) => {
    setForm((current) => {
      const items = current.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        if (field === 'name') {
          const normalizedValue = value.trim().toLocaleLowerCase('tr-TR')
          const product = products.find(
            (entry) => entry.name?.trim().toLocaleLowerCase('tr-TR') === normalizedValue,
          )
          return {
            ...item,
            product: product ? String(product.id) : '',
            name: value,
            description: product?.description || item.description,
            unit_price: product?.price ?? item.unit_price,
          }
        }
        return { ...item, [field]: value }
      })
      return { ...current, items }
    })
  }

  const removeItem = (index) => {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1
        ? current.items
        : current.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const formTotal = useMemo(() => form.items.reduce(
    (total, item) => total + (Number(item.quantity || 0) * Number(item.unit_price || 0)),
    0,
  ), [form.items])

  const submitForm = async (event) => {
    event.preventDefault()
    if (!form.customer) {
      toast.error('Müşteri seçin.')
      return
    }
    if (form.items.some((item) => !item.name.trim() || Number(item.quantity) <= 0 || item.unit_price === '')) {
      toast.error('Teklif işlemlerini eksiksiz doldurun.')
      return
    }

    const payload = {
      customer: form.customer,
      note: form.note.trim(),
      valid_until: form.valid_until || null,
      items: form.items.map((item) => ({
        product: item.product || null,
        name: item.name.trim(),
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unit_price: String(item.unit_price),
      })),
    }

    setSaving(true)
    try {
      if (formModal.quote) {
        await api.patch(`/quotes/${formModal.quote.id}/`, payload)
        toast.success('Teklif güncellendi.')
      } else {
        await api.post('/quotes/', payload)
        toast.success('Teklif oluşturuldu.')
      }
      setFormModal({ open: false, quote: null })
      setForm(emptyForm())
      await fetchData(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Teklif kaydedilemedi.'))
    } finally {
      setSaving(false)
    }
  }

  const deleteQuote = async (quote) => {
    if (!window.confirm(`${quote.quote_number} numaralı teklif silinsin mi?`)) return
    setActionKey(`delete-${quote.id}`)
    try {
      await api.delete(`/quotes/${quote.id}/`)
      if (detailQuote?.id === quote.id) setDetailQuote(null)
      setQuotes((current) => current.filter((entry) => entry.id !== quote.id))
      toast.success('Teklif silindi.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Teklif silinemedi.'))
    } finally {
      setActionKey('')
    }
  }

  const getPdf = async (quote) => {
    const response = await api.get(`/quotes/${quote.id}/pdf/`, { responseType: 'blob' })
    return {
      blob: response.data,
      filename: `Teklif_${quote.quote_number}.pdf`,
    }
  }

  const downloadPdf = async (quote) => {
    setActionKey(`pdf-${quote.id}`)
    try {
      const { blob, filename } = await getPdf(quote)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Teklif PDF’i indirilemedi.'))
    } finally {
      setActionKey('')
    }
  }

  const sharePdf = async (quote) => {
    setActionKey(`share-${quote.id}`)
    try {
      const { blob, filename } = await getPdf(quote)
      const file = new File([blob], filename, { type: 'application/pdf' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Fiyat Teklifi ${quote.quote_number}`,
          text: `${quote.customer_detail?.full_name || 'Müşteri'} için fiyat teklifi`,
        })
        await api.post(`/quotes/${quote.id}/mark-sent/`)
        setDetailQuote((current) => current?.id === quote.id
          ? { ...current, sent_at: current.sent_at || new Date().toISOString() }
          : current)
        await fetchData(false)
      } else {
        toast('Bu tarayıcı dosya paylaşımını desteklemiyor; PDF indiriliyor.')
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        toast.error(getErrorMessage(error, 'Teklif PDF’i paylaşılamadı.'))
      }
    } finally {
      setActionKey('')
    }
  }

  const sendEmail = async (quote) => {
    if (!quote.customer_detail?.email) {
      toast.error('Müşterinin kayıtlı e-posta adresi yok.')
      return
    }
    setActionKey(`email-${quote.id}`)
    try {
      await api.post(`/quotes/${quote.id}/send-email/`, {})
      toast.success(`Teklif ${quote.customer_detail.email} adresine gönderildi.`)
      setDetailQuote((current) => current?.id === quote.id
        ? { ...current, sent_at: current.sent_at || new Date().toISOString() }
        : current)
      await fetchData(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Teklif e-posta ile gönderilemedi.'))
    } finally {
      setActionKey('')
    }
  }

  const openConvert = (quote) => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const localValue = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    setConvertForm({ scheduled_date: localValue, technician: '' })
    setDetailQuote(null)
    setConvertModal({ open: true, quote })
  }

  const convertToService = async (event) => {
    event.preventDefault()
    const quote = convertModal.quote
    if (!quote || !convertForm.scheduled_date) return
    setSaving(true)
    try {
      await api.post(`/quotes/${quote.id}/convert-to-service/`, {
        scheduled_date: new Date(convertForm.scheduled_date).toISOString(),
        technician: convertForm.technician || null,
      })
      toast.success('Teklif servis kaydına dönüştürüldü.')
      setConvertModal({ open: false, quote: null })
      setDetailQuote(null)
      await fetchData(false)
      navigate('/dashboard/services')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Teklif servise dönüştürülemedi.'))
    } finally {
      setSaving(false)
    }
  }

  const actionButtons = (quote, compact = false) => (
    <div className={`quote-actions ${compact ? 'quote-actions--compact' : ''}`}>
      <Button variant="outline-primary" size="sm" onClick={() => downloadPdf(quote)} disabled={Boolean(actionKey)} title="PDF indir">
        <FaDownload /> {!compact && 'PDF'}
      </Button>
      <Button variant="outline-success" size="sm" onClick={() => sharePdf(quote)} disabled={Boolean(actionKey)} title="PDF paylaş">
        <FaShareAlt /> {!compact && 'Paylaş'}
      </Button>
      <Button variant="outline-info" size="sm" onClick={() => sendEmail(quote)} disabled={Boolean(actionKey)} title="E-posta gönder">
        <FaEnvelope /> {!compact && 'E-posta'}
      </Button>
      {!quote.converted_service && (
        <>
          <Button variant="outline-warning" size="sm" onClick={() => openForm(quote)} disabled={Boolean(actionKey)} title="Düzenle">
            <FaEdit /> {!compact && 'Düzenle'}
          </Button>
          <Button variant="outline-dark" size="sm" onClick={() => openConvert(quote)} disabled={Boolean(actionKey)} title="Servise dönüştür">
            <FaExchangeAlt /> {!compact && 'Servise Dönüştür'}
          </Button>
        </>
      )}
      <Button variant="outline-danger" size="sm" onClick={() => deleteQuote(quote)} disabled={Boolean(actionKey)} title="Sil">
        <FaTrash />
      </Button>
    </div>
  )

  return (
    <div className="quotes-page">
      <div className="quotes-header">
        <div>
          <h1><FaFileInvoiceDollar /> Teklifler</h1>
          <p>Müşterileriniz için sade fiyat teklifleri hazırlayın ve paylaşın.</p>
        </div>
        <Button variant="primary" onClick={() => openForm()}>
          <FaPlus /> Yeni Teklif
        </Button>
      </div>

      <div className="quotes-toolbar">
        <InputGroup>
          <InputGroup.Text><FaSearch /></InputGroup.Text>
          <Form.Control
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Teklif no, müşteri veya telefon ara"
          />
          {search && (
            <Button variant="light" onClick={() => setSearch('')} title="Aramayı temizle">
              <FaTimes />
            </Button>
          )}
        </InputGroup>
        <span>{filteredQuotes.length} teklif</span>
      </div>

      <Card className="quotes-table-card">
        {loading ? (
          <div className="quotes-state"><Spinner animation="border" variant="primary" /></div>
        ) : filteredQuotes.length === 0 ? (
          <div className="quotes-state">
            <FaFileInvoiceDollar />
            <strong>{search ? 'Eşleşen teklif bulunamadı' : 'Henüz teklif oluşturulmadı'}</strong>
            {!search && <span>İlk teklifinizi oluşturmak için Yeni Teklif düğmesini kullanın.</span>}
          </div>
        ) : (
          <>
            <div className="quotes-desktop-table table-responsive">
              <Table hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Teklif No</th>
                    <th>Müşteri</th>
                    <th>Tarih</th>
                    <th>Geçerlilik</th>
                    <th>Durum</th>
                    <th className="text-end">Toplam</th>
                    <th className="text-end">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map((quote) => {
                    const state = quoteState(quote)
                    return (
                      <tr key={quote.id}>
                        <td><button className="quote-number" onClick={() => setDetailQuote(quote)}>{quote.quote_number}</button></td>
                        <td>
                          <strong>{quote.customer_detail?.full_name || '-'}</strong>
                          <small>{quote.customer_detail?.phone_number || ''}</small>
                        </td>
                        <td>{formatDate(quote.created_at)}</td>
                        <td>{formatDate(quote.valid_until)}</td>
                        <td><Badge bg={state.bg}>{state.label}</Badge></td>
                        <td className="text-end fw-bold">{money(quote.total_price)}</td>
                        <td className="text-end">{actionButtons(quote, true)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>

            <div className="quotes-mobile-list">
              {filteredQuotes.map((quote) => {
                const state = quoteState(quote)
                return (
                  <article className="quote-mobile-card" key={quote.id}>
                    <button className="quote-mobile-main" onClick={() => setDetailQuote(quote)}>
                      <span className="quote-mobile-topline">
                        <strong>{quote.quote_number}</strong>
                        <Badge bg={state.bg}>{state.label}</Badge>
                      </span>
                      <span className="quote-mobile-customer">{quote.customer_detail?.full_name || '-'}</span>
                      <span className="quote-mobile-meta">{formatDate(quote.created_at)} · {quote.items?.length || 0} işlem</span>
                      <b>{money(quote.total_price)}</b>
                    </button>
                    {actionButtons(quote, true)}
                  </article>
                )
              })}
            </div>
          </>
        )}
      </Card>

      <Modal show={formModal.open} onHide={closeForm} size="xl" centered scrollable backdrop="static">
        <Form onSubmit={submitForm}>
          <Modal.Header closeButton={!saving}>
            <Modal.Title>{formModal.quote ? 'Teklifi Düzenle' : 'Yeni Teklif'}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="quote-form-body">
            <Row className="g-3 mb-4">
              <Col md={7}>
                <Form.Group>
                  <Form.Label>Müşteri *</Form.Label>
                  <Form.Select required value={form.customer} onChange={(event) => setForm((current) => ({ ...current, customer: event.target.value }))}>
                    <option value="">Müşteri seçin</option>
                    {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name} {customer.phone_number ? `- ${customer.phone_number}` : ''}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={5}>
                <Form.Group>
                  <Form.Label>Geçerlilik Tarihi</Form.Label>
                  <Form.Control type="date" min={new Date().toISOString().slice(0, 10)} value={form.valid_until} onChange={(event) => setForm((current) => ({ ...current, valid_until: event.target.value }))} />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Teklif Notu</Form.Label>
                  <Form.Control as="textarea" rows={2} value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="Teklif hakkında kısa açıklama" />
                </Form.Group>
              </Col>
            </Row>

            <div className="quote-items-heading">
              <div>
                <h2>Teklif İşlemleri</h2>
                <span>İşlem adını yazın veya kayıtlı ürünlerden birini seçin.</span>
              </div>
              <Button variant="outline-primary" size="sm" type="button" onClick={() => setForm((current) => ({ ...current, items: [...current.items, newItem()] }))}>
                <FaPlus /> İşlem Ekle
              </Button>
            </div>

            <div className="quote-item-list">
              {form.items.map((item, index) => (
                <div className="quote-item-row" key={index}>
                  <div className="quote-item-index">{index + 1}</div>
                  <Form.Group className="quote-item-name">
                    <Form.Label>İşlem Adı *</Form.Label>
                    <Form.Control
                      required
                      list={`quote-products-${index}`}
                      value={item.name}
                      onChange={(event) => updateItem(index, 'name', event.target.value)}
                      placeholder="İşlem yazın veya ürün seçin"
                    />
                    <datalist id={`quote-products-${index}`}>
                      {products.map((product) => <option key={product.id} value={product.name}>{money(product.price)}</option>)}
                    </datalist>
                  </Form.Group>
                  <Form.Group className="quote-item-description">
                    <Form.Label>Açıklama</Form.Label>
                    <Form.Control value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} />
                  </Form.Group>
                  <Form.Group className="quote-item-quantity">
                    <Form.Label>Adet *</Form.Label>
                    <Form.Control required type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} />
                  </Form.Group>
                  <Form.Group className="quote-item-price">
                    <Form.Label>Birim Fiyat *</Form.Label>
                    <Form.Control required type="number" min="0" step="0.01" value={item.unit_price} onChange={(event) => updateItem(index, 'unit_price', event.target.value)} />
                  </Form.Group>
                  <div className="quote-item-total">
                    <span>Toplam</span>
                    <strong>{money(Number(item.quantity || 0) * Number(item.unit_price || 0))}</strong>
                  </div>
                  <Button className="quote-item-remove" variant="outline-danger" type="button" onClick={() => removeItem(index)} disabled={form.items.length === 1} title="İşlemi sil">
                    <FaTrash />
                  </Button>
                </div>
              ))}
            </div>

            <div className="quote-form-total"><span>Genel Toplam</span><strong>{money(formTotal)}</strong></div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeForm} disabled={saving}>İptal</Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? <Spinner animation="border" size="sm" /> : 'Teklifi Kaydet'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(detailQuote)} onHide={() => setDetailQuote(null)} size="lg" centered scrollable>
        {detailQuote && (
          <>
            <Modal.Header closeButton>
              <Modal.Title>{detailQuote.quote_number}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="quote-detail">
              <div className="quote-detail-summary">
                <div><span>Müşteri</span><strong>{detailQuote.customer_detail?.full_name || '-'}</strong></div>
                <div><span>Telefon</span><strong>{detailQuote.customer_detail?.phone_number || '-'}</strong></div>
                <div><span>Geçerlilik</span><strong>{formatDate(detailQuote.valid_until)}</strong></div>
                <div><span>Durum</span><Badge bg={quoteState(detailQuote).bg}>{quoteState(detailQuote).label}</Badge></div>
              </div>
              {detailQuote.note && <div className="quote-detail-note"><span>Not</span><p>{detailQuote.note}</p></div>}
              <div className="table-responsive">
                <Table className="quote-detail-table align-middle">
                  <thead><tr><th>İşlem</th><th>Açıklama</th><th className="text-end">Adet</th><th className="text-end">Birim Fiyat</th><th className="text-end">Toplam</th></tr></thead>
                  <tbody>{detailQuote.items.map((item) => <tr key={item.id}><td className="fw-semibold">{item.name}</td><td>{item.description || '-'}</td><td className="text-end">{item.quantity}</td><td className="text-end">{money(item.unit_price)}</td><td className="text-end fw-bold">{money(item.total_price)}</td></tr>)}</tbody>
                </Table>
              </div>
              <div className="quote-detail-total"><span>Genel Toplam</span><strong>{money(detailQuote.total_price)}</strong></div>
            </Modal.Body>
            <Modal.Footer className="quote-detail-actions">
              {actionButtons(detailQuote)}
            </Modal.Footer>
          </>
        )}
      </Modal>

      <Modal show={convertModal.open} onHide={() => !saving && setConvertModal({ open: false, quote: null })} centered backdrop="static">
        <Form onSubmit={convertToService}>
          <Modal.Header closeButton={!saving}><Modal.Title>Servise Dönüştür</Modal.Title></Modal.Header>
          <Modal.Body>
            <p className="text-muted">{convertModal.quote?.quote_number} için servis randevusunu belirleyin. Ürün stokları bu işlemden sonra düşer.</p>
            <Form.Group className="mb-3">
              <Form.Label>Randevu Tarihi *</Form.Label>
              <Form.Control required type="datetime-local" value={convertForm.scheduled_date} onChange={(event) => setConvertForm((current) => ({ ...current, scheduled_date: event.target.value }))} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Teknisyen</Form.Label>
              <Form.Select value={convertForm.technician} onChange={(event) => setConvertForm((current) => ({ ...current, technician: event.target.value }))}>
                <option value="">Daha sonra atanacak</option>
                {technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.full_name || technician.user_full_name || technician.email || 'Teknisyen'}</option>)}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setConvertModal({ open: false, quote: null })} disabled={saving}>İptal</Button>
            <Button variant="primary" type="submit" disabled={saving}>{saving ? <Spinner animation="border" size="sm" /> : 'Servis Oluştur'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}

export default Quotes

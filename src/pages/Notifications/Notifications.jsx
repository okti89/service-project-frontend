import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  InputGroup,
  ListGroup,
  ProgressBar,
  Row,
  Spinner,
  Tab,
  Tabs
} from 'react-bootstrap'
import {
  FaBell,
  FaBullhorn,
  FaCheckCircle,
  FaEnvelope,
  FaHistory,
  FaPaperPlane,
  FaPlus,
  FaSearch,
  FaTimes,
  FaUsers
} from 'react-icons/fa'
import api from '../../api/api'
import toast from 'react-hot-toast'

const ANNOUNCEMENT_TEMPLATES = [
  {
    id: 'maintenance',
    name: 'Bakım Bilgilendirmesi',
    title: 'Planlı bakım duyurusu',
    message: 'Sistem bakımımız bu geçe 23:00 - 01:00 arasında gerçekleştirilecektir.',
    variant: 'warning',
    category: 'duyuru',
    priority: 'normal'
  },
  {
    id: 'campaign',
    name: 'Kampanya Duyurusu',
    title: 'Yeni kampanya başladı',
    message: 'Bu hafta servis işlemlerinde yüzde 10 indirim fırsatı sizi bekliyor.',
    variant: 'success',
    category: 'kampanya',
    priority: 'normal'
  },
  {
    id: 'urgent',
    name: 'Acil Bilgilendirme',
    title: 'Önemli sistem uyarısı',
    message: 'Bazı işlemlerde geçikme yaşanabilir. Ekip sorunu çözmek için çalışıyor.',
    variant: 'danger',
    category: 'duyuru',
    priority: 'kritik'
  }
]

const CATEGORY_LABELS = {
  duyuru: 'Duyuru',
  kampanya: 'Kampanya',
  hatirlatma: 'Hatırlatma'
}

const PRIORITY_LABELS = {
  normal: 'Normal',
  yuksek: 'Yüksek',
  kritik: 'Kritik'
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

function formatTime(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())} • ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

function Notifications() {
  const [users, setUsers] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('compose')
  const [sentHistory, setSentHistory] = useState([])

  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('duyuru')
  const [priority, setPriority] = useState('normal')
  const [sendPush, setSendPush] = useState(true)
  const [sendEmail, setSendEmail] = useState(false)
  const [sendToAll, setSendToAll] = useState(true)
  const [selectedUserIds, setSelectedUserIds] = useState([])

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true)
      try {
        const response = await api.get('/accounts/admin/users/')
        setUsers(Array.isArray(response.data) ? response.data : [])
      } catch {
        toast.error('Kullanıcı listesi yüklenemedi.')
      } finally {
        setIsLoadingUsers(false)
      }
    }
    fetchUsers()
  }, [])

  const activeUsers = useMemo(() => users.filter((user) => user.is_active), [users])
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR')
    if (!query) return activeUsers
    return activeUsers.filter((user) =>
      [user.full_name, user.email, user.phone_number]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(query)
    )
  }, [activeUsers, search])

  const selectedCount = sendToAll ? activeUsers.length : selectedUserIds.length
  const channelScore = Number(sendPush) + Number(sendEmail)
  const isFormValid = title.trim() && message.trim() && selectedCount > 0 && channelScore > 0

  const toggleUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((userId) => userId !== id) : [...prev, id]
    )
  }

  const selectAllFiltered = () => {
    const filteredIds = filteredUsers.map((user) => user.id)
    const everySelected =
      filteredIds.length > 0 && filteredIds.every((id) => selectedUserIds.includes(id))
    if (everySelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !filteredIds.includes(id)))
      return
    }
    setSelectedUserIds((prev) => Array.from(new Set([...prev, ...filteredIds])))
  }

  const applyTemplate = (template) => {
    setTitle(template.title)
    setMessage(template.message)
    setCategory(template.category)
    setPriority(template.priority)
  }

  const resetForm = () => {
    setTitle('')
    setMessage('')
    setCategory('duyuru')
    setPriority('normal')
    setSelectedUserIds([])
    setSendToAll(true)
    setSendPush(true)
    setSendEmail(false)
    setSearch('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting || !isFormValid) return

    if (!window.confirm(`${selectedCount} kişiye bu bildirimi göndermek istediğinize emin misiniz?`)) {
      return
    }

    const payload = {
      title: title.trim(),
      message: message.trim(),
      send_to_all: sendToAll,
      user_ids: sendToAll ? [] : selectedUserIds,
      send_push: sendPush,
      send_email: sendEmail
    }

    setIsSubmitting(true)
    try {
      const response = await api.post('/notifications/admin/notifications/send/', payload)
      const successMessage = response?.data?.detail || 'Bildirim başarıyla gönderildi.'
      toast.success(successMessage)

      setSentHistory((prev) => [
        {
          id: Date.now(),
          title: title.trim(),
          message: message.trim(),
          category,
          priority,
          recipientCount: selectedCount,
          channels: { push: sendPush, email: sendEmail },
          sentToAll: sendToAll,
          sentAt: new Date().toISOString()
        },
        ...prev
      ])

      resetForm()
      setActiveTab('history')
    } catch (error) {
      toast.error(readApiError(error, 'Gönderim sırasında hata oluştu.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-2">
        <div>
          <h3 className="fw-bold m-0 text-light d-flex align-items-center">
            <FaBullhorn className="me-2 text-primary" /> Bildirimler ve Duyurular
          </h3>
          <small className="text-light opacity-75">
            Ekip ve kullanıcı iletişimini tek ekrandan yönetin.
          </small>
        </div>
        <Badge bg="dark" className="border border-secondary fs-6 px-3 py-2">
          <FaUsers className="me-2" /> {activeUsers.length} Aktif Kullanıcı
        </Badge>
      </div>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4 border-0 nav-pills bg-white rounded-3 p-2 shadow-sm"
        style={{ maxWidth: '420px' }}
      >
        <Tab eventKey="compose" title={<span><FaPlus className="me-2" />Yeni Oluştur</span>} />
        <Tab eventKey="history" title={<span><FaHistory className="me-2" />Gönderim Geçmişi{sentHistory.length ? ` (${sentHistory.length})` : ''}</span>} />
      </Tabs>

      {activeTab === 'compose' && (
        <Row className="g-4">
          <Col lg={8}>
            <Card className="border-0 shadow-sm rounded-3 h-100">
              <Card.Header className="bg-white border-bottom p-4">
                <h5 className="fw-bold text-dark m-0">Yeni Bildirim veya Duyuru Oluştur</h5>
                <small className="text-muted">Başlık, mesaj ve gönderim kanallarını seçin.</small>
              </Card.Header>
              <Card.Body className="p-4">
                <Form onSubmit={handleSubmit}>
                  <Row className="g-3 mb-3">
                    <Col md={6}>
                      <Form.Label className="fw-semibold">İçerik Türü</Form.Label>
                      <Form.Select value={category} onChange={(event) => setCategory(event.target.value)}>
                        <option value="duyuru">Duyuru</option>
                        <option value="kampanya">Kampanya</option>
                        <option value="hatirlatma">Hatırlatma</option>
                      </Form.Select>
                    </Col>
                    <Col md={6}>
                      <Form.Label className="fw-semibold">Öncelik</Form.Label>
                      <Form.Select value={priority} onChange={(event) => setPriority(event.target.value)}>
                        <option value="normal">Normal</option>
                        <option value="yuksek">Yüksek</option>
                        <option value="kritik">Kritik</option>
                      </Form.Select>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Başlık</Form.Label>
                    <Form.Control
                      maxLength={120}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Örn: Planlı bakım bilgilendirmesi"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">Mesaj</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      maxLength={500}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Duyuru veya bildiriminizi buraya yazın..."
                      required
                    />
                    <div className="small text-muted text-end mt-1">{message.length}/500 karakter</div>
                  </Form.Group>

                  <div className="p-3 border rounded-3 bg-light mb-4">
                    <div className="fw-semibold text-dark mb-2">Gönderim Kanalları</div>
                    <Row className="g-3">
                      <Col sm={6}>
                        <Form.Check
                          type="switch"
                          id="send-push"
                          className="fw-semibold"
                          checked={sendPush}
                          onChange={(event) => setSendPush(event.target.checked)}
                          label={
                            <span>
                              <FaBell className="me-2 text-warning" />
                              Uygulama Bildirimi (Push)
                            </span>
                          }
                        />
                      </Col>
                      <Col sm={6}>
                        <Form.Check
                          type="switch"
                          id="send-email"
                          className="fw-semibold"
                          checked={sendEmail}
                          onChange={(event) => setSendEmail(event.target.checked)}
                          label={
                            <span>
                              <FaEnvelope className="me-2 text-primary" />
                              E-posta Bildirimi
                            </span>
                          }
                        />
                      </Col>
                    </Row>
                  </div>

                  <div className="d-flex justify-content-end gap-2">
                    <Button type="button" variant="light" onClick={resetForm} disabled={isSubmitting}>
                      <FaTimes className="me-1" /> Temizle
                    </Button>
                    <Button type="submit" variant="primary" className="fw-bold px-4" disabled={!isFormValid || isSubmitting}>
                      {isSubmitting ? (
                        <Spinner size="sm" animation="border" className="me-2" />
                      ) : (
                        <FaPaperPlane className="me-2" />
                      )}
                      Gönder ({selectedCount})
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="border-0 shadow-sm rounded-3 mb-3">
              <Card.Header className="bg-white border-bottom p-3">
                <h6 className="m-0 fw-bold">
                  <FaUsers className="me-2 text-primary" /> Hedef Kitle
                </h6>
              </Card.Header>
              <Card.Body>
                <Form.Check
                  type="switch"
                  id="send-all-users"
                  className="fw-semibold mb-3"
                  checked={sendToAll}
                  onChange={(event) => setSendToAll(event.target.checked)}
                  label={
                    <span>
                      Tüm aktif kullanıcılara gönder
                      <Badge bg="success" className="ms-2">{activeUsers.length}</Badge>
                    </span>
                  }
                />

                {!sendToAll && (
                  <>
                    <InputGroup className="mb-2">
                      <InputGroup.Text>
                        <FaSearch />
                      </InputGroup.Text>
                      <Form.Control
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Kullanıcı ara"
                      />
                    </InputGroup>

                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <small className="text-muted">{filteredUsers.length} kullanıcı</small>
                      <Button variant="link" size="sm" className="p-0 text-decoration-none" onClick={selectAllFiltered}>
                        Listelenenleri seç
                      </Button>
                    </div>

                    <div className="border rounded-3 overflow-auto" style={{ maxHeight: '300px' }}>
                      {isLoadingUsers ? (
                        <div className="p-4 text-center"><Spinner size="sm" /></div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="p-4 text-center text-muted small">Kullanıcı bulunamadı.</div>
                      ) : (
                        <ListGroup variant="flush">
                          {filteredUsers.map((user) => (
                            <ListGroup.Item
                              key={user.id}
                              action
                              onClick={() => toggleUser(user.id)}
                              className="d-flex align-items-center gap-2 py-2"
                            >
                              <Form.Check
                                type="checkbox"
                                checked={selectedUserIds.includes(user.id)}
                                onChange={() => {}}
                                onClick={(event) => event.stopPropagation()}
                              />
                              <div className="flex-grow-1 overflow-hidden">
                                <div className="fw-semibold small text-truncate">
                                  {user.full_name || user.email || 'İsimsiz kullanıcı'}
                                </div>
                                <div className="text-muted text-truncate" style={{ fontSize: '0.72rem' }}>
                                  {user.email || 'E-posta yok'}
                                </div>
                              </div>
                              {user.user_type === 'admin' && <Badge bg="dark" pill>Admin</Badge>}
                              {user.user_type === 'technician' && <Badge bg="info" pill>Teknisyen</Badge>}
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      )}
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm rounded-3 mb-3">
              <Card.Header className="bg-white border-bottom p-3">
                <h6 className="m-0 fw-bold">Hızlı Şablonlar</h6>
              </Card.Header>
              <Card.Body className="d-grid gap-2">
                {ANNOUNCEMENT_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    variant={`outline-${template.variant}`}
                    className="text-start"
                    onClick={() => applyTemplate(template)}
                  >
                    <div className="fw-semibold">{template.name}</div>
                    <div className="small opacity-75">{template.title}</div>
                  </Button>
                ))}
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm rounded-3">
              <Card.Header className="bg-white border-bottom p-3">
                <h6 className="m-0 fw-bold">Canlı Önizleme</h6>
              </Card.Header>
              <Card.Body>
                <Alert
                  variant={priority === 'kritik' ? 'danger' : priority === 'yuksek' ? 'warning' : 'info'}
                  className="mb-2"
                >
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <strong className="text-truncate me-2">{title.trim() || 'Bildirim başlığı'}</strong>
                    <Badge bg="light" text="dark">{CATEGORY_LABELS[category]}</Badge>
                  </div>
                  <div className="small mb-2" style={{ whiteSpace: 'pre-wrap' }}>
                    {message.trim() || 'Mesaj içeriği burada görünecek.'}
                  </div>
                  <div className="d-flex justify-content-between align-items-center small text-muted">
                    <span>Hedef: {sendToAll ? 'Tüm aktif kullanıcılar' : `${selectedUserIds.length} kişi`}</span>
                    <span>
                      {PRIORITY_LABELS[priority]}
                      {sendPush ? <FaBell className="ms-2 text-warning" /> : null}
                      {sendEmail ? <FaEnvelope className="ms-2 text-primary" /> : null}
                    </span>
                  </div>
                </Alert>
                <ProgressBar
                  now={Math.min((message.length / 500) * 100, 100)}
                  label={`${message.length}/500`}
                  variant={message.length > 400 ? 'danger' : message.length > 250 ? 'warning' : 'success'}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {activeTab === 'history' && (
        <Card className="border-0 shadow-sm rounded-3">
          <Card.Header className="bg-white border-bottom p-4 d-flex justify-content-between align-items-center">
            <div>
              <h5 className="fw-bold text-dark m-0">Gönderim Geçmişi</h5>
              <small className="text-muted">Bu oturumda gönderilen bildirimler</small>
            </div>
            {sentHistory.length > 0 ? (
              <Button variant="outline-secondary" size="sm" onClick={() => setSentHistory([])}>
                <FaTimes className="me-1" /> Geçmişi Temizle
              </Button>
            ) : null}
          </Card.Header>
          <Card.Body className="p-0">
            {sentHistory.length === 0 ? (
              <div className="text-center p-5 text-muted">
                <FaHistory size={36} className="mb-3 opacity-50" />
                <div>Henüz bu oturumda gönderim yapılmadı.</div>
                <small>İlk bildiriminizi "Yeni Oluştur" sekmesinden gönderebilirsiniz.</small>
              </div>
            ) : (
              <ListGroup variant="flush">
                {sentHistory.map((entry) => {
                  const variant = entry.priority === 'kritik' ? 'danger' : entry.priority === 'yuksek' ? 'warning' : 'success'
                  return (
                    <ListGroup.Item key={entry.id} className="p-3">
                      <div className="d-flex align-items-start gap-3">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle text-white flex-shrink-0"
                          style={{ width: 40, height: 40, background: 'var(--bs-primary)' }}
                        >
                          <FaCheckCircle />
                        </div>
                        <div className="flex-grow-1 overflow-hidden">
                          <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                            <strong className="text-truncate">{entry.title}</strong>
                            <Badge bg={variant}>{PRIORITY_LABELS[entry.priority]}</Badge>
                            <Badge bg="secondary">{CATEGORY_LABELS[entry.category]}</Badge>
                          </div>
                          <div className="text-muted small mb-2" style={{ whiteSpace: 'pre-wrap' }}>
                            {entry.message}
                          </div>
                          <div className="d-flex flex-wrap gap-3 small text-muted">
                            <span>
                              <FaUsers className="me-1" />
                              {entry.sentToAll ? 'Tüm aktif kullanıcılar' : `${entry.recipientCount} kişi`}
                            </span>
                            {entry.channels.push ? <span><FaBell className="me-1 text-warning" />Push</span> : null}
                            {entry.channels.email ? <span><FaEnvelope className="me-1 text-primary" />E-posta</span> : null}
                            <span>{formatTime(entry.sentAt)}</span>
                          </div>
                        </div>
                      </div>
                    </ListGroup.Item>
                  )
                })}
              </ListGroup>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  )
}

export default Notifications

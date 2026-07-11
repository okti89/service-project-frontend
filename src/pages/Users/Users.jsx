import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Col, Form, InputGroup, Modal, Row, Spinner, Table } from 'react-bootstrap'
import {
  FaCheck,
  FaEdit,
  FaPlus,
  FaSearch,
  FaTimes,
  FaTrash,
  FaUserShield,
  FaUndo,
  FaClock
} from 'react-icons/fa'
import api from '../../api/api'
import toast from 'react-hot-toast'

const defaultFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  password: '',
  user_type: 'technician',
}

function readApiError(error, fallback) {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data.detail === 'string') return data.detail
  if (typeof data.error === 'string') return data.error

  if (typeof data === 'object') {
    const firstEntry = Object.entries(data).find(([, value]) => value)
    if (firstEntry) {
      const [, value] = firstEntry
      if (Array.isArray(value) && value.length > 0) return String(value[0])
      if (typeof value === 'string') return value
    }
  }

  return fallback
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('tr-TR')
}

const userTypeOptions = [
  { value: 'admin', label: 'Yönetici (Admin)' },
  { value: 'technician', label: 'Teknisyen' },
  { value: 'customer', label: 'Müşteri' },
]

const Users = ({ defaultFilter = 'all' }) => {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [filterType, setFilterType] = useState(defaultFilter)
  const [searchTerm, setSearchTerm] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [formData, setFormData] = useState(defaultFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchUsers = async (silent = false) => {
    let ok = true
    if (!silent) setIsLoading(true)
    try {
      const response = await api.get('/accounts/admin/users/?include_inactive=true')
      setUsers(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      ok = false
      toast.error(readApiError(error, 'Kullanıcı listesi yüklenemedi.'))
    } finally {
      if (!silent) setIsLoading(false)
      setIsRefreshing(false)
    }
    return ok
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    setFilterType(defaultFilter || 'all')
  }, [defaultFilter])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const ok = await fetchUsers(true)
    if (ok) {
      toast.success('Kullanıcı listesi yenilendi.')
    }
  }

  const resetForm = () => {
    setFormData(defaultFormData)
  }

  const closeFormModal = () => {
    setShowModal(false)
    setEditingUserId(null)
    setIsSubmitting(false)
    resetForm()
  }

  const openCreateModal = () => {
    setEditingUserId(null)
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (user) => {
    setEditingUserId(user.id)
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone_number: user.phone_number || '',
      password: '',
      user_type: user.user_type || 'technician',
    })
    setShowModal(true)
  }

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhoneChange = (event) => {
    let val = event.target.value

    let digits = val.replace(/\D/g, '')

    if (digits.startsWith('90')) digits = digits.substring(2)
    if (digits.startsWith('0')) digits = digits.substring(1)

    digits = digits.substring(0, 10)

    let formatted = '+90 '
    if (digits.length > 0) formatted += digits.substring(0, 3)
    if (digits.length > 3) formatted += ' ' + digits.substring(3, 6)
    if (digits.length > 6) formatted += ' ' + digits.substring(6, 8)
    if (digits.length > 8) formatted += ' ' + digits.substring(8, 10)

    if (val === '' || val === '+9') formatted = ''

    setFormData((prev) => ({ ...prev, phone_number: formatted }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      if (editingUserId) {
        const payload = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone_number: formData.phone_number || null,
          user_type: formData.user_type,
        }
        await api.patch(`/accounts/admin/users/${editingUserId}/`, payload)
        toast.success('Kullanıcı güncellendi.')
      } else {
        const payload = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone_number: formData.phone_number || null,
          user_type: formData.user_type,
          password: formData.password || '',
        }
        await api.post('/accounts/admin/users/', payload)
        toast.success('Yeni kullanıcı başarıyla eklendi.')
      }
      closeFormModal()
      fetchUsers(true)
    } catch (error) {
      toast.error(readApiError(error, 'Kayıt işlemi başarısız.'))
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kullanıcıyı silmek (pasife almak) istediğinize emin misiniz?')) return
    try {
      await api.delete(`/accounts/admin/users/${id}/`)
      toast.success('Kullanıcı pasife alındı.')
      fetchUsers(true)
    } catch (error) {
      toast.error(readApiError(error, 'Kullanıcı silinemedi.'))
    }
  }

  const handleRestore = async (id) => {
    if (!window.confirm('Bu kullanıcıyı tekrar aktif etmek istediğinize emin misiniz?')) return
    try {
      await api.patch(`/accounts/admin/users/${id}/`, {
        approval_status: 'approved',
        is_active: true,
      })
      toast.success('Kullanıcı tekrar aktif edildi.')
      fetchUsers(true)
    } catch (error) {
      toast.error(readApiError(error, 'Kullanıcı aktif edilemedi.'))
    }
  }

  const handleApprovalAction = async (id, newStatus) => {
    try {
      await api.post('/accounts/admin/users/approval/', { user_id: id, status: newStatus })
      toast.success(`Kullanıcı durumu '${newStatus === 'approved' ? 'Onaylandı' : 'Reddedildi'}' olarak ayarlandı.`)
      fetchUsers(true)
    } catch (error) {
      toast.error(readApiError(error, 'Durum güncellenemedi.'))
    }
  }

  const pendingUsers = useMemo(() => users.filter((u) => u.approval_status === 'pending'), [users])
  const activeAdmins = useMemo(() => users.filter((u) => u.is_active && (u.is_staff || u.user_type === 'admin')), [users])
  const passiveUsers = useMemo(() => users.filter((u) => !u.is_active || u.approval_status === 'rejected'), [users])
  const allActiveUsers = useMemo(() => users.filter((u) => u.is_active && u.approval_status === 'approved'), [users])

  const displayedUsers = useMemo(() => {
    let list
    if (filterType === 'pending') list = pendingUsers
    else if (filterType === 'admins') list = activeAdmins
    else if (filterType === 'passive') list = passiveUsers
    else if (filterType === 'active') list = allActiveUsers
    else list = users

    const term = String(searchTerm || '').trim().toLocaleLowerCase('tr-TR')
    if (term) {
      list = list.filter((user) => {
        const fullName = user.full_name
          || `${user.first_name || ''} ${user.last_name || ''}`.trim()
        const haystack = [
          fullName,
          user.email,
          user.phone_number,
          user.user_type_display || user.user_type,
          user.approval_status_display || user.approval_status,
        ].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR')
        return haystack.includes(term)
      })
    }
    return list
  }, [users, filterType, pendingUsers, activeAdmins, passiveUsers, allActiveUsers, searchTerm])

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <h3 className="fw-bold m-0 text-light">
          <FaUserShield className="me-2 text-primary" /> Sistem Kullanıcıları
        </h3>
        <div className="d-flex gap-2 flex-grow-1 justify-content-md-end align-items-center flex-wrap" style={{ maxWidth: '100%' }}>
          <InputGroup style={{ maxWidth: '320px' }}>
            <InputGroup.Text className="bg-light border-end-0">
              <FaSearch className="text-muted" />
            </InputGroup.Text>
            <Form.Control
              placeholder="İsim, e-posta, telefon veya rol ile ara..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="border-start-0"
            />
            {searchTerm ? (
              <Button variant="light" onClick={() => setSearchTerm('')} title="Aramayı temizle">
                <FaTimes />
              </Button>
            ) : null}
          </InputGroup>
          <Button variant="outline-light" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? <Spinner size="sm" animation="border" className="me-2" /> : null}
            Yenile
          </Button>
          <Button variant="primary" onClick={openCreateModal}>
            <FaPlus className="me-1" /> Kullanıcı Ekle
          </Button>
        </div>
      </div>

      <Row className="g-3 mb-4">
        <Col lg={3} md={6}>
          <Card
            onClick={() => setFilterType('all')}
            className="border-0 shadow-sm rounded-3 h-100 p-3"
            style={{
              borderLeft: '4px solid #2196F3',
              cursor: 'pointer',
              opacity: filterType === 'all' ? 1 : 0.6,
              transform: filterType === 'all' ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.2s',
            }}
          >
            <div className="text-muted fw-bold mb-2" style={{ fontSize: '0.85rem' }}>TOPLAM HESAP</div>
            <h3 className="fw-bold m-0">{users.length}</h3>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card
            onClick={() => setFilterType('pending')}
            className="border-0 shadow-sm rounded-3 h-100 p-3"
            style={{
              borderLeft: '4px solid #FF9800',
              cursor: 'pointer',
              opacity: filterType === 'pending' ? 1 : 0.6,
              transform: filterType === 'pending' ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.2s',
            }}
          >
            <div className="text-muted fw-bold mb-2" style={{ fontSize: '0.85rem' }}>ONAY BEKLEYEN</div>
            <h3 className="fw-bold m-0 text-warning">{pendingUsers.length}</h3>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card
            onClick={() => setFilterType('admins')}
            className="border-0 shadow-sm rounded-3 h-100 p-3"
            style={{
              borderLeft: '4px solid #9C27B0',
              cursor: 'pointer',
              opacity: filterType === 'admins' ? 1 : 0.6,
              transform: filterType === 'admins' ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.2s',
            }}
          >
            <div className="text-muted fw-bold mb-2" style={{ fontSize: '0.85rem' }}>YÖNETİCİLER</div>
            <h3 className="fw-bold m-0" style={{ color: '#9C27B0' }}>{activeAdmins.length}</h3>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card
            onClick={() => setFilterType('passive')}
            className="border-0 shadow-sm rounded-3 h-100 p-3"
            style={{
              borderLeft: '4px solid #6c757d',
              cursor: 'pointer',
              opacity: filterType === 'passive' ? 1 : 0.6,
              transform: filterType === 'passive' ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.2s',
            }}
          >
            <div className="text-muted fw-bold mb-2" style={{ fontSize: '0.85rem' }}>PASİF / RED</div>
            <h3 className="fw-bold m-0 text-secondary">{passiveUsers.length}</h3>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm rounded-3">
        <div className="bg-light p-3 border-bottom d-flex justify-content-between align-items-center rounded-top">
          <div className="fw-semibold text-muted">
            {filterType === 'all' && 'Tüm Kayıtlar'}
            {filterType === 'pending' && 'Sisteme Girmek İçin Onay Bekleyenler'}
            {filterType === 'admins' && 'Yetkili Hesaplar (Adminler)'}
            {filterType === 'passive' && 'Devre Dışı / Reddedilmiş Hesaplar'}
            {filterType === 'active' && 'Aktif Hesaplar'}
          </div>
          <Button variant="outline-secondary" size="sm" onClick={() => setFilterType('all')}>
            Filtreyi Sıfırla
          </Button>
        </div>

        <Card.Body className="p-0">
          {isLoading ? (
            <div className="text-center p-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : displayedUsers.length === 0 ? (
            <div className="text-center p-5 text-muted">
              {searchTerm
                ? `"${searchTerm}" ile eşleşen kullanıcı bulunamadı.`
                : 'Bu filtrede kullanıcı bulunmuyor.'}
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="m-0 align-middle">
                <thead className="bg-light">
                  <tr>
                    <th className="px-3 py-3 text-center" style={{ width: '60px' }}>#</th>
                    <th className="px-4 py-3">Kullanıcı (E-posta)</th>
                    <th className="py-3">Telefon</th>
                    <th className="py-3">Rol</th>
                    <th className="py-3">Onay Durumu</th>
                    <th className="py-3">Katılım</th>
                    <th className="text-end px-4 py-3" style={{ minWidth: '280px' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedUsers.map((user, index) => (
                    <tr key={user.id}>
                      <td className="px-3 text-center text-muted fw-medium" style={{ width: '60px' }}>{index + 1}</td>
                      <td className="px-4">
                        <div className="fw-medium text-dark">{user.full_name || 'İsimsiz'}{user.is_staff ? <Badge bg="dark" className="ms-2">Yetkili</Badge> : null}</div>
                        <small className="text-muted">{user.email}</small>
                      </td>
                      <td>{user.phone_number || '-'}</td>
                      <td>
                        <Badge bg={user.user_type === 'admin' ? 'purple' : user.user_type === 'technician' ? 'info' : 'secondary'} style={{ backgroundColor: user.user_type === 'admin' ? '#9C27B0' : undefined }}>
                          {user.user_type_display || user.user_type}
                        </Badge>
                      </td>
                      <td>
                        {user.approval_status === 'pending' ? (
                          <Badge bg="warning" className="text-dark"><FaClock className="me-1"/> Bekliyor</Badge>
                        ) : user.approval_status === 'approved' ? (
                          <Badge bg="success"><FaCheck className="me-1"/> Onaylı</Badge>
                        ) : (
                          <Badge bg="danger"><FaTimes className="me-1"/> Reddedildi</Badge>
                        )}
                        {!user.is_active && user.approval_status === 'approved' && (
                          <Badge bg="secondary" className="ms-1">Pasif</Badge>
                        )}
                      </td>
                      <td>{formatDateTime(user.date_joined).split(' ')[0]}</td>
                      <td className="text-end px-4">
                        {user.approval_status === 'pending' ? (
                          <div className="d-inline-flex flex-wrap justify-content-end gap-1">
                            <Button variant="success" size="sm" onClick={() => handleApprovalAction(user.id, 'approved')}>Onayla</Button>
                            <Button variant="outline-danger" size="sm" onClick={() => handleApprovalAction(user.id, 'rejected')}>Reddet</Button>
                          </div>
                        ) : (
                          <div className="d-inline-flex flex-wrap justify-content-end gap-1">
                            <Button variant="outline-primary" size="sm" onClick={() => openEditModal(user)}>Düzenle</Button>
                            {user.is_active ? (
                              <Button variant="outline-danger" size="sm" onClick={() => handleDelete(user.id)}>Pasife Al</Button>
                            ) : (
                              <Button variant="outline-success" size="sm" onClick={() => handleRestore(user.id)}>Aktif Et</Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* CREATE / EDIT MODAL */}
      <Modal show={showModal} onHide={closeFormModal} backdrop="static">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editingUserId ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="px-4">
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Ad *</Form.Label>
                  <Form.Control required name="first_name" value={formData.first_name} onChange={handleFieldChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Soyad *</Form.Label>
                  <Form.Control required name="last_name" value={formData.last_name} onChange={handleFieldChange} />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">E-posta (Giriş için) *</Form.Label>
                  <Form.Control required type="email" name="email" value={formData.email} onChange={handleFieldChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Telefon</Form.Label>
                  <Form.Control name="phone_number" value={formData.phone_number} onChange={handlePhoneChange} placeholder="+90 5xx xxx xx xx" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Kullanıcı Rolü</Form.Label>
                  <Form.Select name="user_type" value={formData.user_type} onChange={handleFieldChange}>
                    {userTypeOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              {!editingUserId && (
                <Col md={12}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Geçici Şifre *</Form.Label>
                    <Form.Control type="text" name="password" required value={formData.password} onChange={handleFieldChange} placeholder="En az 8 karakter" minLength={8} />
                    <Form.Text className="text-muted">Giriş yapabilmesi için güvenli bir şifre belirleyin.</Form.Text>
                  </Form.Group>
                </Col>
              )}
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeFormModal} disabled={isSubmitting}>İptal</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner size="sm" animation="border" /> : 'Kaydet'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}

export default Users


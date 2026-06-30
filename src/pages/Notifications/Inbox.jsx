import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Spinner } from 'react-bootstrap'
import { FaBell, FaCheck, FaInbox, FaTrash } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import api from '../../api/api'

function formatShortDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const Inbox = () => {
  const navigate = useNavigate()
  const [myNotifications, setMyNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchInbox = async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const response = await api.get('/notifications/notifications/')
      setMyNotifications(Array.isArray(response.data) ? response.data : [])
    } catch {
      if (!silent) toast.error('Gelen kutusu yüklenemedi.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInbox()
  }, [])

  const unreadCount = useMemo(
    () => myNotifications.filter((item) => !item.is_read).length,
    [myNotifications]
  )

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/notifications/${id}/`)
      setMyNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)))
      return true
    } catch {
      toast.error('Isaretlenemedi.')
      return false
    }
  }

  const handleNotificationClick = async (notification) => {
    if (!notification) return

    if (!notification.is_read) {
      const ok = await markAsRead(notification.id)
      if (!ok) return
    }

    const target = String(notification.related_screen || '').trim()
    if (target) {
      navigate(target)
    }
  }

  const deleteNotification = async (id, event) => {
    event.stopPropagation()
    if (!window.confirm('Bu bildirimi silmek istediginize emin misiniz?')) return

    try {
      await api.delete(`/notifications/notifications/${id}/`)
      setMyNotifications((prev) => prev.filter((item) => item.id !== id))
      toast.success('Bildirim silindi.')
    } catch {
      toast.error('Silinemedi.')
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold m-0 text-light d-flex align-items-center">
          <FaBell className="me-2 text-primary" /> Bana Gelen Bildirimler
          {unreadCount > 0 ? (
            <Badge bg="danger" className="ms-3 rounded-pill fs-6">
              {unreadCount} Yeni
            </Badge>
          ) : null}
        </h3>

        <Button variant="outline-light" onClick={() => fetchInbox()} disabled={isLoading}>
          {isLoading ? <Spinner size="sm" animation="border" /> : 'Yenile'}
        </Button>
      </div>

      <Card className="border-0 shadow-sm rounded-3">
        <Card.Header className="bg-white border-bottom p-3 d-flex align-items-center">
          <FaInbox className="me-2 text-muted" style={{ fontSize: '1.2rem' }} />
          <h5 className="m-0 fw-bold text-dark">Gelen Kutum</h5>
        </Card.Header>

        <Card.Body className="p-4 bg-light">
          {isLoading ? (
            <div className="text-center p-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : myNotifications.length === 0 ? (
            <Card className="border-0 shadow-sm p-5 text-center text-muted">
              Hiç bildiriminiz bulunmuyor.
            </Card>
          ) : (
            <div className="d-flex flex-column gap-3">
              {myNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`border-0 shadow-sm rounded-3 ${!notification.is_read ? 'border-start border-primary border-4' : ''}`}
                  style={{ cursor: 'pointer', transition: 'all 0.2s', opacity: notification.is_read ? 0.7 : 1 }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <Card.Body className="d-flex align-items-start p-3">
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <h6 className="fw-bold m-0 text-dark d-flex align-items-center">
                          {!notification.is_read ? (
                            <span
                              className="bg-primary rounded-circle d-inline-block me-2"
                              style={{ width: '8px', height: '8px' }}
                            />
                          ) : null}
                          {notification.title}
                        </h6>
                        <small className="text-muted">{formatShortDate(notification.created_at)}</small>
                      </div>

                      <p className="text-secondary m-0 mb-2" style={{ fontSize: '0.9rem' }}>
                        {notification.message}
                      </p>

                      {notification.related_screen ? (
                        <Badge bg="info" className="fw-normal">
                          Iliskili: {notification.related_screen}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="ms-3 d-flex flex-column gap-2 align-items-end">
                      <Button
                        variant="light"
                        size="sm"
                        className="text-danger border-0 p-2 rounded-circle"
                        onClick={(event) => deleteNotification(notification.id, event)}
                        title="Sil"
                      >
                        <FaTrash />
                      </Button>

                      {notification.is_read ? (
                        <Badge bg="light" text="dark">
                          <FaCheck className="me-1 text-success" /> Okundu
                        </Badge>
                      ) : null}
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}

export default Inbox

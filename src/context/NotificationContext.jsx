/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import api from '../api/api'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

function toArray(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

function getNotificationId(item, fallbackIndex) {
  if (item?.id !== undefined && item?.id !== null) return String(item.id)
  if (item?.pk !== undefined && item?.pk !== null) return String(item.pk)
  if (item?.uuid) return String(item.uuid)
  if (item?.created_at) return `${item.created_at}-${fallbackIndex}`
  return `notification-${fallbackIndex}`
}

function getNotificationMessage(item) {
  return (
    item?.message ||
    item?.title ||
    item?.description ||
    item?.text ||
    'Yeni bir bildirim var.'
  )
}

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [toasts, setToasts] = useState([])
  const seenIdsRef = useRef(new Set())
  const initializedRef = useRef(false)
  const hideTimersRef = useRef(new Map())

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
    const timer = hideTimersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      hideTimersRef.current.delete(id)
    }
  }, [])

  const showToast = useCallback(
    (id, message) => {
      setToasts((prev) => {
        if (prev.some((toast) => toast.id === id)) return prev
        return [...prev, { id, message }]
      })

      const timer = setTimeout(() => {
        removeToast(id)
      }, 8000)
      hideTimersRef.current.set(id, timer)
    },
    [removeToast]
  )

  const checkNotifications = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      const res = await api.get('/notifications/notifications/')
      const notifications = toArray(res.data)
      const idsInResponse = notifications.map((item, index) => getNotificationId(item, index))

      if (!initializedRef.current) {
        idsInResponse.forEach((id) => seenIdsRef.current.add(id))
        initializedRef.current = true
        return
      }

      notifications.forEach((item, index) => {
        const id = getNotificationId(item, index)
        if (!seenIdsRef.current.has(id)) {
          seenIdsRef.current.add(id)
          showToast(id, getNotificationMessage(item))
        }
      })
    } catch (error) {
      // Bildirim endpoint'i henüz yoksa uygulama kırılmasın.
      if (error?.response?.status === 404) return
      console.error('Bildirim getirilemedi:', error)
    }
  }, [isAuthenticated, showToast])

  useEffect(() => {
    checkNotifications()

    const intervalId = setInterval(() => {
      checkNotifications()
    }, 10 * 60 * 1000)
    const timersRef = hideTimersRef.current

    return () => {
      clearInterval(intervalId)
      timersRef.forEach((timerId) => clearTimeout(timerId))
      timersRef.clear()
    }
  }, [checkNotifications])

  const value = useMemo(
    () => ({
      checkNotifications,
      toasts,
      removeToast,
    }),
    [checkNotifications, removeToast, toasts]
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="notification-container" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            className="notification-toast"
            onClick={() => removeToast(toast.id)}
            title="Kapat"
          >
            {toast.message}
          </button>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotification must be used inside NotificationProvider')
  }
  return ctx
}

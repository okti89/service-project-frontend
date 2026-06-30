/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import api from '../api/api'
import ENDPOINTS from '../api/endpoints'

const AUTH_TOKEN_KEY = 'auth-token'
const LEGACY_AUTH_TOKEN_KEY = 'auth_token'
const AUTH_USER_KEY = 'auth-user'
const TENANT_CODE_KEY = 'tenant-code'
const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized'

const AuthContext = createContext(null)

function readStoredUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(AUTH_USER_KEY)
    return null
  }
}

function readStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(LEGACY_AUTH_TOKEN_KEY)
}

function persistAuth(authToken, userData, tenantCode) {
  const resolvedTenantCode = tenantCode || userData?.tenant_code || ''
  localStorage.setItem(AUTH_TOKEN_KEY, authToken)
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY)
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData))
  if (resolvedTenantCode) {
    localStorage.setItem(TENANT_CODE_KEY, resolvedTenantCode)
  } else {
    localStorage.removeItem(TENANT_CODE_KEY)
  }
  window.dispatchEvent(new CustomEvent('tenant:changed', { detail: { tenantCode: resolvedTenantCode } }))
}

function syncTenantCode(tenantCode) {
  const resolvedTenantCode = String(tenantCode || '').trim()
  if (resolvedTenantCode) {
    localStorage.setItem(TENANT_CODE_KEY, resolvedTenantCode)
  } else {
    localStorage.removeItem(TENANT_CODE_KEY)
  }
  window.dispatchEvent(new CustomEvent('tenant:changed', { detail: { tenantCode: resolvedTenantCode } }))
}

function clearStoredAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
  localStorage.removeItem(TENANT_CODE_KEY)
  window.dispatchEvent(new CustomEvent('tenant:changed', { detail: { tenantCode: '' } }))
}

function readAuthError(error, fallback = 'İşlem başarısız oldu. Lütfen tekrar deneyin.') {
  const data = error?.response?.data
  if (!data) return fallback

  if (typeof data.detail === 'string') return data.detail
  if (typeof data.error === 'string') return data.error

  const firstEntry = Object.entries(data).find(([, value]) => value)
  if (!firstEntry) return fallback

  const [, value] = firstEntry
  if (Array.isArray(value) && value.length > 0) return String(value[0])
  if (typeof value === 'string') return value
  return fallback
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser())
  const [token, setToken] = useState(() => readStoredToken())
  const [isLoading, setIsLoading] = useState(true)
  const skipNextCheck = useRef(false)

  const applyAuthState = useCallback((authToken, userData, tenantCode) => {
    persistAuth(authToken, userData, tenantCode)
    setToken(authToken)
    setUser(userData)
  }, [])

  const clearAuthState = useCallback(() => {
    clearStoredAuth()
    setToken(null)
    setUser(null)
  }, [])

  const checkAuth = useCallback(async () => {
    const storedToken = readStoredToken()
    if (!storedToken) {
      clearAuthState()
      setIsLoading(false)
      return
    }

    if (skipNextCheck.current) {
      skipNextCheck.current = false
      setIsLoading(false)
      return
    }

    try {
      const res = await api.get(ENDPOINTS.AUTH.CHECK_AUTH)
      setUser(res.data)
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.data))
      syncTenantCode(res.data?.tenant_code)
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        clearAuthState()
      }
    } finally {
      setIsLoading(false)
    }
  }, [clearAuthState])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuthState()
      setIsLoading(false)
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [clearAuthState])

  const login = useCallback(async (email, password) => {
    try {
      const res = await api.post(ENDPOINTS.AUTH.ADMIN_LOGIN, {
        email,
        password,
      })

      const { token: authToken, user: userData } = res.data
      applyAuthState(authToken, userData, userData?.tenant_code)
      skipNextCheck.current = true

      return { ok: true, user: userData }
    } catch (error) {
      return { ok: false, message: readAuthError(error, 'Giriş yapılamadı.') }
    }
  }, [applyAuthState])

  const logout = useCallback(async () => {
    try {
      await api.post(ENDPOINTS.AUTH.LOGOUT)
    } catch (error) {
      // 401 (token zaten süresi dolmuş/geçersiz) ve 403 (yetkisiz) durumlarında
      // logout isteği başarısız olsa bile yerel state temizlenmeli.
      // Bu hataların konsola error olarak düşmesini engelliyoruz.
      const status = error?.response?.status
      if (status !== 401 && status !== 403) {
        // Beklenmeyen hata: yine de loglayalım ama yerel temizlik yapılacak.
        // eslint-disable-next-line no-console
        console.warn('Çıkış yaparken beklenmeyen hata:', status, error?.message)
      }
    } finally {
      clearAuthState()
    }
  }, [clearAuthState])

  const requestPasswordReset = useCallback(async (email) => {
    try {
      const res = await api.post(ENDPOINTS.AUTH.PASSWORD_RESET_REQUEST, {
        email,
      })
      return { ok: true, message: res.data?.detail || 'Sıfırlama kodu gönderildi.' }
    } catch (error) {
      return { ok: false, message: readAuthError(error, 'Kod gönderilemedi.') }
    }
  }, [])

  const verifyResetCode = useCallback(async (email, code) => {
    try {
      const res = await api.post(ENDPOINTS.AUTH.PASSWORD_RESET_VERIFY, {
        email,
        code,
      })
      return { ok: true, message: res.data?.detail || 'Kod doğrulandı.' }
    } catch (error) {
      return { ok: false, message: readAuthError(error, 'Kod doğrulanamadı.') }
    }
  }, [])

  const confirmResetPassword = useCallback(async (email, code, newPassword) => {
    try {
      const res = await api.post(ENDPOINTS.AUTH.PASSWORD_RESET_CONFIRM, {
        email,
        code,
        new_password: newPassword,
      })
      return { ok: true, message: res.data?.detail || 'Parola güncellendi.' }
    } catch (error) {
      return { ok: false, message: readAuthError(error, 'Parola güncellenemedi.') }
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user && token),
      login,
      logout,
      checkAuth,
      requestPasswordReset,
      verifyResetCode,
      confirmResetPassword,
    }),
    [
      checkAuth,
      confirmResetPassword,
      isLoading,
      login,
      logout,
      requestPasswordReset,
      token,
      user,
      verifyResetCode,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

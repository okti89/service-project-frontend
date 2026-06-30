/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/api'

const ConfigContext = createContext()
const AUTH_TOKEN_KEY = 'auth-token'
const LEGACY_AUTH_TOKEN_KEY = 'auth_token'

const defaultConfig = {
  id: null,
  tenant: null,
  tenant_code: '',
  name: 'Servis Yönetim Sistemi',
  logo: null,
  panel_url: '',
  address: '',
  phone_number: '',
  email: '',
  website: '',
  start_date: '',
  store_ios_version: '1.0.0',
  store_android_version: '1.0.0',
  force_update: false,
  store_update_url_ios: '',
  store_update_url_android: '',
  max_users: 10,
  active_users_count: 0,
  remaining_users: 0,
}

function normalizeConfig(data) {
  if (!data) return defaultConfig

  return {
    id: data.id || null,
    tenant: data.tenant || null,
    tenant_code: data.tenant_code || '',
    name: data.name || defaultConfig.name,
    logo: data.logo || null,
    panel_url: data.panel_url || '',
    address: data.address || '',
    phone_number: data.phone_number || '',
    email: data.email || '',
    website: data.website || '',
    start_date: data.start_date || '',
    store_ios_version: data.store_ios_version || '1.0.0',
    store_android_version: data.store_android_version || '1.0.0',
    force_update: !!data.force_update,
    store_update_url_ios: data.store_update_url_ios || '',
    store_update_url_android: data.store_update_url_android || '',
    max_users: data.max_users ?? 10,
    active_users_count: data.active_users_count ?? 0,
    remaining_users: data.remaining_users ?? 0,
  }
}

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(defaultConfig)
  const [workingHours, setWorkingHours] = useState([])
  const [holidayExceptions, setHolidayExceptions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const publicRes = await api.get('/config/public/company/')
      const publicConfig = publicRes?.data || null
      if (publicConfig) {
        setConfig(normalizeConfig(publicConfig))
        setWorkingHours(Array.isArray(publicConfig.working_hours) ? publicConfig.working_hours : [])
        setHolidayExceptions(Array.isArray(publicConfig.holiday_exceptions) ? publicConfig.holiday_exceptions : [])
      } else {
        setConfig(defaultConfig)
        setWorkingHours([])
        setHolidayExceptions([])
      }
    } catch (error) {
      console.error('Firma Ayarları Getirilemedi:', error)
      setConfig(defaultConfig)
      setWorkingHours([])
      setHolidayExceptions([])
    }

    const token = localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(LEGACY_AUTH_TOKEN_KEY)
    if (token) {
      try {
        const response = await api.get('/config/company-configs/')
        const first = Array.isArray(response.data) ? response.data[0] : null
        if (first) {
          setConfig(normalizeConfig(first))
          setWorkingHours(Array.isArray(first.working_hours) ? first.working_hours : [])
          setHolidayExceptions(Array.isArray(first.holiday_exceptions) ? first.holiday_exceptions : [])
        }
      } catch (error) {
        // Auth varken bile 401/403 olabilir; public config ile devam edilir.
      }
    }
    setLoading(false)
  }

  const saveConfig = async (payload) => {
    const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData

    if (config?.id) {
      const response = isFormData
        ? await api.patch(`/config/company-configs/${config.id}/`, payload)
        : await api.patch(`/config/company-configs/${config.id}/`, payload)
      setConfig(normalizeConfig(response.data))
      if (Array.isArray(response.data?.working_hours)) {
        setWorkingHours(response.data.working_hours)
      }
      if (Array.isArray(response.data?.holiday_exceptions)) {
        setHolidayExceptions(response.data.holiday_exceptions)
      }
      return response.data
    }

    const response = isFormData
      ? await api.post('/config/company-configs/', payload)
      : await api.post('/config/company-configs/', payload)
    setConfig(normalizeConfig(response.data))
    if (Array.isArray(response.data?.working_hours)) {
      setWorkingHours(response.data.working_hours)
    }
    if (Array.isArray(response.data?.holiday_exceptions)) {
      setHolidayExceptions(response.data.holiday_exceptions)
    }
    return response.data
  }

  const saveWorkingHour = async (id, payload) => {
    const response = await api.patch(`/config/working-hours/${id}/`, payload)
    setWorkingHours((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...response.data } : item))
    )
    return response.data
  }

  const createWorkingHour = async (payload) => {
    const response = await api.post('/config/working-hours/', payload)
    setWorkingHours((prev) => [...prev, response.data])
    return response.data
  }

  const deleteWorkingHour = async (id) => {
    await api.delete(`/config/working-hours/${id}/`)
    setWorkingHours((prev) => prev.filter((item) => item.id !== id))
  }

  const saveHolidayException = async (id, payload) => {
    const response = await api.patch(`/config/holiday-exceptions/${id}/`, payload)
    setHolidayExceptions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...response.data } : item))
    )
    return response.data
  }

  const createHolidayException = async (payload) => {
    const response = await api.post('/config/holiday-exceptions/', payload)
    setHolidayExceptions((prev) => [...prev, response.data])
    return response.data
  }

  const deleteHolidayException = async (id) => {
    await api.delete(`/config/holiday-exceptions/${id}/`)
    setHolidayExceptions((prev) => prev.filter((item) => item.id !== id))
  }

  const refreshWorkingHours = async () => {
    if (!config?.id) return
    const response = await api.get(`/config/working-hours/?company=${config.id}`)
    setWorkingHours(Array.isArray(response.data) ? response.data : [])
  }

  const refreshHolidayExceptions = async () => {
    if (!config?.id) return
    const response = await api.get(`/config/holiday-exceptions/?company=${config.id}`)
    setHolidayExceptions(Array.isArray(response.data) ? response.data : [])
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  useEffect(() => {
    const handleTenantChanged = () => {
      fetchConfig()
    }
    window.addEventListener('tenant:changed', handleTenantChanged)
    return () => window.removeEventListener('tenant:changed', handleTenantChanged)
  }, [])

  return (
    <ConfigContext.Provider
      value={{
        config,
        workingHours,
        holidayExceptions,
        loading,
        refreshConfig: fetchConfig,
        saveConfig,
        saveWorkingHour,
        createWorkingHour,
        deleteWorkingHour,
        saveHolidayException,
        createHolidayException,
        deleteHolidayException,
        refreshWorkingHours,
        refreshHolidayExceptions,
      }}
    >
      {children}
    </ConfigContext.Provider>
  )
}

export const useConfig = () => useContext(ConfigContext)

import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, Form, InputGroup, Modal, Row, Spinner, Table } from 'react-bootstrap'
import {
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaEnvelope,
  FaEdit,
  FaEye,
  FaFilePdf,
  FaFilter,
  FaList,
  FaMobileAlt,
  FaPhoneAlt,
  FaPlus,
  FaSearch,
  FaTools,
  FaTimes,
  FaTrash,
  FaUserCog,
  FaWhatsapp,
  FaWrench,
} from 'react-icons/fa'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'

import api from '../../api/api'
import { SERVICE_STATUS_LIST } from '../../constants/serviceStatuses'
import './Services.css'

const DEFAULT_SERVICE_STATUS_OPTIONS = SERVICE_STATUS_LIST

const SCHEDULE_FILTER_OPTIONS = [
  { value: '', label: 'Tüm Randevular' },
  { value: 'today', label: 'Bugün' },
  { value: 'upcoming', label: 'Yaklaşan' },
  { value: 'overdue', label: 'Geçiken' },
  { value: 'unscheduled', label: 'Randevusuz' },
]

const SERVICE_SORT_OPTIONS = [
  { value: 'schedule_asc', label: 'Randevu saati: erken' },
  { value: 'schedule_desc', label: 'Randevu saati: geç' },
  { value: 'customer_asc', label: 'Müşteri adı: A-Z' },
  { value: 'customer_desc', label: 'Müşteri adı: Z-A' },
  { value: 'technician_asc', label: 'Teknisyen adı: A-Z' },
  { value: 'technician_desc', label: 'Teknisyen adı: Z-A' },
  { value: 'receipt_desc', label: 'Servis no: yeni' },
  { value: 'receipt_asc', label: 'Servis no: eski' },
]

const WEEKDAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

const emptyForm = {
  customer: '',
  customer_full_name: '',
  customer_phone: '',
  customer_address: '',
  fault_description: '',
  device_type: '',
  device_brand: '',
  device_model: '',
  technician: '',
  service_status: 'new',
  scheduled_date: '',
}

const emptyAddFields = {
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  customerNote: '',
  deviceType: '',
  brand: '',
  model: '',
  status: '',
}

const emptyAddLoading = {
  customer: false,
  deviceType: false,
  brand: false,
  model: false,
  status: false,
}

const OPTION_MODAL_META = {
  deviceType: {
    title: 'Cihaz Türü Ekle',
    label: 'Cihaz türü adı',
    field: 'deviceType',
    placeholder: 'Örn. Kombi',
  },
  brand: {
    title: 'Marka Ekle',
    label: 'Marka adı',
    field: 'brand',
    placeholder: 'Örn. Bosch',
  },
  model: {
    title: 'Model Ekle',
    label: 'Model adı',
    field: 'model',
    placeholder: 'Örn. Condens 2500',
  },
  status: {
    title: 'Durum Ekle',
    label: 'Durum adı',
    field: 'status',
    placeholder: 'Örn. Parça Bekleniyor',
  },
}

const emptyDetailOperationForm = {
  product: '',
  name: '',
  description: '',
  quantity: 1,
  unit_price: '',
}

const emptyDetailPaymentForm = {
  amount: '',
  payment_method: '',
  note: '',
}

const emptyDetailPhotoForm = {
  image: null,
  description: '',
}

const emptyDetailSignatureForm = {
  customer_signature: null,
  technician_signature: null,
}

function toList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

function readApiError(error, fallback) {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data.detail === 'string') return data.detail

  const first = Object.entries(data).find(([, value]) => value)
  if (!first) return fallback

  const [, value] = first
  if (Array.isArray(value) && value.length > 0) return String(value[0])
  if (typeof value === 'string') return value
  return fallback
}

function formatIban(value) {
  const raw = String(value || '').replace(/\s+/g, '').toUpperCase()
  if (!raw) return ''
  return raw.replace(/(.{4})/g, '$1 ').trim()
}

function formatPhoneInput(value) {
  const digits = String(value || '').replace(/\D/g, '')
  let normalized = digits

  if (normalized.startsWith('90')) {
    normalized = normalized.slice(2)
  }
  if (normalized.startsWith('0')) {
    normalized = normalized.slice(1)
  }

  normalized = normalized.slice(0, 10)

  if (!normalized) return ''

  const parts = []
  if (normalized.slice(0, 3)) parts.push(normalized.slice(0, 3))
  if (normalized.slice(3, 6)) parts.push(normalized.slice(3, 6))
  if (normalized.slice(6, 8)) parts.push(normalized.slice(6, 8))
  if (normalized.slice(8, 10)) parts.push(normalized.slice(8, 10))
  return '0' + parts.join(' ')
}

function formatDateTime(value) {
  if (!value) return '-'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return '-'
  return dt.toLocaleString('tr-TR')
}

function formatAppointmentDate(value) {
  if (!value) return 'Randevu yok'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return 'Randevu yok'
  return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatAppointmentTime(value) {
  if (!value) return '--:--'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return '--:--'
  return dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

function getInitials(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  const parts = text.split(/\s+/).filter(Boolean)
  if (!parts.length) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase('tr-TR')
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase('tr-TR')
}

function sanitizeFilenamePart(value, fallback = 'servis') {
  const normalized = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized || fallback
}

function getPdfDownloadName(service) {
  const customerName = sanitizeFilenamePart(service?.customer_full_name || 'müşteri', 'müşteri')
  const receiptNumber = sanitizeFilenamePart(service?.receipt_number || service?.id || 'servis', 'servis')
  const scheduledDate = service?.scheduled_date ? toDateKey(service.scheduled_date) : ''
  return [
    'servis_formu',
    customerName,
    receiptNumber,
    scheduledDate,
  ].filter(Boolean).join('_') + '.pdf'
}

function parseDownloadFilename(contentDisposition) {
  const value = String(contentDisposition || '')
  if (!value) return ''

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const basicMatch = value.match(/filename="?([^";]+)"?/i)
  return basicMatch?.[1] || ''
}

function getScheduleTimestamp(service) {
  if (!service?.scheduled_date) return null
  const timestamp = new Date(service.scheduled_date).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

function compareServiceSchedule(a, b, direction = 1) {
  const aTime = getScheduleTimestamp(a)
  const bTime = getScheduleTimestamp(b)
  if (aTime === null && bTime === null) return 0
  if (aTime === null) return 1
  if (bTime === null) return -1
  return (aTime - bTime) * direction
}

function compareServiceReceipt(a, b, direction = 1) {
  const aNumber = Number(a?.receipt_number || 0)
  const bNumber = Number(b?.receipt_number || 0)
  if (aNumber !== bNumber) return (aNumber - bNumber) * direction
  return String(a?.id || '').localeCompare(String(b?.id || ''), 'tr') * direction
}

function compareServiceText(aValue, bValue, direction = 1) {
  const aText = String(aValue || '').trim()
  const bText = String(bValue || '').trim()
  if (!aText && !bText) return 0
  if (!aText) return 1
  if (!bText) return -1
  return aText.localeCompare(bText, 'tr', { sensitivity: 'base' }) * direction
}

function formatMonthTitle(value) {
  return value.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
}

function formatPeriodTitle(value, mode) {
  const dt = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(dt.getTime())) return '-'
  if (mode === 'yearly') return dt.toLocaleDateString('tr-TR', { year: 'numeric' })
  if (mode === 'monthly') return dt.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
  if (mode === 'weekly') {
    const start = new Date(dt)
    const day = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - day)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return `${start.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}`
  }
  return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function toDateKey(value) {
  if (!value) return ''
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return ''
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function toDateInputValue(value) {
  if (!value) return ''
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return ''
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function toDateOnlyInputValue(value) {
  if (!value) return ''
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return ''
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function toTimeOnlyInputValue(value) {
  if (!value) return ''
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return ''
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
  return local.toISOString().slice(11, 16)
}

function toIsoDateTime(value) {
  if (!value) return null
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toISOString()
}

function toIsoDateTimeFromParts(dateValue, timeValue, fallbackValue = null) {
  if (!dateValue) return fallbackValue
  const composed = `${dateValue}T${timeValue || '00:00'}`
  const dt = new Date(composed)
  if (Number.isNaN(dt.getTime())) return fallbackValue
  return dt.toISOString()
}

function toStatusLabel(value) {
  if (!value) return '-'
  return String(value)
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeStatusValue(value) {
  const source = String(value || '').trim().toLowerCase()
  if (!source) return ''

  const mapped = source
    .replace(/\u0131/g, 'i')
    .replace(/\u00e7/g, 'c')
    .replace(/\u011f/g, 'g')
    .replace(/\u00f6/g, 'o')
    .replace(/\u015f/g, 's')
    .replace(/\u00fc/g, 'u')

  return mapped
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30)
}

function mergeStatusOptions(baseOptions, statusValues) {
  const map = new Map((baseOptions || []).map((item) => [item.value, item]))
    ; (statusValues || []).forEach((rawValue) => {
      const value = normalizeStatusValue(rawValue) || String(rawValue || '').trim()
      if (!value || map.has(value)) return
      map.set(value, { value, label: toStatusLabel(value), badge: 'secondary', color: '#6B7280' })
    })
  return Array.from(map.values())
}

function getStatusMeta(statusCode, options = DEFAULT_SERVICE_STATUS_OPTIONS) {
  const option = options.find((item) => item.value === statusCode)
  if (option) {
    return {
      ...option,
      color: option.color || '#6B7280',
    }
  }
  return { label: toStatusLabel(statusCode), badge: 'secondary', color: '#6B7280' }
}

function backendOrigin() {
  const base = api?.defaults?.baseURL || ''
  return base.endsWith('/api') ? base.slice(0, -4) : base
}

function resolveImageUrl(path) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const origin = backendOrigin()
  if (!origin) return path
  if (path.startsWith('/')) return `${origin}${path}`
  return `${origin}/${path}`
}

function getDetailStatusClass(statusCode) {
  const status = String(statusCode || '')
  if (status === 'completed') return 'is-completed'
  if (status === 'in_progress') return 'is-progress'
  if (status === 'postponed') return 'is-assigned'
  if (status === 'assigned') return 'is-assigned'
  if (status === 'cancelled') return 'is-cancelled'
  return 'is-new'
}

function isSameDay(value, reference = new Date()) {
  if (!value) return false
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return false
  return dt.getDate() === reference.getDate()
    && dt.getMonth() === reference.getMonth()
    && dt.getFullYear() === reference.getFullYear()
}

function isOverdueSchedule(service) {
  if (!service?.scheduled_date) return false
  if (['completed', 'cancelled'].includes(service.service_status)) return false
  const dt = new Date(service.scheduled_date)
  return !Number.isNaN(dt.getTime()) && dt < new Date() && !isSameDay(service.scheduled_date)
}

function isUpcomingSchedule(service) {
  if (!service?.scheduled_date) return false
  const dt = new Date(service.scheduled_date)
  return !Number.isNaN(dt.getTime()) && dt > new Date()
}

const Services = ({ renderAsModalOnly = false, initialServiceId = null, onCloseModal = null }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [services, setServices] = useState([])
  const [customers, setCustomers] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [deviceTypes, setDeviceTypes] = useState([])
  const [brands, setBrands] = useState([])
  const [models, setModels] = useState([])
  const [products, setProducts] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [statusOptions, setStatusOptions] = useState(DEFAULT_SERVICE_STATUS_OPTIONS)
  const [operationTemplatesData, setOperationTemplatesData] = useState([])
  const [selectedOperationTemplate, setSelectedOperationTemplate] = useState('')
  const [isSavingOperationTemplate, setIsSavingOperationTemplate] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    default_unit_price: '',
    product: '',
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [summaryFilter, setSummaryFilter] = useState('all')
  const [technicianFilter, setTechnicianFilter] = useState('')
  const [scheduleFilter, setScheduleFilter] = useState('')
  const [sortMode, setSortMode] = useState('schedule_asc')
  const [viewMode, setViewMode] = useState('list')
  const [periodMode, setPeriodMode] = useState('daily')
  const [periodCursor, setPeriodCursor] = useState(() => new Date())
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const [showFormModal, setShowFormModal] = useState(false)
  const [showWarrantyModal, setShowWarrantyModal] = useState(false)
  const [warrantyServiceId, setWarrantyServiceId] = useState(null)
  const [warrantyMonths, setWarrantyMonths] = useState(24)
  const [showCustomerCreateModal, setShowCustomerCreateModal] = useState(false)
  const [showOptionCreateModal, setShowOptionCreateModal] = useState(false)
  const [optionCreateType, setOptionCreateType] = useState('')
  const [editingService, setEditingService] = useState(null)
  const [customerEntryMode, setCustomerEntryMode] = useState('existing')
  const [formData, setFormData] = useState(emptyForm)
  const [addFields, setAddFields] = useState(emptyAddFields)
  const [addLoading, setAddLoading] = useState(emptyAddLoading)

  const [showDetailModal, setShowDetailModal] = useState(false)
  const [autoOpenedServiceId, setAutoOpenedServiceId] = useState('')
  const [detailActiveTab, setDetailActiveTab] = useState('overview')
  const [selectedService, setSelectedService] = useState(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [operationForm, setOperationForm] = useState(emptyDetailOperationForm)
  const [paymentForm, setPaymentForm] = useState(emptyDetailPaymentForm)
  const [editingOperationId, setEditingOperationId] = useState(null)
  const [editingPaymentId, setEditingPaymentId] = useState(null)
  const [isSavingOperation, setIsSavingOperation] = useState(false)
  const [isSavingPayment, setIsSavingPayment] = useState(false)
  const [photoForm, setPhotoForm] = useState(emptyDetailPhotoForm)
  const [signatureForm, setSignatureForm] = useState(emptyDetailSignatureForm)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isUploadingSignature, setIsUploadingSignature] = useState(false)
  const [deletingOperationId, setDeletingOperationId] = useState(null)
  const [deletingPaymentId, setDeletingPaymentId] = useState(null)
  const [deletingPhotoId, setDeletingPhotoId] = useState(null)
  const [deletingSignatureId, setDeletingSignatureId] = useState(null)
  const [inlineEdits, setInlineEdits] = useState({})
  const [inlineSavingId, setInlineSavingId] = useState('')
  const [actionLoadingKey, setActionLoadingKey] = useState('')

  const optionCreateMeta = OPTION_MODAL_META[optionCreateType] || null

  const fetchAll = async (silent = false) => {
    if (silent) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const [serviceRes, customerRes, techRes, typeRes, brandRes, modelRes, productRes, paymentMethodRes, operationTemplateRes] = await Promise.all([
        api.get('/services/admin-services/'),
        api.get('/customers/customer-list/?status=all').catch(() => ({ data: [] })),
        api.get('/technicians/technician-list/?include_inactive=false').catch(() => ({ data: [] })),
        api.get('/services/device-types/').catch(() => ({ data: [] })),
        api.get('/services/brands/').catch(() => ({ data: [] })),
        api.get('/services/models/').catch(() => ({ data: [] })),
        api.get('/products/products/').catch(() => ({ data: [] })),
        api.get('/services/payment-methods/').catch(() => ({ data: [] })),
        api.get('/services/service-operation-templates/').catch(() => ({ data: [] })),
      ])

      const serviceRows = toList(serviceRes.data)
      setServices(serviceRows)
      setInlineEdits((prev) => {
        const next = { ...prev }
        serviceRows.forEach((item) => {
          next[item.id] = {
            service_status: item.service_status || 'new',
            technician: item.technician || '',
            scheduled_date: toDateOnlyInputValue(item.scheduled_date),
            scheduled_time: toTimeOnlyInputValue(item.scheduled_date),
          }
        })
        return next
      })
      setCustomers(toList(customerRes.data))
      setTechnicians(toList(techRes.data).filter((item) => item?.user?.is_active !== false))
      setDeviceTypes(toList(typeRes.data))
      setBrands(toList(brandRes.data))
      setModels(toList(modelRes.data))
      setProducts(toList(productRes.data).filter((item) => item?.is_active !== false))
      setPaymentMethods(toList(paymentMethodRes.data))
      setOperationTemplatesData(toList(operationTemplateRes.data))
      setStatusOptions((prev) => mergeStatusOptions(prev, serviceRows.map((item) => item?.service_status)))
    } catch (error) {
      toast.error(readApiError(error, 'Servis verileri yüklenemedi.'))
    } finally {
      if (silent) setIsRefreshing(false)
      else setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (editingPaymentId) return
    if (paymentForm.payment_method) return
    if (!paymentMethods.length) return
    setPaymentForm((prev) => ({ ...prev, payment_method: paymentMethods[0]?.id || '' }))
  }, [paymentMethods, paymentForm.payment_method, editingPaymentId])

  const handleRefresh = async () => {
    await fetchAll(true)
    toast.success('Servis verileri yenilendi.')
  }

  const modelOptions = useMemo(() => {
    if (!formData.device_brand) return models
    return models.filter((item) => String(item.brand) === String(formData.device_brand))
  }, [formData.device_brand, models])

  const operationProductOptions = useMemo(() => {
    return products
      .filter((item) => item?.is_active !== false)
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'tr'))
  }, [products])

  const operationTemplates = useMemo(() => {
    return operationTemplatesData
      .filter((item) => item?.is_active !== false)
      .map((item) => ({
        id: item.id,
        label: item.name || 'İşlem',
        product: '',
        name: item.name || '',
        description: item.description || '',
        quantity: 1,
        unit_price: item.default_unit_price ?? '',
      }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label), 'tr'))
  }, [operationTemplatesData])

  const paymentSummary = useMemo(() => {
    const total = Number(selectedService?.total_price || 0)
    const paid = Number(selectedService?.total_paid || 0)
    const editingAmount = editingPaymentId
      ? Number((selectedService?.payments || []).find((p) => p.id === editingPaymentId)?.amount || 0)
      : 0
    const remainingForInput = Math.max(0, total - (paid - editingAmount))
    const remaining = Math.max(0, total - paid)

    return { total, paid, remaining, remainingForInput }
  }, [editingPaymentId, selectedService])

  const selectedPaymentMethod = useMemo(() => {
    return paymentMethods.find((method) => String(method.id) === String(paymentForm.payment_method || '')) || null
  }, [paymentMethods, paymentForm.payment_method])

  const baseFilteredServices = useMemo(() => {
    return services.filter((svc) => {
      if (statusFilter && svc.service_status !== statusFilter) return false
      if (technicianFilter && String(svc.technician || '') !== String(technicianFilter)) return false
      if (scheduleFilter === 'today' && !isSameDay(svc.scheduled_date)) return false
      if (scheduleFilter === 'upcoming' && !isUpcomingSchedule(svc)) return false
      if (scheduleFilter === 'overdue' && !isOverdueSchedule(svc)) return false
      if (scheduleFilter === 'unscheduled' && svc.scheduled_date) return false

      if (!searchTerm) return true
      const q = searchTerm.toLowerCase()
      return (
        String(svc.customer_full_name || '').toLowerCase().includes(q)
        || String(svc.customer_phone || '').toLowerCase().includes(q)
        || String(svc.receipt_number || '').toLowerCase().includes(q)
        || String(svc.technician_name || '').toLowerCase().includes(q)
      )
    })
  }, [services, searchTerm, statusFilter, technicianFilter, scheduleFilter])

  const listPeriodServices = useMemo(() => {
    const current = new Date(periodCursor)
    const start = new Date(current)
    const end = new Date(current)
    if (periodMode === 'yearly') {
      start.setMonth(0, 1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(11, 31)
      end.setHours(23, 59, 59, 999)
    } else if (periodMode === 'weekly') {
      const day = (start.getDay() + 6) % 7
      start.setDate(start.getDate() - day)
      start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
    } else if (periodMode === 'monthly') {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1, 0)
      end.setHours(23, 59, 59, 999)
    } else {
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
    }

    return baseFilteredServices.filter((svc) => {
      if (!svc.scheduled_date) return false
      const scheduleDate = new Date(svc.scheduled_date)
      if (Number.isNaN(scheduleDate.getTime())) return false
      return scheduleDate >= start && scheduleDate <= end
    })
  }, [baseFilteredServices, periodCursor, periodMode])

  const totalServices = listPeriodServices.length
  const activeServices = listPeriodServices.filter((svc) => ['new', 'assigned', 'in_progress'].includes(svc.service_status)).length
  const completedServices = listPeriodServices.filter((svc) => svc.service_status === 'completed').length
  const uncompletedServices = totalServices - completedServices
  const todayServices = listPeriodServices.filter((svc) => isSameDay(svc.scheduled_date)).length
  const overdueServices = listPeriodServices.filter((svc) => isOverdueSchedule(svc)).length
  const outstandingReceivables = listPeriodServices.reduce((sum, svc) => {
    const total = Number(svc?.total_price || 0)
    const paid = Number(svc?.total_paid || 0)
    const remaining = Math.max(0, total - paid)
    return sum + remaining
  }, 0)

  const displayedServices = useMemo(() => {
    const filtered = listPeriodServices.filter((svc) => {
      if (summaryFilter === 'active' && !['new', 'assigned', 'in_progress'].includes(svc.service_status)) return false
      if (summaryFilter === 'completed' && svc.service_status !== 'completed') return false
      if (summaryFilter === 'uncompleted' && svc.service_status === 'completed') return false
      if (summaryFilter === 'today' && !isSameDay(svc.scheduled_date)) return false
      if (summaryFilter === 'receivable') {
        const total = Number(svc?.total_price || 0)
        const paid = Number(svc?.total_paid || 0)
        if ((total - paid) <= 0) return false
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sortMode === 'schedule_asc') return compareServiceSchedule(a, b, 1) || compareServiceReceipt(a, b, -1)
      if (sortMode === 'schedule_desc') return compareServiceSchedule(a, b, -1) || compareServiceReceipt(a, b, -1)
      if (sortMode === 'customer_asc') return compareServiceText(a.customer_full_name, b.customer_full_name, 1) || compareServiceReceipt(a, b, -1)
      if (sortMode === 'customer_desc') return compareServiceText(a.customer_full_name, b.customer_full_name, -1) || compareServiceReceipt(a, b, -1)
      if (sortMode === 'technician_asc') return compareServiceText(a.technician_name, b.technician_name, 1) || compareServiceReceipt(a, b, -1)
      if (sortMode === 'technician_desc') return compareServiceText(a.technician_name, b.technician_name, -1) || compareServiceReceipt(a, b, -1)
      if (sortMode === 'receipt_desc') return compareServiceReceipt(a, b, -1)
      return compareServiceReceipt(a, b, 1)
    })
  }, [listPeriodServices, summaryFilter, sortMode])

  const hasActiveFilters = Boolean(searchTerm || statusFilter || technicianFilter || scheduleFilter || summaryFilter !== 'all' || sortMode !== 'schedule_asc')

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const startOffset = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    return Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(year, month, index + 1)
      const key = toDateKey(date)
      return {
        date,
        key,
        gridColumnStart: index === 0 ? startOffset + 1 : undefined,
        isToday: isSameDay(date),
        services: baseFilteredServices
          .filter((svc) => toDateKey(svc.scheduled_date) === key)
          .slice()
          .sort((a, b) => {
            const ta = a.scheduled_date ? new Date(a.scheduled_date).getTime() : Number.MAX_SAFE_INTEGER
            const tb = b.scheduled_date ? new Date(b.scheduled_date).getTime() : Number.MAX_SAFE_INTEGER
            return ta - tb
          }),
      }
    })
  }, [calendarMonth, baseFilteredServices])

  const changeCalendarMonth = (offset) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1))
  }

  const goToCurrentMonth = () => {
    const now = new Date()
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setTechnicianFilter('')
    setScheduleFilter('')
    setSummaryFilter('all')
    setSortMode('schedule_asc')
    setPeriodMode('daily')
    setPeriodCursor(new Date())
  }

  const changePeriodCursor = (offset) => {
    setPeriodCursor((prev) => {
      const next = new Date(prev)
      if (periodMode === 'yearly') next.setFullYear(next.getFullYear() + offset)
      else if (periodMode === 'weekly') next.setDate(next.getDate() + (offset * 7))
      else if (periodMode === 'monthly') next.setMonth(next.getMonth() + offset)
      else next.setDate(next.getDate() + offset)
      return next
    })
  }

  const setPeriodModeAndAlign = (mode) => {
    setPeriodMode(mode)
    setPeriodCursor((prev) => new Date(prev))
  }

  const handleCustomerEntryModeChange = (mode) => {
    setCustomerEntryMode(mode)
    setFormData((prev) => ({
      ...prev,
      customer: '',
      customer_full_name: '',
      customer_phone: '',
      customer_address: '',
    }))
  }

  const handleCustomerSelect = (customerId) => {
    if (!customerId) {
      setFormData((prev) => ({
        ...prev,
        customer: '',
        customer_full_name: '',
        customer_phone: '',
        customer_address: '',
      }))
      return
    }

    const selected = customers.find((item) => String(item.id) === String(customerId))
    if (!selected) return

    setFormData((prev) => ({
      ...prev,
      customer: selected.id,
      customer_full_name: selected.full_name || '',
      customer_phone: formatPhoneInput(selected.phone_number || ''),
      customer_address: selected.address || '',
    }))
  }

  const resetAddStates = () => {
    setAddFields(emptyAddFields)
    setAddLoading(emptyAddLoading)
  }

  const closeOptionCreateModal = () => {
    setShowOptionCreateModal(false)
    setOptionCreateType('')
  }

  const openOptionCreateModal = (type) => {
    setOptionCreateType(type)
    setShowOptionCreateModal(true)
  }

  const closeFormModal = () => {
    setShowFormModal(false)
    setCustomerEntryMode('existing')
    closeOptionCreateModal()
    resetAddStates()
    setShowCustomerCreateModal(false)
  }

  const openCustomerCreateModal = () => {
    setAddFields((prev) => ({
      ...prev,
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      customerNote: '',
    }))
    setShowCustomerCreateModal(true)
  }

  const closeCustomerCreateModal = () => {
    setShowCustomerCreateModal(false)
  }

  const setAddFieldValue = (key, value) => {
    setAddFields((prev) => ({ ...prev, [key]: value }))
  }

  const setAddLoadingValue = (key, value) => {
    setAddLoading((prev) => ({ ...prev, [key]: value }))
  }

  const addCustomerOption = async () => {
    const fullName = String(addFields.customerName || '').trim()
    const phoneNumber = formatPhoneInput(addFields.customerPhone)
    const address = String(addFields.customerAddress || '').trim()
    const notes = String(addFields.customerNote || '').trim()

    if (!fullName) {
      toast.error('Müşteri adi zorunludur.')
      return
    }
    if (!phoneNumber) {
      toast.error('Müşteri telefonu zorunludur.')
      return
    }
    if (!address) {
      toast.error('Müşteri adresi zorunludur.')
      return
    }
    if (!notes) {
      toast.error('Müşteri notu zorunludur.')
      return
    }

    setAddLoadingValue('customer', true)
    try {
      const response = await api.post('/customers/customer-list/', {
        full_name: fullName,
        phone_number: phoneNumber,
        address,
        notes,
      })

      const created = response.data || {}
      setCustomers((prev) => [created, ...prev.filter((item) => item.id !== created.id)])
      setCustomerEntryMode('existing')
      setFormData((prev) => ({
        ...prev,
        customer: created.id || prev.customer,
        customer_full_name: created.full_name || fullName,
        customer_phone: formatPhoneInput(created.phone_number || phoneNumber),
        customer_address: created.address || address || prev.customer_address,
      }))
      setAddFields((prev) => ({
        ...prev,
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        customerNote: '',
      }))
      setShowCustomerCreateModal(false)
      toast.success('Müşteri eklendi.')
    } catch (error) {
      toast.error(readApiError(error, 'Müşteri eklenemedi.'))
    } finally {
      setAddLoadingValue('customer', false)
    }
  }

  const addDeviceTypeOption = async () => {
    const name = String(addFields.deviceType || '').trim()
    if (!name) {
      toast.error('Cihaz turu adi zorunludur.')
      return
    }

    setAddLoadingValue('deviceType', true)
    try {
      const response = await api.post('/services/device-types/', { name })
      setDeviceTypes((prev) => [...prev, response.data])
      setFormData((prev) => ({ ...prev, device_type: response.data?.id || prev.device_type }))
      setAddFieldValue('deviceType', '')
      closeOptionCreateModal()
      toast.success('Cihaz türü eklendi.')
    } catch (error) {
      toast.error(readApiError(error, 'Cihaz türü eklenemedi.'))
    } finally {
      setAddLoadingValue('deviceType', false)
    }
  }

  const addBrandOption = async () => {
    const name = String(addFields.brand || '').trim()
    if (!name) {
      toast.error('Marka adi zorunludur.')
      return
    }

    setAddLoadingValue('brand', true)
    try {
      const response = await api.post('/services/brands/', { name })
      setBrands((prev) => [...prev, response.data])
      setFormData((prev) => ({ ...prev, device_brand: response.data?.id || prev.device_brand, device_model: '' }))
      setAddFieldValue('brand', '')
      closeOptionCreateModal()
      toast.success('Marka eklendi.')
    } catch (error) {
      toast.error(readApiError(error, 'Marka eklenemedi.'))
    } finally {
      setAddLoadingValue('brand', false)
    }
  }

  const addModelOption = async () => {
    const name = String(addFields.model || '').trim()
    if (!formData.device_brand) {
      toast.error('Once marka seçmelisiniz.')
      return
    }
    if (!name) {
      toast.error('Model adi zorunludur.')
      return
    }

    setAddLoadingValue('model', true)
    try {
      const response = await api.post('/services/models/', {
        name,
        brand: formData.device_brand,
      })
      setModels((prev) => [...prev, response.data])
      setFormData((prev) => ({ ...prev, device_model: response.data?.id || prev.device_model }))
      setAddFieldValue('model', '')
      closeOptionCreateModal()
      toast.success('Model eklendi.')
    } catch (error) {
      toast.error(readApiError(error, 'Model eklenemedi.'))
    } finally {
      setAddLoadingValue('model', false)
    }
  }

  const addStatusOption = () => {
    const label = String(addFields.status || '').trim()
    const value = normalizeStatusValue(label)

    if (!label || !value) {
      toast.error('Durum adi zorunludur.')
      return
    }

    const exists = statusOptions.some((item) => item.value === value)
    if (exists) {
      toast.error('Bu durum zaten mevcut.')
      return
    }

    const nextOption = { value, label, badge: 'secondary' }
    setStatusOptions((prev) => [...prev, nextOption])
    setFormData((prev) => ({ ...prev, service_status: value }))
    setAddFieldValue('status', '')
    closeOptionCreateModal()
    toast.success('Durum eklendi.')
  }

  const submitOptionCreateModal = () => {
    if (optionCreateType === 'deviceType') {
      void addDeviceTypeOption()
      return
    }
    if (optionCreateType === 'brand') {
      void addBrandOption()
      return
    }
    if (optionCreateType === 'model') {
      void addModelOption()
      return
    }
    if (optionCreateType === 'status') {
      addStatusOption()
    }
  }

  const openCreateModal = (scheduledDate = null) => {
    const hasScheduledDate = scheduledDate instanceof Date || typeof scheduledDate === 'string' || typeof scheduledDate === 'number'
    setEditingService(null)
    setCustomerEntryMode('existing')
    resetAddStates()
    setFormData({
      ...emptyForm,
      scheduled_date: toDateInputValue(hasScheduledDate ? scheduledDate : new Date().toISOString()),
    })
    setShowFormModal(true)
  }

  const openCreateModalForDate = (date) => {
    const scheduledDate = new Date(date)
    scheduledDate.setHours(9, 0, 0, 0)
    openCreateModal(scheduledDate)
  }

  const handleCalendarDayKeyDown = (event, date) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    openCreateModalForDate(date)
  }

  const openEditModal = (service) => {
    setEditingService(service)
    if (service.customer) setCustomerEntryMode('existing')
    else setCustomerEntryMode('manual')
    resetAddStates()
    setStatusOptions((prev) => mergeStatusOptions(prev, [service?.service_status]))
    setFormData({
      customer: service.customer || '',
      customer_full_name: service.customer_full_name || '',
      customer_phone: formatPhoneInput(service.customer_phone || ''),
      customer_address: service.customer_address || '',
      fault_description: service.fault_description || '',
      device_type: service.device_type || '',
      device_brand: service.device_brand || '',
      device_model: service.device_model || '',
      technician: service.technician || '',
      service_status: service.service_status || 'new',
      scheduled_date: toDateInputValue(service.scheduled_date),
    })
    setShowFormModal(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)

    const payload = {
      customer: formData.customer || null,
      customer_full_name: formData.customer_full_name || null,
      customer_phone: formData.customer_phone || null,
      customer_address: formData.customer_address || null,
      fault_description: formData.fault_description || null,
      device_type: formData.device_type || null,
      device_brand: formData.device_brand || null,
      device_model: formData.device_model || null,
      technician: formData.technician || null,
      service_status: formData.service_status || 'new',
      scheduled_date: toIsoDateTime(formData.scheduled_date),
    }

    try {
      let response = null
      if (editingService?.id) {
        response = await api.patch(`/services/admin-services/${editingService.id}/`, payload)
        toast.success('Servis kaydı güncellendi.')
      } else {
        response = await api.post('/services/admin-services/', payload)
        toast.success('Yeni servis kaydı oluşturuldu.')
      }

      closeFormModal()
      setEditingService(null)
      setFormData(emptyForm)
      await fetchAll(true)
      if (response?.data?.whatsapp_status_url && (response?.data?.status_changed || response?.data?.schedule_changed) && confirmStatusWhatsAppNotification()) {
        openStatusWhatsApp(response.data.whatsapp_status_url)
      }
      if (response?.data?.whatsapp_technician_url && response?.data?.technician_changed && window.confirm('Atanan teknisyene WhatsApp üzerinden bilgi mesajı gönderilsin mi?')) {
        openStatusWhatsApp(response.data.whatsapp_technician_url)
      }
    } catch (error) {
      toast.error(readApiError(error, 'Servis kaydı kaydedilemedi.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const openStatusWhatsApp = (url) => {
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const confirmStatusWhatsAppNotification = () => window.confirm('Müşteriye bilgi mesajı gönderilsin mi?')

  const getInlineEdit = (service) => {
    const existing = inlineEdits[service.id]
    if (existing) return existing
    return {
      service_status: service.service_status || 'new',
      technician: service.technician || '',
      scheduled_date: toDateOnlyInputValue(service.scheduled_date),
      scheduled_time: toTimeOnlyInputValue(service.scheduled_date),
    }
  }

  const updateServiceInList = (nextService) => {
    if (!nextService?.id) return
    setServices((prev) => prev.map((item) => (item.id === nextService.id ? { ...item, ...nextService } : item)))
    setInlineEdits((prev) => ({
      ...prev,
      [nextService.id]: {
        service_status: nextService.service_status || 'new',
        technician: nextService.technician || '',
        scheduled_date: toDateOnlyInputValue(nextService.scheduled_date),
        scheduled_time: toTimeOnlyInputValue(nextService.scheduled_date),
      },
    }))
  }

  const handleInlineSave = async (service, overrideEdit = null, changedKey = '') => {
    if (!service?.id || inlineSavingId) return
    const edit = overrideEdit || getInlineEdit(service)
    const previousTechnician = service.technician || ''
    const previousStatus = service.service_status || 'new'
    const previousSchedule = toIsoDateTimeFromParts(
      toDateOnlyInputValue(service.scheduled_date),
      toTimeOnlyInputValue(service.scheduled_date),
      service.scheduled_date
    )
    let nextScheduledDate = toIsoDateTimeFromParts(edit.scheduled_date, edit.scheduled_time, service.scheduled_date) || null
    if (changedKey === 'service_status' && (edit.service_status || '') === 'postponed' && service.scheduled_date) {
      const baseDate = new Date(service.scheduled_date)
      if (!Number.isNaN(baseDate.getTime())) {
        baseDate.setDate(baseDate.getDate() + 1)
        nextScheduledDate = baseDate.toISOString()
      }
    }

    const payload = {
      service_status: edit.service_status || service.service_status || 'new',
      technician: edit.technician || null,
      scheduled_date: nextScheduledDate,
    }

    setInlineSavingId(service.id)
    try {
      let response = null
      response = await api.patch(`/services/admin-services/${service.id}/`, payload)
      updateServiceInList(response.data)
      if (selectedService?.id === service.id) {
        await fetchServiceDetail(service.id, { silent: true })
      }
      const nextTechnician = response?.data?.technician || ''
      const nextStatus = response?.data?.service_status || payload.service_status
      const nextSchedule = response?.data?.scheduled_date || payload.scheduled_date || null
      if (changedKey === 'technician' && previousTechnician !== nextTechnician) {
        toast.success(nextTechnician ? 'Teknisyen atandı.' : 'Teknisyen ataması kaldırıldı.')
      } else if (changedKey === 'service_status' && previousStatus !== nextStatus) {
        toast.success(nextStatus === 'postponed' ? 'Servis ertelendi, randevu güncellendi.' : 'Servis durumu güncellendi.')
      } else if ((changedKey === 'scheduled_date' || changedKey === 'scheduled_time') && previousSchedule !== nextSchedule) {
        toast.success('Randevu tarihi güncellendi.')
      } else if (!changedKey) {
        toast.success('Servis kaydı güncellendi.')
      }
      const shouldOfferStatusMessage = changedKey === 'service_status' && response?.data?.status_changed && response?.data?.whatsapp_status_url
      const shouldOfferScheduleMessage = (changedKey === 'scheduled_date' || changedKey === 'scheduled_time') && response?.data?.schedule_changed && response?.data?.whatsapp_status_url
      if ((shouldOfferStatusMessage || shouldOfferScheduleMessage) && confirmStatusWhatsAppNotification()) {
        openStatusWhatsApp(response.data.whatsapp_status_url)
      }
      const shouldOfferTechnicianMessage = changedKey === 'technician' && response?.data?.technician_changed && response?.data?.whatsapp_technician_url
      if (shouldOfferTechnicianMessage && window.confirm('Atanan teknisyene WhatsApp üzerinden bilgi mesajı gönderilsin mi?')) {
        openStatusWhatsApp(response.data.whatsapp_technician_url)
      }
    } catch (error) {
      toast.error(readApiError(error, 'Liste Güncellemesi başarısız.'))
    } finally {
      setInlineSavingId('')
    }
  }

  const handleInlineFieldChange = (service, key, value) => {
    const currentEdit = getInlineEdit(service)
    const effectiveStatus = currentEdit.service_status || service.service_status || 'new'
    const isCancelledLocked = effectiveStatus === 'cancelled' && key !== 'service_status'
    if (isCancelledLocked) return

    const nextEdit = {
      ...currentEdit,
      [key]: value,
    }

    setInlineEdits((prev) => ({
      ...prev,
      [service.id]: nextEdit,
    }))

    void handleInlineSave(service, nextEdit, key)
  }

  const downloadServiceFormPdf = async (service) => {
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

  const submitWarrantyPdfDownload = async () => {
    if (!warrantyServiceId) return
    const service = services.find(s => s.id === warrantyServiceId) || (selectedService?.id === warrantyServiceId ? selectedService : null)

    setActionLoadingKey(`warranty-pdf-${warrantyServiceId}`)
    setShowWarrantyModal(false)

    try {
      const response = await api.get(`/services/admin-services/${warrantyServiceId}/warranty-pdf/?months=${warrantyMonths}`, {
        responseType: 'blob',
      })
      const fileUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = parseDownloadFilename(response?.headers?.['content-disposition']) || `Garanti_Belgesi_${service?.receipt_number || warrantyServiceId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(fileUrl)
      toast.success('Garanti belgesi indirildi.')
    } catch (error) {
      console.error(error)
      toast.error('Garanti belgesi oluşturulurken bir hata oluştu.')
    } finally {
      setActionLoadingKey(null)
      setWarrantyServiceId(null)
    }
  }

  const sendServiceFormEmail = async (service) => {
    const requested = window.prompt('Gonderilecek e-posta adresi', '')
    const email = String(requested || '').trim()
    if (!email) {
      toast.error('E-posta adresi gerekli.')
      return
    }

    setActionLoadingKey(`mail-${service.id}`)
    try {
      const response = await api.post(`/services/admin-services/${service.id}/send-form-email/`, { email })
      toast.success(response?.data?.detail || 'Servis formu e-posta ile gonderildi.')
    } catch (error) {
      toast.error(readApiError(error, 'E-posta gonderimi başarısız.'))
    } finally {
      setActionLoadingKey('')
    }
  }

  const sendStatusWhatsApp = async (service) => {
    setActionLoadingKey(`wa-${service.id}`)
    try {
      const edit = getInlineEdit(service)
      const response = await api.post(`/services/admin-services/${service.id}/whatsapp-status-link/`, {
        status: edit.service_status || service.service_status,
      })
      const url = response?.data?.whatsapp_url
      if (!url) {
        toast.error('WhatsApp linki oluşturulamadı.')
        return
      }
      openStatusWhatsApp(url)
      toast.success('WhatsApp penceresi acildi.')
    } catch (error) {
      toast.error(readApiError(error, 'WhatsApp bildirimi gonderilemedi.'))
    } finally {
      setActionLoadingKey('')
    }
  }

  const resetDetailForms = () => {
    setOperationForm(emptyDetailOperationForm)
    setSelectedOperationTemplate('')
    setPaymentForm({
      ...emptyDetailPaymentForm,
      payment_method: paymentMethods[0]?.id || '',
    })
    setPhotoForm(emptyDetailPhotoForm)
    setSignatureForm(emptyDetailSignatureForm)
    setEditingOperationId(null)
    setEditingPaymentId(null)
  }

  const closeDetailModal = () => {
    setShowDetailModal(false)
    if (renderAsModalOnly && onCloseModal) {
      onCloseModal()
    }
    setDetailActiveTab('overview')
    setSelectedService(null)
    setIsDetailLoading(false)
    setIsUploadingPhoto(false)
    setIsUploadingSignature(false)
    setDeletingPhotoId(null)
    setDeletingSignatureId(null)
    resetDetailForms()
  }

  const fetchServiceDetail = async (serviceId, options = {}) => {
    const { silent = false } = options
    if (!silent) {
      setIsDetailLoading(true)
      setSelectedService(null)
    }

    try {
      const response = await api.get(`/services/admin-services/${serviceId}/`)
      setSelectedService(response.data)
      return response.data
    } catch (error) {
      toast.error(readApiError(error, 'Servis detayı alınamadı.'))
      if (!silent) {
        setShowDetailModal(false)
      }
      return null
    } finally {
      if (!silent) {
        setIsDetailLoading(false)
      }
    }
  }

  const openDetailModal = async (serviceId) => {
    setShowDetailModal(true)
    setDetailActiveTab('overview')
    resetDetailForms()
    await fetchServiceDetail(serviceId)
  }

  useEffect(() => {
    if (renderAsModalOnly) {
      if (initialServiceId && initialServiceId !== autoOpenedServiceId) {
        setAutoOpenedServiceId(initialServiceId)
        openDetailModal(initialServiceId)
      }
      return
    }

    const requestedServiceId = searchParams.get('open_service')
    if (!requestedServiceId || autoOpenedServiceId === requestedServiceId) return

    setAutoOpenedServiceId(requestedServiceId)
    openDetailModal(requestedServiceId)

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('open_service')
    setSearchParams(nextParams, { replace: true })
  }, [autoOpenedServiceId, searchParams, setSearchParams, renderAsModalOnly, initialServiceId])

  const refreshSelectedService = async () => {
    if (!selectedService?.id) return
    await fetchServiceDetail(selectedService.id, { silent: true })
  }

  const startEditOperation = (item) => {
    setEditingOperationId(item.id)
    setOperationForm({
      product: item.product || '',
      name: item.name || '',
      description: item.description || '',
      quantity: item.quantity || 1,
      unit_price: item.unit_price ?? '',
    })
  }

  const cancelOperationEdit = () => {
    setEditingOperationId(null)
    setOperationForm(emptyDetailOperationForm)
    setSelectedOperationTemplate('')
  }

  const handleOperationProductChange = (productId) => {
    const selectedProduct = products.find((item) => String(item.id) === String(productId))

    setOperationForm((prev) => ({
      ...prev,
      product: productId,
      name: selectedProduct ? selectedProduct.name : prev.name,
      description: selectedProduct ? (prev.description || selectedProduct.name || '') : prev.description,
      unit_price: selectedProduct ? selectedProduct.price ?? '' : prev.unit_price,
    }))
  }

  const applyOperationTemplate = (templateId) => {
    setSelectedOperationTemplate(templateId)
    if (!templateId) return

    const template = operationTemplates.find((item) => item.id === templateId)
    if (!template) return

    setOperationForm((prev) => ({
      ...prev,
      product: template.product || '',
      name: template.name || '',
      description: template.description || '',
      quantity: Number(template.quantity || 1) || 1,
      unit_price: template.unit_price ?? '',
    }))
  }

  const openTemplateModal = () => {
    setTemplateForm({
      name: operationForm.name || '',
      description: operationForm.description || '',
      default_unit_price: operationForm.unit_price ?? '',
      product: operationForm.product || '',
    })
    setShowTemplateModal(true)
  }

  const closeTemplateModal = () => {
    if (isSavingOperationTemplate) return
    setShowTemplateModal(false)
  }

  const submitTemplateModal = async (event) => {
    event.preventDefault()
    const name = String(templateForm.name || '').trim()
    const description = String(templateForm.description || '').trim()
    const priceRaw = String(templateForm.default_unit_price ?? '').trim()

    if (!name && !description) {
      toast.error('Şablon için işlem adı veya açıklama gerekli.')
      return
    }

    const price = priceRaw === '' ? 0 : Number(priceRaw)
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Ücret geçersiz.')
      return
    }

    setIsSavingOperationTemplate(true)
    try {
      const payload = {
        name: name || description.slice(0, 80),
        description,
        default_unit_price: price,
        is_active: true,
      }
      const response = await api.post('/services/service-operation-templates/', payload)
      const created = response.data
      setOperationTemplatesData((prev) => {
        const exists = prev.some((item) => item.id === created.id)
        if (exists) return prev
        return [created, ...prev]
      })
      setSelectedOperationTemplate(created.id)
      toast.success('İşlem şablonu kaydedildi.')
      setShowTemplateModal(false)
    } catch (error) {
      toast.error(readApiError(error, 'İşlem şablonu kaydedilemedi.'))
    } finally {
      setIsSavingOperationTemplate(false)
    }
  }

  const saveCurrentOperationAsTemplate = openTemplateModal

  const handleOperationSubmit = async (event) => {
    event.preventDefault()
    if (!selectedService?.id || isSavingOperation) return

    const quantity = Math.max(1, Number(operationForm.quantity || 1))
    const unitPriceRaw = String(operationForm.unit_price ?? '').trim()
    const unitPrice = unitPriceRaw === '' ? null : Number(unitPriceRaw)
    const productId = operationForm.product || null
    const name = String(operationForm.name || '').trim()
    const description = String(operationForm.description || '').trim()

    if (!productId && !name && !description) {
      toast.error('Parça seçin veya işlem adi/açıklama girin.')
      return
    }

    const payload = {
      service: selectedService.id,
      product: productId,
      name: name || null,
      description,
      quantity,
      unit_price: unitPrice === null ? null : (Number.isFinite(unitPrice) ? unitPrice : 0),
    }

    setIsSavingOperation(true)
    try {
      if (editingOperationId) {
        await api.patch('/services/service-operations/', { pk: editingOperationId, ...payload })
        toast.success('İşlem güncellendi.')
      } else {
        await api.post('/services/service-operations/', payload)
        toast.success('İşlem eklendi.')
      }
      cancelOperationEdit()
      await Promise.all([refreshSelectedService(), fetchAll(true)])
    } catch (error) {
      toast.error(readApiError(error, 'İşlem kaydedilemedi.'))
    } finally {
      setIsSavingOperation(false)
    }
  }

  const handleDeleteOperation = async (operationId) => {
    if (!operationId) return
    if (!window.confirm('Bu işlemi silmek istediğinize emin misiniz?')) return

    setDeletingOperationId(operationId)
    try {
      await api.delete('/services/service-operations/', { data: { pk: operationId } })
      toast.success('İşlem silindi.')
      if (editingOperationId === operationId) {
        cancelOperationEdit()
      }
      await Promise.all([refreshSelectedService(), fetchAll(true)])
    } catch (error) {
      toast.error(readApiError(error, 'İşlem silinemedi.'))
    } finally {
      setDeletingOperationId(null)
    }
  }

  const startEditPayment = (payment) => {
    setEditingPaymentId(payment.id)
    setPaymentForm({
      amount: payment.amount ? String(payment.amount).replace('.', ',') : '',
      payment_method: payment.payment_method || '',
      note: payment.note || '',
    })
  }

  const cancelPaymentEdit = () => {
    setEditingPaymentId(null)
    setPaymentForm({
      ...emptyDetailPaymentForm,
      payment_method: paymentMethods[0]?.id || '',
    })
  }

  const handlePaymentSubmit = async (event) => {
    event.preventDefault()
    if (!selectedService?.id || isSavingPayment) return

    const amount = Number(String(paymentForm.amount).replace(',', '.') || 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Geçerli bir ödeme tutarı girin.')
      return
    }

    const payload = {
      service: selectedService.id,
      amount,
      payment_method: paymentForm.payment_method || null,
      note: String(paymentForm.note || '').trim() || null,
    }

    setIsSavingPayment(true)
    try {
      if (editingPaymentId) {
        await api.patch('/services/service-payments/', { pk: editingPaymentId, ...payload })
        toast.success('Ödeme güncellendi.')
      } else {
        await api.post('/services/service-payments/', payload)
        toast.success('Ödeme eklendi.')
      }
      cancelPaymentEdit()
      await Promise.all([refreshSelectedService(), fetchAll(true)])
    } catch (error) {
      toast.error(readApiError(error, 'Ödeme kaydedilemedi.'))
    } finally {
      setIsSavingPayment(false)
    }
  }

  const handleDeletePayment = async (paymentId) => {
    if (!paymentId) return
    if (!window.confirm('Bu ödemeyi silmek istediğinize emin misiniz?')) return

    setDeletingPaymentId(paymentId)
    try {
      await api.delete('/services/service-payments/', { data: { pk: paymentId } })
      toast.success('Ödeme silindi.')
      if (editingPaymentId === paymentId) {
        cancelPaymentEdit()
      }
      await Promise.all([refreshSelectedService(), fetchAll(true)])
    } catch (error) {
      toast.error(readApiError(error, 'Ödeme silinemedi.'))
    } finally {
      setDeletingPaymentId(null)
    }
  }

  const handlePhotoSubmit = async (event) => {
    event.preventDefault()
    if (!selectedService?.id || isUploadingPhoto) return
    if (!photoForm.image) {
      toast.error('Lutfen bir fotograf seçin.')
      return
    }

    const formData = new FormData()
    formData.append('service', selectedService.id)
    formData.append('image', photoForm.image)
    if (photoForm.description) {
      formData.append('description', photoForm.description)
    }

    setIsUploadingPhoto(true)
    try {
      await api.post('/services/service-photos/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPhotoForm(emptyDetailPhotoForm)
      toast.success('Fotoğraf yüklendi.')
      await Promise.all([refreshSelectedService(), fetchAll(true)])
    } catch (error) {
      toast.error(readApiError(error, 'Fotoğraf yüklenemedi.'))
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleDeletePhoto = async (photoId) => {
    if (!photoId) return
    if (!window.confirm('Bu fotoğrafı silmek istediğinize emin misiniz?')) return

    setDeletingPhotoId(photoId)
    try {
      await api.delete('/services/service-photos/', { data: { pk: photoId } })
      toast.success('Fotoğraf silindi.')
      await Promise.all([refreshSelectedService(), fetchAll(true)])
    } catch (error) {
      toast.error(readApiError(error, 'Fotoğraf silinemedi.'))
    } finally {
      setDeletingPhotoId(null)
    }
  }

  const handleSignatureSubmit = async (event) => {
    event.preventDefault()
    if (!selectedService?.id || isUploadingSignature) return
    if (!signatureForm.customer_signature && !signatureForm.technician_signature) {
      toast.error('En az bir imza dosyasi seçin.')
      return
    }

    const formData = new FormData()
    formData.append('service', selectedService.id)
    if (signatureForm.customer_signature) {
      formData.append('customer_signature', signatureForm.customer_signature)
    }
    if (signatureForm.technician_signature) {
      formData.append('technician_signature', signatureForm.technician_signature)
    }

    setIsUploadingSignature(true)
    try {
      await api.post('/services/service-signatures/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSignatureForm(emptyDetailSignatureForm)
      toast.success('İmza kaydı eklendi.')
      await Promise.all([refreshSelectedService(), fetchAll(true)])
    } catch (error) {
      toast.error(readApiError(error, 'İmza kaydı eklenemedi.'))
    } finally {
      setIsUploadingSignature(false)
    }
  }

  const handleDeleteSignature = async (signatureId) => {
    if (!signatureId) return
    if (!window.confirm('Bu imza kaydını silmek istediğinize emin misiniz?')) return

    setDeletingSignatureId(signatureId)
    try {
      await api.delete('/services/service-signatures/', { data: { pk: signatureId } })
      toast.success('İmza kaydı silindi.')
      await Promise.all([refreshSelectedService(), fetchAll(true)])
    } catch (error) {
      toast.error(readApiError(error, 'İmza kaydı silinemedi.'))
    } finally {
      setDeletingSignatureId(null)
    }
  }

  return (
    <div className={renderAsModalOnly ? "" : "services-page"}>
      {!renderAsModalOnly && (
        <>
          <div className="services-page-header">
            <div>
              <h3 className="fw-bold m-0 text-light d-flex align-items-center">
                <FaWrench className="me-2 text-warning" /> Servis Yönetimi
              </h3>
              <div className="services-page-subtitle">Servis kayıtları, randevular ve işlem akışı</div>
            </div>

            <div className="d-flex flex-wrap gap-2">
              <Button variant="outline-light" onClick={handleRefresh} disabled={isRefreshing}>
                {isRefreshing ? <Spinner size="sm" animation="border" className="me-2" /> : null}
                Yenile
              </Button>
              <Button variant="primary" onClick={openCreateModal}>
                <FaPlus className="me-2" />
                Yeni Servis
              </Button>
            </div>
          </div>

          <div className="service-summary-row mb-4">
            <div
              className={`service-summary-card is-total ${summaryFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => viewMode === 'list' && setSummaryFilter('all')}
              role="button"
            >
              <div className="d-flex justify-content-between align-items-start">
                <small>Toplam Servis</small>
              </div>
              <h4 className="m-0 fw-bold mt-2">{totalServices}</h4>
              <div className="mt-2 pt-2 service-summary-footer">
                <span>Listelenen:</span>
                <strong>{displayedServices.length}</strong>
              </div>
            </div>
            <div
              className={`service-summary-card is-active-work ${summaryFilter === 'active' ? 'is-active' : ''}`}
              onClick={() => viewMode === 'list' && setSummaryFilter('active')}
              role="button"
            >
              <div className="d-flex justify-content-between align-items-start">
                <small>Aktif</small>
              </div>
              <h4 className="m-0 fw-bold mt-2">{activeServices}</h4>
              <div className="mt-2 pt-2 service-summary-footer">
                <span>Durum:</span>
                <strong>Yeni · Atandı · İşlemde</strong>
              </div>
            </div>
            <div
              className={`service-summary-card is-completed ${summaryFilter === 'completed' ? 'is-active' : ''}`}
              onClick={() => viewMode === 'list' && setSummaryFilter('completed')}
              role="button"
            >
              <div className="d-flex justify-content-between align-items-start">
                <small>Tamamlanan</small>
              </div>
              <h4 className="m-0 fw-bold mt-2">{completedServices}</h4>
              <div className="mt-2 pt-2 service-summary-footer">
                <span>Kategori:</span>
                <strong>Kapanan Servis</strong>
              </div>
            </div>
            <div
              className={`service-summary-card is-uncompleted ${summaryFilter === 'uncompleted' ? 'is-active' : ''}`}
              onClick={() => viewMode === 'list' && setSummaryFilter('uncompleted')}
              role="button"
            >
              <div className="d-flex justify-content-between align-items-start">
                <small>Tamamlanmayan</small>
              </div>
              <h4 className="m-0 fw-bold mt-2">{uncompletedServices}</h4>
              <div className="mt-2 pt-2 service-summary-footer">
                <span>Durum:</span>
                <strong>Açık Kalan</strong>
              </div>
            </div>
            <div
              className={`service-summary-card is-today ${summaryFilter === 'today' ? 'is-active' : ''}`}
              onClick={() => viewMode === 'list' && setSummaryFilter('today')}
              role="button"
            >
              <div className="d-flex justify-content-between align-items-start">
                <small>Bugün Randevu</small>
              </div>
              <h4 className="m-0 fw-bold mt-2">{todayServices}</h4>
              <div className="mt-2 pt-2 service-summary-footer">
                <span>Geçiken:</span>
                <strong>{overdueServices} kayıt</strong>
              </div>
            </div>
            <div
              className={`service-summary-card is-receivable ${summaryFilter === 'receivable' ? 'is-active' : ''}`}
              onClick={() => viewMode === 'list' && setSummaryFilter('receivable')}
              role="button"
            >
              <div className="d-flex justify-content-between align-items-start">
                <small>Tahsil Edilmemiş</small>
              </div>
              <h4 className="m-0 fw-bold mt-2">
                ₺{outstandingReceivables.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
              <div className="mt-2 pt-2 service-summary-footer">
                <span>Tutar:</span>
                <strong>Alacak Bakiyesi</strong>
              </div>
            </div>
          </div>

          <Card className="service-filter-panel mb-4">
            <Card.Body>
              <Row className="g-3 align-items-end">
                <Col xl={3} lg={4} md={6}>
                  <Form.Label className="fw-semibold"><FaSearch className="me-2 text-primary" />Liste Ara</Form.Label>
                  <div className="position-relative">
                    <FaSearch className="position-absolute top-50 translate-middle-y text-muted" style={{ left: '10px' }} />
                    <Form.Control
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Müşteri, fiş no, telefon"
                      style={{ paddingLeft: '32px' }}
                    />
                  </div>
                </Col>
                <Col xl={2} lg={4} md={6}>
                  <Form.Label className="fw-semibold"><FaFilter className="me-2 text-primary" />Durum</Form.Label>
                  <Form.Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="">Tüm Durumlar</option>
                    {statusOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col xl={2} lg={4} md={6}>
                  <Form.Label className="fw-semibold">Teknisyen</Form.Label>
                  <Form.Select value={technicianFilter} onChange={(event) => setTechnicianFilter(event.target.value)}>
                    <option value="">Tüm Teknisyenler</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.user?.full_name || `${tech.user?.first_name || ''} ${tech.user?.last_name || ''}`.trim() || tech.user?.email}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col xl={2} lg={4} md={6}>
                  <Form.Label className="fw-semibold">Randevu</Form.Label>
                  <Form.Select value={scheduleFilter} onChange={(event) => setScheduleFilter(event.target.value)}>
                    {SCHEDULE_FILTER_OPTIONS.map((item) => (
                      <option key={item.value || 'all'} value={item.value}>{item.label}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col xl={2} lg={4} md={6}>
                  <Form.Label className="fw-semibold">Sıralama</Form.Label>
                  <Form.Select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                    {SERVICE_SORT_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col xl={1} lg={4} md={6}>
                  <Form.Label className="fw-semibold d-block">&nbsp;</Form.Label>
                  <Button
                    variant="outline-secondary"
                    className="service-filter-clear-btn"
                    onClick={resetFilters}
                    disabled={!hasActiveFilters}
                    title="Filtreleri temizle"
                    aria-label="Filtreleri temizle"
                  >
                    <FaTimes />
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <div className="service-view-toolbar">
            <div className="btn-group" role="group" aria-label="Servis görünümü">
              <Button
                variant={viewMode === 'list' ? 'primary' : 'outline-light'}
                onClick={() => setViewMode('list')}
              >
                <FaList className="me-2" />
                Liste
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'primary' : 'outline-light'}
                onClick={() => setViewMode('calendar')}
              >
                <FaCalendarAlt className="me-2" />
                Takvim
              </Button>
            </div>

            {viewMode === 'list' ? (
              <div className="service-calendar-actions">
                <div className="btn-group" role="group" aria-label="Periyot">
                  <Button variant={periodMode === 'daily' ? 'primary' : 'outline-light'} size="sm" onClick={() => setPeriodModeAndAlign('daily')}>Günlük</Button>
                  <Button variant={periodMode === 'weekly' ? 'primary' : 'outline-light'} size="sm" onClick={() => setPeriodModeAndAlign('weekly')}>Haftalık</Button>
                  <Button variant={periodMode === 'monthly' ? 'primary' : 'outline-light'} size="sm" onClick={() => setPeriodModeAndAlign('monthly')}>Aylık</Button>
                  <Button variant={periodMode === 'yearly' ? 'primary' : 'outline-light'} size="sm" onClick={() => setPeriodModeAndAlign('yearly')}>Yıllık</Button>
                </div>
                <Button variant="outline-light" size="sm" onClick={() => changePeriodCursor(-1)} title="Önceki dönem">
                  <FaChevronLeft />
                </Button>
                <div className="service-calendar-title">{formatPeriodTitle(periodCursor, periodMode)}</div>
                <Button variant="outline-light" size="sm" onClick={() => changePeriodCursor(1)} title="Sonraki dönem">
                  <FaChevronRight />
                </Button>
              </div>
            ) : null}

            {viewMode === 'calendar' ? (
              <div className="service-calendar-actions">
                <Button variant="outline-light" size="sm" onClick={() => changeCalendarMonth(-1)} title="Önceki ay">
                  <FaChevronLeft />
                </Button>
                <div className="service-calendar-title">{formatMonthTitle(calendarMonth)}</div>
                <Button variant="outline-light" size="sm" onClick={() => changeCalendarMonth(1)} title="Sonraki ay">
                  <FaChevronRight />
                </Button>
                <Button variant="light" size="sm" onClick={goToCurrentMonth}>
                  Bugün
                </Button>
              </div>
            ) : null}
          </div>

          {viewMode === 'calendar' ? (
            <Card className="service-calendar-card">
              <Card.Body>
                <div className="service-calendar-weekdays">
                  {WEEKDAY_LABELS.map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>
                <div className="service-calendar-grid">
                  {calendarDays.map((day) => (
                    <div
                      key={day.key}
                      className={`service-calendar-day ${day.isToday ? 'is-today' : ''}`}
                      style={{ gridColumnStart: day.gridColumnStart }}
                      role="button"
                      tabIndex={0}
                      onClick={() => openCreateModalForDate(day.date)}
                      onKeyDown={(event) => handleCalendarDayKeyDown(event, day.date)}
                      title={`${day.date.toLocaleDateString('tr-TR')} için servis ekle`}
                    >
                      <div className="service-calendar-day-number">{day.date.getDate()}</div>
                      <div className="service-calendar-events">
                        {day.services.map((svc) => {
                          const statusMeta = getStatusMeta(svc.service_status, statusOptions)
                          const eventColor = svc.status_color || statusMeta.color || '#64748b'
                          const timeLabel = svc.scheduled_date
                            ? new Date(svc.scheduled_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                            : '--:--'
                          return (
                            <button
                              key={svc.id}
                              type="button"
                              className={`service-calendar-event is-${statusMeta.badge}`}
                              style={{ '--event-accent': eventColor }}
                              onClick={(event) => {
                                event.stopPropagation()
                                openDetailModal(svc.id)
                              }}
                              title={`${svc.customer_full_name || 'Servis'} - ${formatDateTime(svc.scheduled_date)} - ${svc.technician_name || 'Teknisyen yok'} - ${statusMeta.label}`}
                            >
                              <span className="event-time">
                                <FaClock size={10} /> {timeLabel}
                              </span>
                              <span className="event-customer">{svc.customer_full_name || 'Servis'}</span>
                              <span className="event-meta">
                                {svc.technician_name ? `${svc.technician_name} · ` : ''}{statusMeta.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          ) : (
            <Card className="service-list-card">
              <Card.Body className="p-0">
                {isLoading ? (
                  <div className="service-list-loading">
                    <Spinner animation="border" role="status" variant="primary" size="lg">
                      <span className="visually-hidden">Yükleniyor...</span>
                    </Spinner>
                    <div className="service-list-loading-text">Servisler yükleniyor...</div>
                  </div>
                ) : displayedServices.length === 0 ? (
                  <div className="service-list-empty">
                    <div className="service-list-empty-icon">
                      <FaWrench size={28} />
                    </div>
                    <div className="service-list-empty-title">
                      {hasActiveFilters ? 'Eşleşen servis kaydı bulunamadı' : 'Henüz servis kaydı yok'}
                    </div>
                    <div className="service-list-empty-text">
                      {hasActiveFilters
                        ? 'Filtreleri değiştirin ya da temizleyerek tüm servisleri listeleyin.'
                        : 'Yeni bir servis kaydı oluşturarak başlayabilirsiniz.'}
                    </div>
                    {hasActiveFilters ? (
                      <Button variant="outline-secondary" size="sm" onClick={resetFilters}>
                        <FaTimes className="me-1" /> Filtreleri Temizle
                      </Button>
                    ) : (
                      <Button variant="primary" size="sm" onClick={openCreateModal}>
                        <FaPlus className="me-1" /> Yeni Servis Oluştur
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="service-list-table-wrap">
                    <Table hover className="m-0 align-middle">
                      <thead className="bg-light">
                        <tr>
                          <th className="px-3 py-3 service-col-sequence">Sıra</th>
                          <th className="py-3 service-col-appointment">Randevu Tarihi / Saati</th>
                          <th className="py-3">Müşteri ve Cihaz</th>
                          <th className="py-3 service-col-tech">Teknisyen</th>
                          <th className="py-3">Durum</th>
                          <th className="text-end px-3 py-3">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedServices.map((svc, index) => {
                          const effectiveStatus = (!svc.technician && svc.service_status === 'assigned') ? 'new' : svc.service_status
                          const statusMeta = getStatusMeta(effectiveStatus, statusOptions)
                          const resolvedStatusColor = svc.status_color || statusMeta.color
                          const rowEdit = getInlineEdit(svc)
                          const isCancelledLocked = (rowEdit.service_status || effectiveStatus || 'new') === 'cancelled'
                          const appointmentTime = formatAppointmentTime(svc.scheduled_date)
                          const appointmentDate = formatAppointmentDate(svc.scheduled_date)
                          const isUnscheduled = !svc.scheduled_date
                          const isOverdue = isOverdueSchedule(svc)
                          const isToday = !isUnscheduled && isSameDay(svc.scheduled_date)
                          const isSoon = !isUnscheduled && !isOverdue && !isToday && isUpcomingSchedule(svc)
                          const technicianLabel = svc.technician_name || 'Atanmadı'
                          const appointmentCls = [
                            'service-row-appointment',
                            isUnscheduled && 'is-unscheduled',
                            isOverdue && 'is-overdue',
                            isToday && 'is-today',
                            isSoon && 'is-soon',
                          ].filter(Boolean).join(' ')
                          return (
                            <tr key={svc.id} className={`service-list-row is-status-${effectiveStatus}`} style={{ '--service-status-color': resolvedStatusColor }}>
                              <td className="px-3">
                                <div className="service-row-sequence">
                                  <span>{String(index + 1).padStart(2, '0')}</span>
                                </div>
                              </td>
                              <td>
                                <div className={appointmentCls}>
                                  <div className="service-row-appointment-meta" title={appointmentDate}>
                                    <span className="service-row-appointment-date">{appointmentDate}</span>
                                    <span className="service-row-appointment-time">
                                      <FaClock className="service-row-appointment-icon" />
                                      {appointmentTime}
                                    </span>
                                  </div>
                                  <div className="service-row-schedule-inputs">
                                    <Form.Control
                                      size="sm"
                                      type="date"
                                      value={rowEdit.scheduled_date || ''}
                                      disabled={isCancelledLocked}
                                      aria-label="Randevu tarihi"
                                      title={appointmentDate}
                                      onChange={(event) => handleInlineFieldChange(svc, 'scheduled_date', event.target.value)}
                                    />
                                    <Form.Control
                                      size="sm"
                                      type="time"
                                      value={rowEdit.scheduled_time || ''}
                                      disabled={isCancelledLocked}
                                      aria-label="Randevu saati"
                                      onChange={(event) => handleInlineFieldChange(svc, 'scheduled_time', event.target.value)}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="service-row-main">
                                  <div className="service-row-customer">
                                    <span className="service-row-customer-name">{svc.customer_full_name || '-'}</span>
                                    {svc.customer_phone ? (
                                      <span className="service-row-phone">
                                        <FaPhoneAlt size={10} className="service-row-phone-icon" />
                                        {formatPhoneInput(svc.customer_phone)}
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="service-row-device">
                                    <FaMobileAlt size={12} className="service-row-device-icon" />
                                    <span>{[svc.device_type_name, svc.device_brand_name, svc.device_model_name].filter(Boolean).join(' / ') || 'Cihaz bilgisi yok'}</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="service-row-tech">
                                  <FaUserCog className="text-muted" size={16} title="Teknisyen" />
                                  <Form.Select
                                    size="sm"
                                    className="service-row-tech-select service-row-tech-select-full"
                                    value={rowEdit.technician || ''}
                                    disabled={isCancelledLocked}
                                    aria-label="Teknisyen seçimi"
                                    onChange={(event) => handleInlineFieldChange(svc, 'technician', event.target.value)}
                                  >
                                    <option value="">Atanmadı</option>
                                    {technicians.map((tech) => (
                                      <option key={tech.id} value={tech.id}>
                                        {tech.user?.full_name || `${tech.user?.first_name || ''} ${tech.user?.last_name || ''}`.trim() || tech.user?.email}
                                      </option>
                                    ))}
                                  </Form.Select>
                                </div>
                              </td>
                              <td>
                                <div
                                  className="service-row-status"
                                  style={{
                                    '--status-color': resolvedStatusColor,
                                    '--status-color-soft': `${resolvedStatusColor}1A`,
                                  }}
                                >
                                  <div className="service-row-status-label">
                                    {svc.status_name || statusMeta.label}
                                  </div>
                                  <Form.Select
                                    size="sm"
                                    value={rowEdit.service_status || effectiveStatus || 'new'}
                                    onChange={(event) => handleInlineFieldChange(svc, 'service_status', event.target.value)}
                                    aria-label="Durum değiştir"
                                  >
                                    {statusOptions.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </Form.Select>
                                </div>
                              </td>
                              <td className="text-end px-3 text-nowrap">
                                <div className="service-row-actions">
                                  <Button variant="dark" size="sm" className="service-row-action-btn" onClick={() => openDetailModal(svc.id)} title="Detay" aria-label="Detay">Detay</Button>
                                  <Button variant="outline-primary" size="sm" className="service-row-action-btn" onClick={() => openEditModal(svc)} title="Düzenle" aria-label="Düzenle">Düzenle</Button>
                                  <Button variant="outline-danger" size="sm" className="service-row-action-btn" onClick={() => downloadServiceFormPdf(svc)} disabled={actionLoadingKey === `pdf-${svc.id}`} title="Servis PDF" aria-label="Servis PDF">PDF</Button>
                                  <Button variant="outline-info" size="sm" className="service-row-action-btn" onClick={() => { setWarrantyServiceId(svc.id); setWarrantyMonths(24); setShowWarrantyModal(true); }} disabled={actionLoadingKey === `warranty-pdf-${svc.id}`} title="Garanti Belgesi" aria-label="Garanti Belgesi">Garanti</Button>
                                  <Button variant="outline-secondary" size="sm" className="service-row-action-btn" onClick={() => sendServiceFormEmail(svc)} disabled={actionLoadingKey === `mail-${svc.id}`} title="E-posta gönder" aria-label="E-posta gönder">E-posta</Button>
                                  <Button variant="outline-success" size="sm" className="service-row-action-btn" onClick={() => sendStatusWhatsApp(svc)} disabled={actionLoadingKey === `wa-${svc.id}`} title="WhatsApp bildir" aria-label="WhatsApp bildir">WhatsApp</Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </>
      )}

      {/* Modals are rendered outside the hidden condition so they always show */}

      <Modal show={showWarrantyModal} onHide={() => setShowWarrantyModal(false)} backdrop="static" centered>
        <Modal.Header closeButton>
          <Modal.Title>Garanti Belgesi Oluştur</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Garanti Süresi (Ay)</Form.Label>
            <Form.Control
              type="number"
              min="1"
              value={warrantyMonths}
              onChange={(e) => setWarrantyMonths(e.target.value)}
            />
            <Form.Text className="text-muted">
              Belge üzerindeki bitiş tarihi bu süreye göre hesaplanacaktır.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowWarrantyModal(false)}>İptal</Button>
          <Button variant="primary" onClick={submitWarrantyPdfDownload} disabled={!warrantyMonths || warrantyMonths < 1}>
            <FaFilePdf className="me-1" /> İndir
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showFormModal} onHide={closeFormModal} backdrop="static" size="xl" centered fullscreen="md-down" dialogClassName="service-form-modal">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editingService ? 'Servis Düzenle' : 'Yeni Servis Kaydı'}</Modal.Title>
          </Modal.Header>

          <Modal.Body className="service-form-body">
            <div className="service-form-layout">
              <Card className="border-0 shadow-sm service-form-panel">
                <Card.Header className="bg-light py-2 d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">Müşteri Bilgileri</span>
                  <Button type="button" size="sm" variant="outline-primary" onClick={openCustomerCreateModal}>
                    Hızlı Oluştur
                  </Button>
                </Card.Header>
                <Card.Body>
                  <div className="service-entry-mode">
                    <Button type="button" variant={customerEntryMode === 'existing' ? 'primary' : 'outline-secondary'} onClick={() => handleCustomerEntryModeChange('existing')}>
                      Listeden Seç
                    </Button>
                    <Button type="button" variant={customerEntryMode === 'manual' ? 'primary' : 'outline-secondary'} onClick={() => handleCustomerEntryModeChange('manual')}>
                      Manuel Giriş
                    </Button>
                  </div>

                  {customerEntryMode === 'existing' ? (
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Müşteri Seç</Form.Label>
                      <Form.Select value={formData.customer} onChange={(event) => handleCustomerSelect(event.target.value)}>
                        <option value="">Müşteri seçin</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.full_name} - {customer.phone_number}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  ) : (
                    <div className="service-form-note mb-3">Manuel giriş modunda müşteri bilgileri bu servis kaydı için ayrı tutulur.</div>
                  )}

                  <Row className="g-3">
                    <Col md={7}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Ad Soyad</Form.Label>
                        <Form.Control
                          value={formData.customer_full_name}
                          onChange={(event) => setFormData((prev) => ({ ...prev, customer_full_name: event.target.value }))}
                          required
                        />
                      </Form.Group>
                    </Col>

                    <Col md={5}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Telefon</Form.Label>
                        <Form.Control
                          value={formatPhoneInput(formData.customer_phone)}
                          placeholder="0555 123 45 67"
                          onChange={(event) => setFormData((prev) => ({ ...prev, customer_phone: formatPhoneInput(event.target.value) }))}
                        />
                      </Form.Group>
                    </Col>

                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Adres</Form.Label>
                        <Form.Control
                          value={formData.customer_address}
                          onChange={(event) => setFormData((prev) => ({ ...prev, customer_address: event.target.value }))}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm service-form-panel">
                <Card.Header className="bg-light py-2">
                  <span className="fw-semibold">İş Emri ve Cihaz Bilgileri</span>
                </Card.Header>
                <Card.Body>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Arıza Açıklaması</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={formData.fault_description}
                      onChange={(event) => setFormData((prev) => ({ ...prev, fault_description: event.target.value }))}
                    />
                  </Form.Group>

                  <Row className="g-3 mb-3">
                    <Col md={4}>
                      <Form.Group>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <Form.Label className="fw-semibold mb-0">Cihaz Türü</Form.Label>
                          <Button type="button" size="sm" variant="outline-primary" onClick={() => openOptionCreateModal('deviceType')}>
                            Ekle
                          </Button>
                        </div>
                        <Form.Select value={formData.device_type} onChange={(event) => setFormData((prev) => ({ ...prev, device_type: event.target.value }))}>
                          <option value="">Seçiniz</option>
                          {deviceTypes.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <Form.Label className="fw-semibold mb-0">Marka</Form.Label>
                          <Button type="button" size="sm" variant="outline-primary" onClick={() => openOptionCreateModal('brand')}>
                            Ekle
                          </Button>
                        </div>
                        <Form.Select
                          value={formData.device_brand}
                          onChange={(event) => {
                            const nextBrand = event.target.value
                            setFormData((prev) => ({ ...prev, device_brand: nextBrand, device_model: '' }))
                          }}
                        >
                          <option value="">Seçiniz</option>
                          {brands.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <Form.Label className="fw-semibold mb-0">Model</Form.Label>
                          <Button type="button" size="sm" variant="outline-primary" onClick={() => openOptionCreateModal('model')} disabled={!formData.device_brand}>
                            Ekle
                          </Button>
                        </div>
                        <Form.Select value={formData.device_model} onChange={(event) => setFormData((prev) => ({ ...prev, device_model: event.target.value }))}>
                          <option value="">Seçiniz</option>
                          {modelOptions.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold"><FaUserCog className="me-1" /> Teknisyen</Form.Label>
                        <Form.Select value={formData.technician} onChange={(event) => setFormData((prev) => ({ ...prev, technician: event.target.value }))}>
                          <option value="">Atanmadi</option>
                          {technicians.map((tech) => (
                            <option key={tech.id} value={tech.id}>
                              {tech.user?.full_name || `${tech.user?.first_name || ''} ${tech.user?.last_name || ''}`.trim() || tech.user?.email}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <Form.Label className="fw-semibold mb-0"><FaTools className="me-1" /> Durum</Form.Label>
                          <Button type="button" size="sm" variant="outline-primary" onClick={() => openOptionCreateModal('status')}>
                            Ekle
                          </Button>
                        </div>
                        <Form.Select value={formData.service_status} onChange={(event) => setFormData((prev) => ({ ...prev, service_status: event.target.value }))}>
                          {statusOptions.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Randevu Tarihi</Form.Label>
                        <Form.Control
                          type="datetime-local"
                          value={formData.scheduled_date}
                          onChange={(event) => setFormData((prev) => ({ ...prev, scheduled_date: event.target.value }))}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={closeFormModal} disabled={isSubmitting}>İptal</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner animation="border" size="sm" /> : 'Kaydet'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showOptionCreateModal} onHide={closeOptionCreateModal} centered dialogClassName="service-option-create-modal">
        <Modal.Header closeButton>
          <Modal.Title>{optionCreateMeta?.title || 'Alan Ekle'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {optionCreateMeta ? (
            <Form.Group>
              <Form.Label className="fw-semibold">{optionCreateMeta.label}</Form.Label>
              <Form.Control
                value={addFields[optionCreateMeta.field] || ''}
                placeholder={optionCreateMeta.placeholder}
                onChange={(event) => setAddFieldValue(optionCreateMeta.field, event.target.value)}
                disabled={optionCreateType === 'model' && !formData.device_brand}
              />
              {optionCreateType === 'model' && !formData.device_brand ? (
                <div className="service-form-note mt-2">Model eklemek için önce marka seçin.</div>
              ) : null}
            </Form.Group>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeOptionCreateModal}>
            İptal
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={submitOptionCreateModal}
            disabled={Boolean(optionCreateType === 'model' && !formData.device_brand) || Boolean(optionCreateType && addLoading[optionCreateType])}
          >
            {optionCreateType && addLoading[optionCreateType] ? <Spinner animation="border" size="sm" /> : 'Kaydet'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showCustomerCreateModal} onHide={closeCustomerCreateModal} centered size="lg" fullscreen="sm-down">
        <Modal.Header closeButton>
          <Modal.Title>Hızlı Müşteri Oluştur</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Ad Soyad</Form.Label>
                <Form.Control
                  value={addFields.customerName}
                  placeholder="Ad Soyad"
                  onChange={(event) => setAddFieldValue('customerName', event.target.value)}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Telefon</Form.Label>
                <Form.Control
                  value={formatPhoneInput(addFields.customerPhone)}
                  placeholder="+90 555 123 45 67"
                  onChange={(event) => setAddFieldValue('customerPhone', formatPhoneInput(event.target.value))}
                />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-semibold">Adres</Form.Label>
                <Form.Control
                  value={addFields.customerAddress}
                  placeholder="Adres"
                  onChange={(event) => setAddFieldValue('customerAddress', event.target.value)}
                />
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-semibold">Not</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={addFields.customerNote}
                  placeholder="Not"
                  onChange={(event) => setAddFieldValue('customerNote', event.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeCustomerCreateModal} disabled={addLoading.customer}>
            İptal
          </Button>
          <Button type="button" variant="primary" onClick={addCustomerOption} disabled={addLoading.customer}>
            {addLoading.customer ? <Spinner animation="border" size="sm" /> : 'Müşteri Oluştur'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDetailModal} onHide={closeDetailModal} size="xl" dialogClassName="service-detail-modal">
        <Modal.Header closeButton className="bg-light align-items-start pb-3 border-bottom">
          <div className="w-100 pe-3">
            {isDetailLoading || !selectedService ? (
              <Modal.Title className="d-flex align-items-center gap-2">
                <FaWrench className="text-warning" /> Servis Detayı
              </Modal.Title>
            ) : (() => {
              const detailMeta = getStatusMeta(selectedService.service_status, statusOptions)
              return (
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div className="d-flex flex-wrap align-items-center gap-3">
                    <FaWrench className="text-warning fs-3" />
                    <div>
                      <h5 className="mb-0 fw-bold">#{selectedService.receipt_number || '-'} - {selectedService.customer_full_name || '-'}</h5>
                      <div className="text-muted small">{formatPhoneInput(selectedService.customer_phone) || '-'}</div>
                    </div>
                    <div className={`service-status-pill ms-lg-2 ${getDetailStatusClass(selectedService.service_status)}`}>
                      {detailMeta.label}
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <Button size="sm" variant="outline-dark" onClick={() => downloadServiceFormPdf(selectedService)} disabled={actionLoadingKey === `pdf-${selectedService.id}`}>
                      <FaFilePdf className="me-1" /> PDF
                    </Button>
                    <Button size="sm" variant="outline-info" onClick={() => { setWarrantyServiceId(selectedService.id); setWarrantyMonths(24); setShowWarrantyModal(true); }} disabled={actionLoadingKey === `warranty-pdf-${selectedService.id}`}>
                      <FaFilePdf className="me-1" /> Garanti
                    </Button>
                    <Button size="sm" variant="outline-primary" onClick={() => sendServiceFormEmail(selectedService)} disabled={actionLoadingKey === `mail-${selectedService.id}`}>
                      <FaEnvelope className="me-1" /> E-posta
                    </Button>
                    <Button size="sm" variant="outline-success" onClick={() => sendStatusWhatsApp(selectedService)} disabled={actionLoadingKey === `wa-${selectedService.id}`}>
                      <FaWhatsapp className="me-1" /> WhatsApp
                    </Button>
                  </div>
                </div>
              )
            })()}
          </div>
        </Modal.Header>
        <Modal.Body className="service-detail-board pt-3">
          {isDetailLoading || !selectedService ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : (() => {
            const detailMeta = getStatusMeta(selectedService.service_status, statusOptions)
            const detailColor = selectedService.status_color || detailMeta.color || '#64748b'
            return (
              <>
                <div
                  className="service-detail-status-strip"
                  style={{ background: `linear-gradient(90deg, ${detailColor} 0%, ${detailColor}55 100%)` }}
                />

                <div className="service-tabs mb-3">
                  <Button size="sm" variant={detailActiveTab === 'overview' ? 'dark' : 'outline-dark'} onClick={() => setDetailActiveTab('overview')}>Genel</Button>
                  <Button size="sm" variant={detailActiveTab === 'operations' ? 'dark' : 'outline-dark'} onClick={() => setDetailActiveTab('operations')}>İşlemler</Button>
                  <Button size="sm" variant={detailActiveTab === 'payments' ? 'dark' : 'outline-dark'} onClick={() => setDetailActiveTab('payments')}>Ödemeler</Button>
                  <Button size="sm" variant={detailActiveTab === 'timeline' ? 'dark' : 'outline-dark'} onClick={() => setDetailActiveTab('timeline')}>Durum Geçmişi</Button>
                  <Button size="sm" variant={detailActiveTab === 'media' ? 'dark' : 'outline-dark'} onClick={() => setDetailActiveTab('media')}>Medya</Button>
                </div>

                {detailActiveTab === 'overview' ? (
                  <>
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
                                    {[selectedService.device_type_name, selectedService.device_brand_name, selectedService.device_model_name].filter(Boolean).join(' / ') || '-'}
                                  </div>
                                </div>
                              </Col>
                              <Col md={6}>
                                <div className="service-meta-card">
                                  <div className="meta-label">Teknisyen</div>
                                  <div className="meta-value">{selectedService.technician_name || '-'}</div>
                                </div>
                              </Col>
                              <Col md={6}>
                                <div className="service-meta-card">
                                  <div className="meta-label">Randevu</div>
                                  <div className="meta-value">{formatDateTime(selectedService.scheduled_date)}</div>
                                </div>
                              </Col>
                              <Col md={6}>
                                <div className="service-meta-card">
                                  <div className="meta-label">Adres</div>
                                  <div className="meta-value">{selectedService.customer_address || '-'}</div>
                                </div>
                              </Col>
                              <Col md={12}>
                                <div className="service-meta-card">
                                  <div className="meta-label">Ariza Notu</div>
                                  <div className="meta-value">{selectedService.fault_description || '-'}</div>
                                </div>
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col lg={5}>
                        <div className="d-flex flex-column gap-3 h-100">
                          <div className="d-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div className="service-kpi-card is-info m-0 px-2 py-1"><span>Toplam</span><strong>{paymentSummary.total.toLocaleString('tr-TR')} TL</strong></div>
                            <div className="service-kpi-card is-success m-0 px-2 py-1"><span>Alınan</span><strong>{paymentSummary.paid.toLocaleString('tr-TR')} TL</strong></div>
                            <div className="service-kpi-card is-warning m-0 px-2 py-1"><span>Kalan</span><strong>{paymentSummary.remaining.toLocaleString('tr-TR')} TL</strong></div>
                            <div className="service-kpi-card is-neutral m-0 px-2 py-1"><span>İşlem</span><strong>{(selectedService.items || []).length}</strong></div>
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
                                  {(selectedService.timeline || []).slice(0, 5).map((line) => (
                                    <tr key={line.id}>
                                      <td>{line.new_status_name || '-'}</td>
                                      <td className="text-end">{formatDateTime(line.timestamp)}</td>
                                    </tr>
                                  ))}
                                  {(selectedService.timeline || []).length === 0 ? (
                                    <tr><td colSpan={2} className="text-center text-muted">Kayıt yok</td></tr>
                                  ) : null}
                                </tbody>
                              </Table>
                            </Card.Body>
                          </Card>
                        </div>
                      </Col>
                    </Row>
                  </>
                ) : null}

                {['operations', 'payments'].includes(detailActiveTab) ? (
                  <Row className="g-3">
                    {detailActiveTab === 'operations' ? (
                      <Col lg={12}>
                        <Card className="border-0 shadow-sm h-100">
                          <Card.Header className="bg-light fw-semibold">İşlemler</Card.Header>
                          <Card.Body>
                            <Form onSubmit={handleOperationSubmit} className="mb-3">
                              <Row className="g-2 align-items-end">
                                <Col md={12}>
                                  <Form.Label className="small mb-1">İşlem Seç</Form.Label>
                                  <InputGroup>
                                    <Form.Select
                                      value={selectedOperationTemplate}
                                      onChange={(event) => applyOperationTemplate(event.target.value)}
                                    >
                                      <option value="">Seçiniz</option>
                                      {operationTemplates.map((template) => (
                                        <option key={template.id} value={template.id}>
                                          {template.label} (Şablon)
                                        </option>
                                      ))}
                                    </Form.Select>
                                    <Button
                                      type="button"
                                      variant="outline-primary"
                                      onClick={openTemplateModal}
                                      title="Yeni şablon ekle"
                                    >
                                      <FaPlus className="me-1" /> Yeni Şablon Ekle
                                    </Button>
                                  </InputGroup>
                                  <Form.Text className="text-muted">
                                    Daha önceden kaydedilmiş bir işlem şablonunu yükler. &quot;Yeni Şablon Ekle&quot; ile şablon oluşturabilirsiniz.
                                  </Form.Text>
                                </Col>
                                <Col md={12}>
                                  <Form.Label className="small mb-1">Parça (Stoktan)</Form.Label>
                                  <Form.Select
                                    value={operationForm.product}
                                    onChange={(event) => handleOperationProductChange(event.target.value)}
                                  >
                                    <option value="">Parça seçmeden manuel işlem ekle</option>
                                    {operationProductOptions.map((product) => (
                                      <option key={product.id} value={product.id}>
                                        {product.name} | Stok: {product.stock_quantity || 0} | {Number(product.price || 0).toLocaleString('tr-TR')} TL
                                      </option>
                                    ))}
                                  </Form.Select>
                                </Col>
                                <Col md={4}>
                                  <Form.Label className="small mb-1">İşlem</Form.Label>
                                  <Form.Control
                                    value={operationForm.name}
                                    onChange={(event) => setOperationForm((prev) => ({ ...prev, name: event.target.value }))}
                                    placeholder="İşlem adı"
                                  />
                                </Col>
                                <Col md={3}>
                                  <Form.Label className="small mb-1">Adet</Form.Label>
                                  <Form.Control
                                    type="number"
                                    min={1}
                                    value={operationForm.quantity}
                                    onChange={(event) => setOperationForm((prev) => ({ ...prev, quantity: event.target.value }))}
                                  />
                                </Col>
                                <Col md={5}>
                                  <Form.Label className="small mb-1">Birim Fiyat</Form.Label>
                                  <Form.Control
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={operationForm.unit_price}
                                    onChange={(event) => setOperationForm((prev) => ({ ...prev, unit_price: event.target.value }))}
                                  />
                                </Col>
                                <Col md={8}>
                                  <Form.Label className="small mb-1">Açıklama</Form.Label>
                                  <Form.Control
                                    value={operationForm.description}
                                    onChange={(event) => setOperationForm((prev) => ({ ...prev, description: event.target.value }))}
                                    placeholder="Parça/işlem açıklaması"
                                  />
                                </Col>
                                <Col md={4} className="d-flex gap-2">
                                  <Button type="submit" variant="primary" className="w-100" disabled={isSavingOperation}>
                                    {isSavingOperation ? <Spinner animation="border" size="sm" /> : editingOperationId ? 'Güncelle' : 'Ekle'}
                                  </Button>
                                  {editingOperationId ? (
                                    <Button type="button" variant="outline-secondary" onClick={cancelOperationEdit}>
                                      İptal
                                    </Button>
                                  ) : null}
                                </Col>
                              </Row>
                            </Form>
                            <Table size="sm" className="m-0">
                              <thead>
                                <tr>
                                  <th>İşlem</th>
                                  <th className="text-center">Adet</th>
                                  <th className="text-end">Tutar</th>
                                  <th className="text-end">Aksiyon</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(selectedService.items || []).length === 0 ? (
                                  <tr><td colSpan={4} className="text-center text-muted">Kayıt yok</td></tr>
                                ) : (
                                  (selectedService.items || []).map((item) => (
                                    <tr key={item.id}>
                                      <td>
                                        <div className="fw-semibold">{item.name || '-'}</div>
                                        {item.product_name ? <small className="d-block text-primary">{item.product_name}</small> : null}
                                        {item.description ? <small className="text-muted">{item.description}</small> : null}
                                      </td>
                                      <td className="text-center">{item.quantity || 0}</td>
                                      <td className="text-end">{Number(item.total_price || 0).toLocaleString('tr-TR')} ₺</td>
                                      <td className="text-end">
                                        <Button size="sm" variant="outline-primary" className="me-1" onClick={() => startEditOperation(item)}>
                                          Düzenle
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline-danger"
                                          onClick={() => handleDeleteOperation(item.id)}
                                          disabled={deletingOperationId === item.id}
                                        >
                                          {deletingOperationId === item.id ? <Spinner animation="border" size="sm" /> : 'Sil'}
                                        </Button>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </Table>
                          </Card.Body>
                        </Card>
                      </Col>
                    ) : null}

                    {detailActiveTab === 'payments' ? (
                      <Col lg={12}>
                        <Card className="border-0 shadow-sm h-100">
                          <Card.Header className="bg-light fw-semibold">Ödemeler</Card.Header>
                          <Card.Body>
                            <div className="d-flex flex-wrap gap-3 mb-3 small">
                              <div><strong>Toplam:</strong> {paymentSummary.total.toLocaleString('tr-TR')} TL</div>
                              <div><strong>Ödenen:</strong> {paymentSummary.paid.toLocaleString('tr-TR')} TL</div>
                              <div className={paymentSummary.remaining > 0 ? 'text-danger fw-semibold' : 'text-success fw-semibold'}>
                                <strong>Kalan:</strong> {paymentSummary.remaining.toLocaleString('tr-TR')} TL
                              </div>
                            </div>
                            <Form onSubmit={handlePaymentSubmit} className="mb-3">
                              <Row className="g-2 align-items-end">
                                <Col md={5}>
                                  <Form.Label className="small mb-1">Tutar</Form.Label>
                                  <InputGroup>
                                    <Form.Control
                                      type="text"
                                      value={(() => {
                                        const val = String(paymentForm.amount || '');
                                        const parts = val.split(',');
                                        const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                                        return parts.length > 1 ? `${intPart},${parts[1]}` : intPart;
                                      })()}
                                      onChange={(event) => {
                                        let val = event.target.value.replace(/[^0-9,]/g, '');
                                        const parts = val.split(',');
                                        if (parts.length > 2) val = parts[0] + ',' + parts.slice(1).join('');
                                        setPaymentForm((prev) => ({ ...prev, amount: val }));
                                      }}
                                      placeholder="0"
                                    />
                                    <Button
                                      variant="outline-secondary"
                                      onClick={() => setPaymentForm((prev) => ({ ...prev, amount: Math.max(0, paymentSummary.remaining).toString().replace('.', ',') }))}
                                      title="Kalan Tutarı Gir"
                                    >
                                      Kalanı Gir
                                    </Button>
                                  </InputGroup>
                                </Col>
                                <Col md={4}>
                                  <Form.Label className="small mb-1">Ödeme Yöntemi</Form.Label>
                                  <Form.Select
                                    value={paymentForm.payment_method}
                                    onChange={(event) => setPaymentForm((prev) => ({ ...prev, payment_method: event.target.value }))}
                                  >
                                    <option value="">Seçiniz</option>
                                    {paymentMethods.map((method) => (
                                      <option key={method.id} value={method.id}>{method.name}</option>
                                    ))}
                                  </Form.Select>
                                </Col>
                                <Col md={3} className="d-flex gap-2">
                                  <Button type="submit" variant="primary" className="w-100" disabled={isSavingPayment}>
                                    {isSavingPayment ? <Spinner animation="border" size="sm" /> : editingPaymentId ? 'Güncelle' : 'Ekle'}
                                  </Button>
                                  {editingPaymentId ? (
                                    <Button type="button" variant="outline-secondary" onClick={cancelPaymentEdit}>
                                      İptal
                                    </Button>
                                  ) : null}
                                </Col>
                                <Col md={12}>
                                  <Form.Label className="small mb-1">Not</Form.Label>
                                  <Form.Control
                                    value={paymentForm.note}
                                    onChange={(event) => setPaymentForm((prev) => ({ ...prev, note: event.target.value }))}
                                    placeholder="Ödeme notu"
                                  />
                                </Col>
                              </Row>
                            </Form>
                            <Table size="sm" className="m-0">
                              <thead>
                                <tr>
                                  <th>Tarih</th>
                                  <th>Yöntem</th>
                                  <th className="text-end">Tutar</th>
                                  <th className="text-end">Aksiyon</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(selectedService.payments || []).length === 0 ? (
                                  <tr><td colSpan={4} className="text-center text-muted">Kayıt yok</td></tr>
                                ) : (
                                  (selectedService.payments || []).map((pay) => (
                                    <tr key={pay.id}>
                                      <td>{formatDateTime(pay.created_at)}</td>
                                      <td>{pay.payment_method_name || '-'}</td>
                                      <td className="text-end">{Number(pay.amount || 0).toLocaleString('tr-TR')} ₺</td>
                                      <td className="text-end">
                                        <Button size="sm" variant="outline-primary" className="me-1" onClick={() => startEditPayment(pay)}>
                                          Düzenle
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline-danger"
                                          onClick={() => handleDeletePayment(pay.id)}
                                          disabled={deletingPaymentId === pay.id}
                                        >
                                          {deletingPaymentId === pay.id ? <Spinner animation="border" size="sm" /> : 'Sil'}
                                        </Button>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </Table>
                          </Card.Body>
                        </Card>
                      </Col>
                    ) : null}
                  </Row>
                ) : null}

                {['timeline', 'media'].includes(detailActiveTab) ? (
                  <Row className="g-3 mt-1">
                    {detailActiveTab === 'timeline' ? (
                      <Col lg={12}>
                        <Card className="border-0 shadow-sm">
                          <Card.Header className="bg-light fw-semibold">Durum Geçmişi</Card.Header>
                          <Card.Body className="p-0">
                            <Table size="sm" className="m-0">
                              <thead>
                                <tr>
                                  <th>Tarih</th>
                                  <th>Eski</th>
                                  <th>Yeni</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(selectedService.timeline || []).length === 0 ? (
                                  <tr><td colSpan={3} className="text-center text-muted">Kayıt yok</td></tr>
                                ) : (
                                  (selectedService.timeline || []).map((line) => (
                                    <tr key={line.id}>
                                      <td>{formatDateTime(line.timestamp)}</td>
                                      <td>{line.old_status_name || '-'}</td>
                                      <td>
                                        <span
                                          className="service-timeline-status"
                                          style={{ backgroundColor: line.new_status_color || '#6B7280' }}
                                        >
                                          {line.new_status_name || '-'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </Table>
                          </Card.Body>
                        </Card>
                      </Col>
                    ) : null}
                    {detailActiveTab === 'media' ? (
                      <Col lg={12}>
                        <Card className="border-0 shadow-sm">
                          <Card.Header className="bg-light fw-semibold">Fotoğraflar</Card.Header>
                          <Card.Body>
                            <Form onSubmit={handlePhotoSubmit} className="mb-3">
                              <Row className="g-2 align-items-end">
                                <Col md={5}>
                                  <Form.Label className="small mb-1">Fotoğraf</Form.Label>
                                  <Form.Control
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) => {
                                      const nextFile = event.target.files?.[0] || null
                                      setPhotoForm((prev) => ({ ...prev, image: nextFile }))
                                    }}
                                  />
                                </Col>
                                <Col md={5}>
                                  <Form.Label className="small mb-1">Açıklama</Form.Label>
                                  <Form.Control
                                    value={photoForm.description}
                                    onChange={(event) => setPhotoForm((prev) => ({ ...prev, description: event.target.value }))}
                                    placeholder="Opsiyonel açıklama"
                                  />
                                </Col>
                                <Col md={2}>
                                  <Button type="submit" variant="primary" className="w-100" disabled={isUploadingPhoto}>
                                    {isUploadingPhoto ? <Spinner animation="border" size="sm" /> : 'Yükle'}
                                  </Button>
                                </Col>
                              </Row>
                            </Form>
                            {(selectedService.photos || []).length === 0 ? (
                              <div className="text-muted text-center">Fotoğraf yok</div>
                            ) : (
                              <Row className="g-2">
                                {(selectedService.photos || []).map((photo) => (
                                  <Col md={6} key={photo.id}>
                                    <div className="border rounded-3 p-2">
                                      <img
                                        src={resolveImageUrl(photo.image)}
                                        alt={photo.description || 'Servis fotoğrafı'}
                                        className="img-fluid rounded"
                                        style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                                      />
                                      <div className="d-flex justify-content-between align-items-center mt-1 gap-2">
                                        {photo.description ? <small className="text-muted">{photo.description}</small> : <small className="text-muted">Açıklama yok</small>}
                                        <Button
                                          size="sm"
                                          variant="outline-danger"
                                          onClick={() => handleDeletePhoto(photo.id)}
                                          disabled={deletingPhotoId === photo.id}
                                        >
                                          {deletingPhotoId === photo.id ? <Spinner animation="border" size="sm" /> : 'Sil'}
                                        </Button>
                                      </div>
                                    </div>
                                  </Col>
                                ))}
                              </Row>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                    ) : null}
                  </Row>
                ) : null}

                {['overview', 'media'].includes(detailActiveTab) ? (
                  <Row className="g-3 mt-1">
                    <Col lg={12}>
                      <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-light fw-semibold">İmzalar</Card.Header>
                        <Card.Body>
                          <Form onSubmit={handleSignatureSubmit} className="mb-3">
                            <Row className="g-2 align-items-end">
                              <Col md={5}>
                                <Form.Label className="small mb-1">Müşteri İmzası</Form.Label>
                                <Form.Control
                                  type="file"
                                  accept="image/*"
                                  onChange={(event) => {
                                    const nextFile = event.target.files?.[0] || null
                                    setSignatureForm((prev) => ({ ...prev, customer_signature: nextFile }))
                                  }}
                                />
                              </Col>
                              <Col md={5}>
                                <Form.Label className="small mb-1">Teknisyen İmzası</Form.Label>
                                <Form.Control
                                  type="file"
                                  accept="image/*"
                                  onChange={(event) => {
                                    const nextFile = event.target.files?.[0] || null
                                    setSignatureForm((prev) => ({ ...prev, technician_signature: nextFile }))
                                  }}
                                />
                              </Col>
                              <Col md={2}>
                                <Button type="submit" variant="primary" className="w-100" disabled={isUploadingSignature}>
                                  {isUploadingSignature ? <Spinner animation="border" size="sm" /> : 'Yükle'}
                                </Button>
                              </Col>
                            </Row>
                          </Form>

                          {(selectedService.signatures || []).length === 0 ? (
                            <div className="text-muted text-center">İmza kaydı yok</div>
                          ) : (
                            <Row className="g-2">
                              {(selectedService.signatures || []).map((sign) => (
                                <Col lg={6} key={sign.id}>
                                  <div className="border rounded-3 p-2">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                      <small className="text-muted">{formatDateTime(sign.created_at)}</small>
                                      <Button
                                        size="sm"
                                        variant="outline-danger"
                                        onClick={() => handleDeleteSignature(sign.id)}
                                        disabled={deletingSignatureId === sign.id}
                                      >
                                        {deletingSignatureId === sign.id ? <Spinner animation="border" size="sm" /> : 'Sil'}
                                      </Button>
                                    </div>
                                    <Row className="g-2">
                                      <Col md={6}>
                                        <small className="text-muted d-block mb-1">Müşteri</small>
                                        {sign.customer_signature ? (
                                          <img
                                            src={resolveImageUrl(sign.customer_signature)}
                                            alt="Müşteri imzası"
                                            className="img-fluid rounded border"
                                            style={{ width: '100%', height: '120px', objectFit: 'contain', background: '#fff' }}
                                          />
                                        ) : (
                                          <div className="text-muted small border rounded p-2 text-center">Yok</div>
                                        )}
                                      </Col>
                                      <Col md={6}>
                                        <small className="text-muted d-block mb-1">Teknisyen</small>
                                        {sign.technician_signature ? (
                                          <img
                                            src={resolveImageUrl(sign.technician_signature)}
                                            alt="Teknisyen imzası"
                                            className="img-fluid rounded border"
                                            style={{ width: '100%', height: '120px', objectFit: 'contain', background: '#fff' }}
                                          />
                                        ) : (
                                          <div className="text-muted small border rounded p-2 text-center">Yok</div>
                                        )}
                                      </Col>
                                    </Row>
                                  </div>
                                </Col>
                              ))}
                            </Row>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                ) : null}
              </>
            )
          })()}
        </Modal.Body>
      </Modal>

      <Modal show={showTemplateModal} onHide={closeTemplateModal} centered>
        <Form onSubmit={submitTemplateModal}>
          <Modal.Header closeButton={!isSavingOperationTemplate}>
            <Modal.Title className="h6">Yeni İşlem Şablonu</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-2">
              <Col md={12}>
                <Form.Label className="small mb-1">İşlem Adı *</Form.Label>
                <Form.Control
                  value={templateForm.name}
                  onChange={(event) => setTemplateForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Örn: Ekran değişimi"
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label className="small mb-1">Adet</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={templateForm.quantity ?? 1}
                  onChange={(event) => setTemplateForm((prev) => ({ ...prev, quantity: event.target.value }))}
                  placeholder="1"
                />
              </Col>
              <Col md={6}>
                <Form.Label className="small mb-1">Birim Fiyat (₺)</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  step="0.01"
                  value={templateForm.default_unit_price}
                  onChange={(event) => setTemplateForm((prev) => ({ ...prev, default_unit_price: event.target.value }))}
                  placeholder="0,00"
                />
              </Col>
              <Col md={12}>
                <Form.Label className="small mb-1">Açıklama</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={templateForm.description}
                  onChange={(event) => setTemplateForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Şablon için kısa açıklama"
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeTemplateModal} disabled={isSavingOperationTemplate}>
              Vazgeç
            </Button>
            <Button type="submit" variant="primary" disabled={isSavingOperationTemplate}>
              {isSavingOperationTemplate ? <Spinner animation="border" size="sm" /> : 'Şablonu Kaydet'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}

export default Services




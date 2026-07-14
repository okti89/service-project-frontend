import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Button, Card, Col, Form, InputGroup, Modal, Row, Spinner, Table } from 'react-bootstrap'
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaEdit,
  FaExternalLinkAlt,
  FaHistory,
  FaMapMarkerAlt,
  FaPlay,
  FaPlus,
  FaRoute,
  FaSearch,
  FaShieldAlt,
  FaSignInAlt,
  FaSignOutAlt,
  FaSyncAlt,
  FaTimes,
  FaTrash,
  FaUndo,
  FaUserCog,
  FaWrench,
} from 'react-icons/fa'
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import { useNavigate } from 'react-router-dom'
import api from '../../api/api'
import toast from 'react-hot-toast'
import ServiceDetailModal from '../../components/ServiceDetailModal'

const defaultPermissions = {
  can_manage_customers: false,
  can_manage_inventory: false,
  can_manage_users: false,
  can_manage_accounting: false,
  can_manage_notifications: false,
  can_manage_hr: false,
  can_manage_reports: false,
  can_manage_settings: false,
  can_manage_services: false,
  can_use_global_search: false,
  can_manage_technicians: false,
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

function getCurrentMonthValue() {
  return new Date().toISOString().slice(0, 7)
}

function getCurrentYear() {
  return new Date().getFullYear()
}

function getCurrentMonthNumber() {
  return new Date().getMonth() + 1
}

const defaultFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  password: '',
  hire_date: getTodayDate(),
  status: 'available',
  permissions: defaultPermissions,
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

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function timeAgo(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) return 'Az önce'
  const seç = Math.floor(diffMs / 1000)
  if (seç < 60) return 'Az önce'
  const min = Math.floor(seç / 60)
  if (min < 60) return `${min} dakika önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} saat önce`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} gün önce`
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const trCollator = new Intl.Collator('tr', { sensitivity: 'base' })

function compareTechniciansTr(a, b) {
  const nameA = a.user?.full_name || `${a.user?.first_name || ''} ${a.user?.last_name || ''}`.trim() || ''
  const nameB = b.user?.full_name || `${b.user?.first_name || ''} ${b.user?.last_name || ''}`.trim() || ''
  return trCollator.compare(nameA, nameB)
}

function normalizePermissions(permissions) {
  return {
    can_manage_customers: Boolean(permissions?.can_manage_customers),
    can_manage_inventory: Boolean(permissions?.can_manage_inventory),
    can_manage_users: Boolean(permissions?.can_manage_users),
    can_manage_accounting: Boolean(permissions?.can_manage_accounting),
    can_manage_notifications: Boolean(permissions?.can_manage_notifications),
    can_manage_hr: Boolean(permissions?.can_manage_hr),
    can_manage_reports: Boolean(permissions?.can_manage_reports),
    can_manage_settings: Boolean(permissions?.can_manage_settings),
    can_manage_services: Boolean(permissions?.can_manage_services),
    can_use_global_search: Boolean(permissions?.can_use_global_search),
    can_manage_technicians: Boolean(permissions?.can_manage_technicians),
  }
}

function normalizeTechnicianStatus(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
  if (!raw) return 'available'
  if (['offduty', 'izinli', 'on_leave', 'leave'].includes(raw)) return 'offduty'
  if (['available', 'musait', 'müsait'].includes(raw)) return 'available'
  return raw
}

function toStatusLabel(value) {
  const normalized = normalizeTechnicianStatus(value)
  if (normalized === 'available') return 'Müsait'
  if (normalized === 'offduty') return 'İzinli'
  return String(value || normalized || '-')
}

function resolveTechnicianStatusLabel(tech) {
  return toStatusLabel(tech?.status_display || tech?.status)
}

function mergeStatusOptions(list = []) {
  const map = new Map()
  list.forEach((item) => {
    const rawValue = typeof item === 'string' ? item : item?.value
    const normalized = normalizeTechnicianStatus(rawValue)
    if (!normalized) return
    if (!map.has(normalized)) {
      map.set(normalized, {
        value: normalized,
        label: typeof item === 'object' ? (item?.label || toStatusLabel(rawValue)) : toStatusLabel(rawValue),
        color: typeof item === 'object' ? (item?.color || '') : '',
      })
    }
  })
  return Array.from(map.values())
}

const permissionLabels = [
  { key: 'can_manage_services', label: 'Servisleri yönetebilir' },
  { key: 'can_manage_customers', label: 'Müşterileri yönetebilir' },
  { key: 'can_manage_inventory', label: 'Envanteri yönetebilir' },
  { key: 'can_manage_users', label: 'Kullanıcıları yönetebilir' },
  { key: 'can_manage_technicians', label: 'Teknisyenleri yönetebilir' },
  { key: 'can_manage_accounting', label: 'Muhasebeyi yönetebilir' },
  { key: 'can_manage_hr', label: 'İnsan kaynaklarını yönetebilir' },
  { key: 'can_manage_reports', label: 'Raporları yönetebilir' },
  { key: 'can_manage_notifications', label: 'Bildirimleri yönetebilir' },
  { key: 'can_manage_settings', label: 'Ayarları yönetebilir' },
  { key: 'can_use_global_search', label: 'Genel aramayı kullanabilir' },
]

// We will fetch status options from backend dynamically now.
// const defaultStatusOptions = [
//   { value: 'available', label: 'Müsait' },
//   { value: 'offduty', label: 'İzinli' },
// ]

const attendanceStatusOptions = [
  { value: 'worked', label: 'Çalıştı', badge: 'success' },
  { value: 'leave', label: 'İzinli', badge: 'warning' },
  { value: 'sick', label: 'Raporlu', badge: 'info' },
  { value: 'offday', label: 'Resmi Tatil', badge: 'secondary' },
  { value: 'absent', label: 'Devamsız', badge: 'danger' },
]

const monthNameOptions = [
  'Ocak',
  'Subat',
  'Mart',
  'Nisan',
  'Mayis',
  'Haziran',
  'Temmuz',
  'Agustos',
  'Eylul',
  'Ekim',
  'Kasim',
  'Aralik',
]

function getAttendanceStatusMeta(statusValue) {
  return attendanceStatusOptions.find((item) => item.value === statusValue) || { label: statusValue || '-', badge: 'secondary' }
}

function buildCalendarCells(monthValue) {
  const [yearText, monthText] = (monthValue || '').split('-')
  const year = Number(yearText)
  const month = Number(monthText)

  if (!year || !month) return []

  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const mondayIndex = (firstDay.getDay() + 6) % 7

  const cells = []
  for (let i = 0; i < mondayIndex; i += 1) {
    cells.push(null)
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateObj = new Date(year, month - 1, day)
    const iso = `${yearText}-${monthText}-${String(day).padStart(2, '0')}`
    cells.push({ day, iso, weekend: [0, 6].includes(dateObj.getDay()) })
  }

  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  return cells
}

function isUuid(value) {
  if (!value || typeof value !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

const defaultMapCenter = [39.925533, 32.866287]

function parseCoordinate(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getLocationTimestamp(value) {
  const timestamp = new Date(value || '').getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function getDateKey(value) {
  const date = new Date(value || '')
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftDateKey(dateKey, dayOffset) {
  const baseDate = dateKey ? new Date(`${dateKey}T00:00:00`) : new Date()
  if (Number.isNaN(baseDate.getTime())) return getDateKey(new Date())
  baseDate.setDate(baseDate.getDate() + dayOffset)
  return getDateKey(baseDate)
}

function normalizeLocationRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const latitudeNumber = parseCoordinate(row?.latitude)
      const longitudeNumber = parseCoordinate(row?.longitude)
      return { ...row, latitudeNumber, longitudeNumber }
    })
    .filter((row) => row.latitudeNumber !== null && row.longitudeNumber !== null)
    .sort((a, b) => getLocationTimestamp(a.created_at) - getLocationTimestamp(b.created_at))
}

function getLocationAddress(row) {
  if (typeof row?.address === 'string' && row.address.trim()) return row.address.trim()
  if (typeof row?.location === 'string' && row.location.trim()) return row.location.trim()
  return '-'
}

function distanceBetweenLocationRowsKm(startRow, endRow) {
  if (!startRow || !endRow) return 0
  const start = L.latLng(startRow.latitudeNumber, startRow.longitudeNumber)
  const end = L.latLng(endRow.latitudeNumber, endRow.longitudeNumber)
  return start.distanceTo(end) / 1000
}

function sumLocationDistanceKm(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return 0
  let total = 0
  for (let index = 0; index < rows.length - 1; index += 1) {
    total += distanceBetweenLocationRowsKm(rows[index], rows[index + 1])
  }
  return total
}

function formatDistanceKm(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '-'
  return `${numericValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`
}

function buildGoogleDirectionsUrl(rows) {
  if (!rows || rows.length < 2) return ''
  const origin = `${rows[0].latitudeNumber},${rows[0].longitudeNumber}`
  const destination = `${rows[rows.length - 1].latitudeNumber},${rows[rows.length - 1].longitudeNumber}`
  const waypoints = rows.slice(1, -1).map((row) => `${row.latitudeNumber},${row.longitudeNumber}`).join('|')
  const params = new URLSearchParams({ api: '1', origin, destination, travelmode: 'driving' })
  if (waypoints) params.set('waypoints', waypoints)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function buildGoogleExternalNavigationUrl(row) {
  if (!row || row.latitudeNumber === null || row.longitudeNumber === null) return ''
  const params = new URLSearchParams({
    api: '1',
    destination: `${row.latitudeNumber},${row.longitudeNumber}`,
    travelmode: 'driving',
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function createOrderMarkerIcon(orderNumber, isActive = false) {
  const markerColor = isActive ? '#16a34a' : '#2563eb'
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:999px;background:${markerColor};color:#fff;font-size:12px;font-weight:800;border:2px solid #fff;box-shadow:0 2px 8px rgba(15,23,42,.35);">${orderNumber}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  })
}

const LocationMapBounds = ({ positions }) => {
  const map = useMap()

  useEffect(() => {
    if (!map || !positions.length) return
    if (positions.length === 1) {
      map.setView(positions[0], 15, { animate: false })
      return
    }
    map.fitBounds(L.latLngBounds(positions).pad(0.18), { animate: false })
  }, [map, positions])

  return null
}

const LocationDrivingRoute = ({ positions, onRouteStatusChange, onRouteDistanceChange }) => {
  const map = useMap()
  const controlRef = useRef(null)

  useEffect(() => {
    if (!map) return undefined

    if (controlRef.current) {
      map.removeControl(controlRef.current)
      controlRef.current = null
    }

    if (!Array.isArray(positions) || positions.length < 2 || !L.Routing?.control) {
      onRouteStatusChange?.('idle')
      onRouteDistanceChange?.(null)
      return undefined
    }

    onRouteStatusChange?.('loading')

    const control = L.Routing.control({
      waypoints: positions.map((position) => L.latLng(position[0], position[1])),
      addWaypoints: false,
      draggableWaypoints: false,
      routeWhileDragging: false,
      fitSelectedRoutes: false,
      showAlternatives: false,
      show: false,
      createMarker: () => null,
      lineOptions: {
        styles: [{ color: '#2563eb', opacity: 0.88, weight: 5 }],
      },
    }).addTo(map)

    const handleRoutesFound = (event) => {
      const firstRoute = event?.routes?.[0]
      const distanceMeters = Number(firstRoute?.summary?.totalDistance || 0)
      const distanceKm = Number.isFinite(distanceMeters) && distanceMeters > 0 ? distanceMeters / 1000 : null
      onRouteDistanceChange?.(distanceKm)
      onRouteStatusChange?.('ready')
    }
    const handleRoutingError = () => {
      onRouteDistanceChange?.(null)
      onRouteStatusChange?.('error')
    }

    control.on('routesfound', handleRoutesFound)
    control.on('routingerror', handleRoutingError)
    controlRef.current = control

    return () => {
      if (controlRef.current) {
        controlRef.current.off('routesfound', handleRoutesFound)
        controlRef.current.off('routingerror', handleRoutingError)
        map.removeControl(controlRef.current)
        controlRef.current = null
      }
    }
  }, [map, onRouteDistanceChange, onRouteStatusChange, positions])

  return null
}

const Technicians = () => {
  const navigate = useNavigate()
  const [technicians, setTechnicians] = useState([])
  const [statusOptions, setStatusOptions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [filterType, setFilterType] = useState('active')
  const [searchTerm, setSearchTerm] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingTechnicianId, setEditingTechnicianId] = useState(null)
  const [formData, setFormData] = useState(defaultFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savingStatusById, setSavingStatusById] = useState({})
  const [editingStatusId, setEditingStatusId] = useState(null)

  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [selectedTechnician, setSelectedTechnician] = useState(null)
  const [permissionForm, setPermissionForm] = useState(defaultPermissions)
  const [isPermissionLoading, setIsPermissionLoading] = useState(false)
  const [isSavingPermissions, setIsSavingPermissions] = useState(false)

  const [showLocationModal, setShowLocationModal] = useState(false)
  const [locationRows, setLocationRows] = useState([])
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  const [locationDate, setLocationDate] = useState('')
  const [activeLocationIndex, setActiveLocationIndex] = useState(0)
  const [locationRouteStatus, setLocationRouteStatus] = useState('idle')
  const [locationRouteDistanceKm, setLocationRouteDistanceKm] = useState(null)
  const markerRefs = useRef({})

  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [attendanceMonth, setAttendanceMonth] = useState(getCurrentMonthValue())
  const [attendanceRows, setAttendanceRows] = useState([])
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false)
  const [isSavingAttendance, setIsSavingAttendance] = useState(false)
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState('')
  const [attendanceForm, setAttendanceForm] = useState({
    id: '',
    status: 'worked',
    start_time: '09:00',
    end_time: '18:00',
    note: '',
    is_derived: false,
  })
  const [showServicesModal, setShowServicesModal] = useState(false)
  const [technicianServices, setTechnicianServices] = useState([])
  const [isTechnicianServicesLoading, setIsTechnicianServicesLoading] = useState(false)
  const [selectedServiceForDetail, setSelectedServiceForDetail] = useState(null)
  const [showServiceDetailModal, setShowServiceDetailModal] = useState(false)
  const [showShiftHistoryModal, setShowShiftHistoryModal] = useState(false)
  const [shiftHistoryRows, setShiftHistoryRows] = useState([])
  const [isShiftHistoryLoading, setIsShiftHistoryLoading] = useState(false)
  const [shiftHistoryYear, setShiftHistoryYear] = useState(getCurrentYear())
  const [shiftHistoryMonthNumber, setShiftHistoryMonthNumber] = useState(getCurrentMonthNumber())

  const fetchTechnicians = async (silent = false) => {
    let ok = true
    if (!silent) setIsLoading(true)
    try {
      const response = await api.get('/technicians/technician-list/')
      setTechnicians(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      ok = false
      toast.error(readApiError(error, 'Teknisyenler yüklenemedi.'))
    } finally {
      if (!silent) setIsLoading(false)
      setIsRefreshing(false)
    }
    return ok
  }

  const fetchStatuses = async () => {
    try {
      const response = await api.get('/technicians/statuses/')
      if (Array.isArray(response.data) && response.data.length > 0) {
        setStatusOptions(
          mergeStatusOptions(
            response.data.map((s) => ({
              value: s.name,
              label: toStatusLabel(s.name),
              color: s.color || '',
            }))
          )
        )
      } else {
        setStatusOptions(
          mergeStatusOptions([
            { value: 'available', label: 'Müsait', color: '#28a745' },
            { value: 'offduty', label: 'İzinli', color: '#f59e0b' },
          ])
        )
      }
    } catch (e) {
      setStatusOptions(
        mergeStatusOptions([
          { value: 'available', label: 'Müsait', color: '#28a745' },
          { value: 'offduty', label: 'İzinli', color: '#f59e0b' },
        ])
      )
      console.log('Statuses could not be loaded.')
    }
  }

  useEffect(() => {
    fetchTechnicians()
    fetchStatuses()
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const ok = await fetchTechnicians(true)
    if (ok) {
      toast.success('Teknisyen listesi yenilendi.')
    }
  }

  const resetForm = () => {
    setFormData({
      ...defaultFormData,
      hire_date: getTodayDate(),
      permissions: { ...defaultPermissions },
    })
  }

  const closeFormModal = () => {
    setShowModal(false)
    setEditingTechnicianId(null)
    setIsSubmitting(false)
    resetForm()
  }

  const openCreateModal = () => {
    setEditingTechnicianId(null)
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (tech) => {
    setEditingTechnicianId(tech.id)
    setFormData({
      first_name: tech.user?.first_name || '',
      last_name: tech.user?.last_name || '',
      email: tech.user?.email || '',
      phone_number: tech.user?.phone_number || '',
      password: '',
      hire_date: tech.hire_date || getTodayDate(),
      status: normalizeTechnicianStatus(tech.status),
      permissions: normalizePermissions(tech.permissions),
    })
    setShowModal(true)
  }

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePermissionToggle = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: value,
      },
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      if (editingTechnicianId) {
        await api.patch(`/technicians/technician/${editingTechnicianId}/`, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone_number: formData.phone_number || null,
          hire_date: formData.hire_date,
          status: formData.status,
        })

        await api.patch(`/technicians/technician/${editingTechnicianId}/permissions/`, {
          ...formData.permissions,
        })

        toast.success('Teknisyen güncellendi.')
      } else {
        const userData = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone_number: formData.phone_number || null,
          user_type: 'technician',
          password: formData.password,
        }

        await api.post('/technicians/technician-list/', {
          hire_date: formData.hire_date,
          status: formData.status,
          user_data: userData,
          permissions: { ...formData.permissions },
        })

        toast.success('Yeni teknisyen eklendi.')

        // WhatsApp ile bilgilendirme gönderilsin mi?
        const phoneForWhatsapp = (formData.phone_number || '').replace(/[^\d+]/g, '')
        if (phoneForWhatsapp) {
          const sendViaWhatsapp = window.confirm(
            'Yeni teknisyen oluşturuldu. Giriş bilgileri WhatsApp üzerinden gönderilsin mi?'
          )
          if (sendViaWhatsapp) {
            const fullName = `${formData.first_name || ''} ${formData.last_name || ''}`.trim()
            const whatsappMessage =
              `Merhaba ${fullName},\n\n` +
              `Teknisyen hesabınız oluşturuldu. Giriş bilgileriniz:\n\n` +
              `E-posta: ${formData.email}\n` +
              `Şifre: ${formData.password}\n\n` +
              `İyi çalışmalar dileriz.`
            const targetNumber = phoneForWhatsapp.replace(/^\+/, '')
            const whatsappUrl = `https://wa.me/${targetNumber}?text=${encodeURIComponent(whatsappMessage)}`
            window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
          }
        }
      }

      closeFormModal()
      fetchTechnicians(true)
    } catch (error) {
      toast.error(readApiError(error, 'Kayıt işlemi başarısız.'))
      setIsSubmitting(false)
    }
  }

  const handleDeactivate = async (id) => {
    if (!window.confirm('Bu teknisyeni pasife almak istediginize emin misiniz?')) return

    try {
      await api.delete(`/technicians/technician/${id}/`)
      toast.success('Teknisyen pasife alındı.')
      fetchTechnicians(true)
    } catch (error) {
      toast.error(readApiError(error, 'Teknisyen pasife alınamadı.'))
    }
  }

  const handleQuickStatusChange = async (tech, nextStatusRaw) => {
    const nextStatus = normalizeTechnicianStatus(nextStatusRaw)
    const currentStatus = normalizeTechnicianStatus(tech.status)
    if (!tech?.id || !nextStatus || nextStatus === currentStatus) return

    setSavingStatusById((prev) => ({ ...prev, [tech.id]: true }))
    try {
      const response = await api.patch(`/technicians/technician/${tech.id}/`, {
        status: nextStatus,
      })
      const updated = response?.data
      setTechnicians((prev) =>
        prev.map((item) => {
          if (item.id !== tech.id) return item
          return {
            ...item,
            status: updated?.status || nextStatus,
            status_display: updated?.status_display || toStatusLabel(updated?.status || nextStatus),
            status_info: updated?.status_info || item.status_info,
          }
        })
      )
      toast.success('Durum güncellendi.')
      setEditingStatusId(null)
    } catch (error) {
      toast.error(readApiError(error, 'Durum güncellenemedi.'))
    } finally {
      setSavingStatusById((prev) => ({ ...prev, [tech.id]: false }))
    }
  }

  const handleRestore = async (id) => {
    if (!window.confirm('Bu teknisyeni tekrar aktif etmek istediginize emin misiniz?')) return

    try {
      await api.post(`/technicians/technician/${id}/restore/`)
      toast.success('Teknisyen tekrar aktif edildi.')
      fetchTechnicians(true)
    } catch (error) {
      toast.error(readApiError(error, 'Teknisyen aktif edilemedi.'))
    }
  }

  const openPermissionModal = async (tech) => {
    setSelectedTechnician(tech)
    setPermissionForm(normalizePermissions(tech.permissions))
    setShowPermissionModal(true)
    setIsPermissionLoading(true)

    try {
      const response = await api.get(`/technicians/technician/${tech.id}/permissions/`)
      setPermissionForm(normalizePermissions(response.data))
    } catch (error) {
      toast.error(readApiError(error, 'Yetkiler yüklenemedi.'))
    } finally {
      setIsPermissionLoading(false)
    }
  }

  const handlePermissionFormToggle = (key, value) => {
    setPermissionForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSavePermissions = async () => {
    if (!selectedTechnician) return

    setIsSavingPermissions(true)
    try {
      await api.patch(`/technicians/technician/${selectedTechnician.id}/permissions/`, permissionForm)
      toast.success('Yetkiler güncellendi.')
      setShowPermissionModal(false)
      fetchTechnicians(true)
    } catch (error) {
      toast.error(readApiError(error, 'Yetkiler kaydedilemedi.'))
    } finally {
      setIsSavingPermissions(false)
    }
  }

  const openLocationModal = async (tech) => {
    setSelectedTechnician(tech)
    setShowLocationModal(true)
    setIsLocationLoading(true)
    setLocationRows([])
      setLocationDate('')
      setActiveLocationIndex(0)
      setLocationRouteStatus('idle')
      setLocationRouteDistanceKm(null)
      markerRefs.current = {}

    try {
      const response = await api.get(`/technicians/technician/${tech.id}/locations/`)
      setLocationRows(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      toast.error(readApiError(error, 'Konum geçmişi yüklenemedi.'))
    } finally {
      setIsLocationLoading(false)
    }
  }

  const loadAttendance = async (technicianId, monthValue) => {
    setIsAttendanceLoading(true)
    try {
      const response = await api.get('/technicians/attendance/', {
        params: { technician: technicianId, month: monthValue },
      })
      setAttendanceRows(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      toast.error(readApiError(error, 'Devam takvimi yüklenemedi.'))
      setAttendanceRows([])
    } finally {
      setIsAttendanceLoading(false)
    }
  }

  const openAttendanceModal = async (tech) => {
    const monthValue = getCurrentMonthValue()
    setSelectedTechnician(tech)
    setAttendanceMonth(monthValue)
    setSelectedAttendanceDate('')
    setAttendanceForm({
      id: '',
      status: 'worked',
      start_time: '09:00',
      end_time: '18:00',
      note: '',
      is_derived: false,
    })
    setShowAttendanceModal(true)
    await loadAttendance(tech.id, monthValue)
  }

  const openTechnicianServicesModal = async (tech) => {
    setSelectedTechnician(tech)
    setShowServicesModal(true)
    setIsTechnicianServicesLoading(true)
    setTechnicianServices([])
    try {
      const response = await api.get('/services/admin-services/', {
        params: {
          technician: tech.id,
          page_size: 200,
        },
      })
      const rows = Array.isArray(response?.data?.results)
        ? response.data.results
        : Array.isArray(response?.data)
          ? response.data
          : []
      setTechnicianServices(rows)
    } catch (error) {
      toast.error(readApiError(error, 'Teknisyen servis listesi yüklenemedi.'))
      setTechnicianServices([])
    } finally {
      setIsTechnicianServicesLoading(false)
    }
  }

  const goToServiceDetail = (serviceId) => {
    if (!serviceId) return
    const target = technicianServices.find((svc) => svc.id === serviceId) || { id: serviceId }
    setShowServicesModal(false)
    setSelectedServiceForDetail(target)
    setShowServiceDetailModal(true)
  }

  const openServiceDetailModal = (svc) => {
    if (!svc || !svc.id) return
    setShowServicesModal(false)
    setSelectedServiceForDetail(svc)
    setShowServiceDetailModal(true)
  }

  const closeServiceDetailModal = () => {
    setShowServiceDetailModal(false)
    setSelectedServiceForDetail(null)
  }

  const calculateShiftDuration = (row) => {
    if (!row?.start_time || !row?.end_time) return '-'
    const start = new Date(row.start_time)
    const end = new Date(row.end_time)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return '-'
    const diffMinutes = Math.round((end.getTime() - start.getTime()) / 60000)
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    return `${hours}s ${minutes}dk`
  }

  const loadShiftHistory = async (techId, monthValue) => {
    setIsShiftHistoryLoading(true)
    try {
      const response = await api.get('/technicians/shifts/', {
        params: {
          technician: techId,
          month: monthValue,
        },
      })
      setShiftHistoryRows(Array.isArray(response?.data) ? response.data : [])
    } catch (error) {
      toast.error(readApiError(error, 'Mesai geçmişi yüklenemedi.'))
      setShiftHistoryRows([])
    } finally {
      setIsShiftHistoryLoading(false)
    }
  }

  const buildShiftHistoryMonthValue = (year, monthNumber) => {
    return `${year}-${String(monthNumber).padStart(2, '0')}`
  }

  const updateShiftHistoryPeriod = async (nextYear, nextMonthNumber) => {
    setShiftHistoryYear(nextYear)
    setShiftHistoryMonthNumber(nextMonthNumber)
    if (selectedTechnician?.id) {
      await loadShiftHistory(selectedTechnician.id, buildShiftHistoryMonthValue(nextYear, nextMonthNumber))
    }
  }

  const moveShiftHistoryMonth = async (offset) => {
    const base = new Date(shiftHistoryYear, shiftHistoryMonthNumber - 1, 1)
    base.setMonth(base.getMonth() + offset)
    await updateShiftHistoryPeriod(base.getFullYear(), base.getMonth() + 1)
  }

  const moveShiftHistoryYear = async (offset) => {
    const nextYear = shiftHistoryYear + offset
    await updateShiftHistoryPeriod(nextYear, shiftHistoryMonthNumber)
  }

  const openShiftHistoryModal = async (tech) => {
    const now = new Date()
    const year = now.getFullYear()
    const monthNumber = now.getMonth() + 1
    setSelectedTechnician(tech)
    setShiftHistoryYear(year)
    setShiftHistoryMonthNumber(monthNumber)
    setShowShiftHistoryModal(true)
    await loadShiftHistory(tech.id, buildShiftHistoryMonthValue(year, monthNumber))
  }

  const handleAttendanceDaySelect = (dayIso) => {
    setSelectedAttendanceDate(dayIso)

    const row = attendanceRows.find((item) => item.date === dayIso)
    if (!row) {
      setAttendanceForm({
        id: '',
        status: 'worked',
        start_time: '09:00',
        end_time: '18:00',
        note: '',
        is_derived: false,
      })
      return
    }

    setAttendanceForm({
      id: row.id || '',
      status: row.status || 'worked',
      start_time: row.start_time ? String(row.start_time).slice(0, 5) : '09:00',
      end_time: row.end_time ? String(row.end_time).slice(0, 5) : '18:00',
      note: row.note || '',
      is_derived: Boolean(row.is_derived),
    })
  }

  const handleSaveAttendance = async () => {
    if (!selectedTechnician || !selectedAttendanceDate) {
      toast.error('Lütfen takvimden bir gün seçin.')
      return
    }

    setIsSavingAttendance(true)
    try {
      const payload = {
        technician: selectedTechnician.id,
        date: selectedAttendanceDate,
        status: attendanceForm.status,
        note: attendanceForm.note || '',
      }

      if (attendanceForm.status === 'worked') {
        payload.start_time = attendanceForm.start_time || '09:00'
        payload.end_time = attendanceForm.end_time || '18:00'
      }

      await api.post('/technicians/attendance/', payload)
      toast.success('Devam kaydı güncellendi.')
      await loadAttendance(selectedTechnician.id, attendanceMonth)
    } catch (error) {
      toast.error(readApiError(error, 'Devam kaydı kaydedilemedi.'))
    } finally {
      setIsSavingAttendance(false)
    }
  }

  const handleDeleteAttendance = async () => {
    if (!isUuid(attendanceForm.id)) {
      toast.error('Silinebilir bir kayıt bulunamadı.')
      return
    }

    if (!window.confirm('Seçili gün kaydı silinsin mi?')) return

    setIsSavingAttendance(true)
    try {
      await api.delete(`/technicians/attendance/${attendanceForm.id}/`)
      toast.success('Devam kaydı silindi.')
      setAttendanceForm({
        id: '',
        status: 'worked',
        start_time: '09:00',
        end_time: '18:00',
        note: '',
        is_derived: false,
      })
      await loadAttendance(selectedTechnician.id, attendanceMonth)
    } catch (error) {
      toast.error(readApiError(error, 'Kayıt silinemedi.'))
    } finally {
      setIsSavingAttendance(false)
    }
  }

  const activeTechnicians = useMemo(
    () => technicians.filter((item) => item.user?.is_active),
    [technicians]
  )

  const inactiveTechnicians = useMemo(
    () => technicians.filter((item) => !item.user?.is_active),
    [technicians]
  )

  const onlineCount = useMemo(
    () => activeTechnicians.filter((item) => item.is_online).length,
    [activeTechnicians]
  )

  const offDutyCount = useMemo(
    () => activeTechnicians.filter((item) => normalizeTechnicianStatus(item.status) === 'offduty').length,
    [activeTechnicians]
  )

  const displayedTechnicians = useMemo(() => {
    let list
    if (filterType === 'active') list = activeTechnicians
    else if (filterType === 'online') list = activeTechnicians.filter((item) => item.is_online)
    else if (filterType === 'offduty') list = activeTechnicians.filter((item) => normalizeTechnicianStatus(item.status) === 'offduty')
    else if (filterType === 'inactive') list = inactiveTechnicians
    else list = technicians

    const term = String(searchTerm || '').trim().toLocaleLowerCase('tr-TR')
    if (term) {
      list = list.filter((tech) => {
        const fullName = tech.user?.full_name
          || `${tech.user?.first_name || ''} ${tech.user?.last_name || ''}`.trim()
        const haystack = [
          fullName,
          tech.user?.email,
          tech.user?.phone_number,
          resolveTechnicianStatusLabel(tech),
        ].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR')
        return haystack.includes(term)
      })
    }

    return [...list].sort(compareTechniciansTr)
  }, [activeTechnicians, filterType, inactiveTechnicians, searchTerm, technicians])

  const orderedLocationRows = useMemo(() => normalizeLocationRows(locationRows), [locationRows])
  const locationDateOptions = useMemo(() => {
    const dateKeys = [...new Set(orderedLocationRows.map((row) => getDateKey(row.created_at)).filter(Boolean))]
    return dateKeys.sort((a, b) => b.localeCompare(a))
  }, [orderedLocationRows])
  const filteredLocationRows = useMemo(() => {
    const rows = locationDate
      ? orderedLocationRows.filter((row) => getDateKey(row.created_at) === locationDate)
      : orderedLocationRows
    return rows
  }, [locationDate, orderedLocationRows])
  const locationPositions = useMemo(
    () => filteredLocationRows.map((row) => [row.latitudeNumber, row.longitudeNumber]),
    [filteredLocationRows]
  )
  const mapCenter = locationPositions[0] || defaultMapCenter
  const totalLocationDistanceKm = useMemo(() => sumLocationDistanceKm(filteredLocationRows), [filteredLocationRows])
  const displayedDistanceKm = locationRouteDistanceKm ?? totalLocationDistanceKm
  const googleDirectionsUrl = useMemo(() => buildGoogleDirectionsUrl(filteredLocationRows), [filteredLocationRows])
  const activeLocationRow = filteredLocationRows[activeLocationIndex] || filteredLocationRows[0] || null
  const activeExternalRouteUrl = useMemo(
    () => buildGoogleExternalNavigationUrl(activeLocationRow),
    [activeLocationRow]
  )

  useEffect(() => {
    if (!locationDate && locationDateOptions.length > 0) {
      setLocationDate(locationDateOptions[0])
    }
  }, [locationDate, locationDateOptions])

  useEffect(() => {
    setActiveLocationIndex(0)
    setLocationRouteStatus('idle')
    setLocationRouteDistanceKm(null)
  }, [locationDate])

  const goLocationDateByDays = (dayOffset) => {
    setLocationDate((current) => shiftDateKey(current || locationDateOptions[0] || getDateKey(new Date()), dayOffset))
  }

  const focusLocationMarker = (index) => {
    setActiveLocationIndex(index)
    markerRefs.current[index]?.openPopup?.()
  }

  const attendanceByDate = useMemo(() => {
    const map = {}
    attendanceRows.forEach((row) => {
      if (row.date) {
        map[row.date] = row
      }
    })
    return map
  }, [attendanceRows])

  const attendanceCalendarCells = useMemo(() => buildCalendarCells(attendanceMonth), [attendanceMonth])
  const goToWorkingHours = (technicianId) => {
    const monthValue = getCurrentMonthValue()
    const query = technicianId
      ? `?technician=${encodeURIComponent(technicianId)}&month=${encodeURIComponent(monthValue)}`
      : `?month=${encodeURIComponent(monthValue)}`
    navigate(`/dashboard/working-hours${query}`)
  }

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <h3 className="fw-bold m-0 text-light">
          <FaUserCog className="me-2 text-primary" /> Teknisyenler
        </h3>
        <div className="d-flex gap-2 flex-grow-1 justify-content-md-end align-items-center flex-wrap" style={{ maxWidth: '100%' }}>
          <InputGroup style={{ maxWidth: '360px' }}>
            <InputGroup.Text className="bg-light border-end-0">
              <FaSearch className="text-muted" />
            </InputGroup.Text>
            <Form.Control
              placeholder="İsim, e-posta, telefon veya durum ile ara..."
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
          <Button variant="outline-info" onClick={() => goToWorkingHours()}>
            <FaCalendarAlt className="me-1" /> Mesai Saatleri
          </Button>
          <Button variant="outline-light" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? <Spinner size="sm" animation="border" className="me-2" /> : null}
            Yenile
          </Button>
          <Button variant="primary" onClick={openCreateModal}>
            <FaPlus className="me-1" /> Yeni Teknisyen
          </Button>
        </div>
      </div>

      <Row className="g-3 mb-4">
        <Col lg={3} md={6}>
          <Card
            onClick={() => setFilterType('active')}
            className="border-0 shadow-sm rounded-3 h-100 p-3"
            style={{
              borderLeft: '4px solid #2196F3',
              cursor: 'pointer',
              opacity: filterType === 'active' ? 1 : 0.6,
              transform: filterType === 'active' ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.2s',
            }}
          >
            <div className="text-muted fw-bold mb-2" style={{ fontSize: '0.85rem' }}>AKTİF TEKNİSYEN</div>
            <h3 className="fw-bold m-0">{activeTechnicians.length}</h3>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card
            onClick={() => setFilterType('online')}
            className="border-0 shadow-sm rounded-3 h-100 p-3"
            style={{
              borderLeft: '4px solid #4CAF50',
              cursor: 'pointer',
              opacity: filterType === 'online' ? 1 : 0.6,
              transform: filterType === 'online' ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.2s',
            }}
          >
            <div className="text-muted fw-bold mb-2" style={{ fontSize: '0.85rem' }}>ÇEVRİMİÇİ</div>
            <h3 className="fw-bold m-0 text-success">{onlineCount}</h3>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card
            onClick={() => setFilterType('offduty')}
            className="border-0 shadow-sm rounded-3 h-100 p-3"
            style={{
              borderLeft: '4px solid #FF9800',
              cursor: 'pointer',
              opacity: filterType === 'offduty' ? 1 : 0.6,
              transform: filterType === 'offduty' ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.2s',
            }}
          >
            <div className="text-muted fw-bold mb-2" style={{ fontSize: '0.85rem' }}>İZİNLİ</div>
            <h3 className="fw-bold m-0 text-warning">{offDutyCount}</h3>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card
            onClick={() => setFilterType('inactive')}
            className="border-0 shadow-sm rounded-3 h-100 p-3"
            style={{
              borderLeft: '4px solid #6c757d',
              cursor: 'pointer',
              opacity: filterType === 'inactive' ? 1 : 0.6,
              transform: filterType === 'inactive' ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.2s',
            }}
          >
            <div className="text-muted fw-bold mb-2" style={{ fontSize: '0.85rem' }}>PASİF KAYIT</div>
            <h3 className="fw-bold m-0 text-secondary">{inactiveTechnicians.length}</h3>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm rounded-3">
        <div className="bg-light p-3 border-bottom d-flex justify-content-between align-items-center rounded-top">
          <div className="fw-semibold text-muted">
            {filterType === 'active' && 'Aktif teknisyenler'}
            {filterType === 'online' && 'Çevrimiçi teknisyenler'}
            {filterType === 'offduty' && 'İzinli teknisyenler'}
            {filterType === 'inactive' && 'Pasif teknisyenler'}
          </div>
          <Button variant="outline-secondary" size="sm" onClick={() => setFilterType('active')}>
            Sıfırla
          </Button>
        </div>

        <Card.Body className="p-0">
          {isLoading ? (
            <div className="text-center p-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : displayedTechnicians.length === 0 ? (
            <div className="text-center p-5 text-muted">
              {searchTerm
                ? `"${searchTerm}" ile eşleşen teknisyen bulunamadı.`
                : filterType === 'inactive'
                  ? 'Pasif teknisyen kaydı bulunmuyor.'
                  : 'Bu filtrede teknisyen bulunmuyor.'}
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="m-0 align-middle">
                <thead className="bg-light">
                  <tr>
                    <th className="px-3 py-3 text-center" style={{ width: '60px' }}>#</th>
                    <th className="px-4 py-3">Teknisyen</th>
                    <th className="py-3">Durum</th>
                    <th className="py-3">Çevrimiçi</th>
                    <th className="py-3">İşe Başlama</th>
                    <th className="py-3">Son Görülme</th>
                    <th className="text-end px-4 py-3" style={{ minWidth: '360px' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTechnicians.map((tech, index) => {
                    const fullName = tech.user?.full_name || `${tech.user?.first_name || ''} ${tech.user?.last_name || ''}`.trim()
                    const normalizedStatus = normalizeTechnicianStatus(tech.status)
                    const optionColor = statusOptions.find((item) => normalizeTechnicianStatus(item.value) === normalizedStatus)?.color
                    const resolvedStatusColor = String(tech.status_info?.color || optionColor || '#6b7280').trim() || '#6b7280'
                    return (
                      <tr key={tech.id}>
                        <td className="px-3 text-center text-muted fw-medium">{index + 1}</td>
                        <td className="px-4">
                          <div className="fw-medium">{fullName || '-'}</div>
                          <small className="text-muted d-block">{tech.user?.email || '-'}</small>
                          <small className="text-muted d-block">{tech.user?.phone_number || '-'}</small>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {editingStatusId === tech.id ? (
                              <Form.Select
                                size="sm"
                                autoFocus
                                value={normalizeTechnicianStatus(tech.status)}
                                disabled={!tech.user?.is_active || Boolean(savingStatusById[tech.id])}
                                onBlur={() => setEditingStatusId(null)}
                                onChange={(event) => handleQuickStatusChange(tech, event.target.value)}
                                style={{ maxWidth: 160 }}
                              >
                                {statusOptions.map((item) => (
                                  <option key={item.value} value={item.value}>
                                    {toStatusLabel(item.label || item.value)}
                                  </option>
                                ))}
                              </Form.Select>
                            ) : (
                              <button
                                type="button"
                                className="badge border-0"
                                disabled={!tech.user?.is_active || Boolean(savingStatusById[tech.id])}
                                onClick={() => setEditingStatusId(tech.id)}
                                style={{
                                  backgroundColor: resolvedStatusColor,
                                  color: '#fff',
                                  border: '1px solid rgba(0,0,0,0.08)',
                                  cursor: tech.user?.is_active ? 'pointer' : 'default',
                                }}
                                title={tech.user?.is_active ? 'Durumu değiştirmek için tıklayın' : 'Pasif teknisyen'}
                              >
                                {resolveTechnicianStatusLabel(tech)}
                              </button>
                            )}
                            {savingStatusById[tech.id] ? <Spinner animation="border" size="sm" /> : null}
                          </div>
                        </td>
                        <td>
                          <Badge bg={tech.is_online ? 'success' : 'secondary'}>
                            {tech.is_online ? 'Çevrimiçi' : 'Çevrimdışı'}
                          </Badge>
                        </td>
                        <td>{formatDate(tech.hire_date)}</td>
                        <td>{formatDateTime(tech.last_online)}</td>
                        <td className="text-end px-4">
                          <div className="d-flex flex-wrap justify-content-end gap-1">
                          {tech.user?.is_active ? (
                            <>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => openEditModal(tech)}
                              >
                                Düzenle
                              </Button>
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => openPermissionModal(tech)}
                              >
                                Yetkiler
                              </Button>
                              <Button
                                variant="outline-dark"
                                size="sm"
                                onClick={() => openTechnicianServicesModal(tech)}
                              >
                                Servisler
                              </Button>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => openShiftHistoryModal(tech)}
                              >
                                Mesai Geçmişi
                              </Button>
                              <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => goToWorkingHours(tech.id)}
                              >
                                Mesai Saatleri
                              </Button>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => openAttendanceModal(tech)}
                              >
                                Mesai/İzin
                              </Button>
                              <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => openLocationModal(tech)}
                              >
                                Konum Geçmişi
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeactivate(tech.id)}
                              >
                                Pasife Al
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="success"
                              size="sm"
                              className="border-0"
                              onClick={() => handleRestore(tech.id)}
                            >
                              <FaUndo className="me-2" /> Geri Getir
                            </Button>
                          )}
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

      <Modal show={showModal} onHide={closeFormModal} backdrop="static" size="lg">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editingTechnicianId ? 'Teknisyen Düzenle' : 'Yeni Teknisyen Ekle'}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="px-4">
            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Ad *</Form.Label>
                  <Form.Control
                    required
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleFieldChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Soyad *</Form.Label>
                  <Form.Control
                    required
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleFieldChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">E-posta *</Form.Label>
                  <Form.Control
                    required
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFieldChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Telefon</Form.Label>
                  <Form.Control
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleFieldChange}
                    placeholder="+90 5xx xxx xx xx"
                  />
                </Form.Group>
              </Col>
              {!editingTechnicianId && (
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Geçici Şifre *</Form.Label>
                    <Form.Control
                      required
                      type="text"
                      name="password"
                      value={formData.password}
                      onChange={handleFieldChange}
                      placeholder="Teknisyenin geçici erişim şifresi"
                    />
                  </Form.Group>
                </Col>
              )}
              <Col md={editingTechnicianId ? 6 : 3}>
                <Form.Group>
                  <Form.Label className="fw-semibold">İşe Alım Tarihi</Form.Label>
                  <Form.Control
                    type="date"
                    name="hire_date"
                    value={formData.hire_date}
                    onChange={handleFieldChange}
                  />
                </Form.Group>
              </Col>
              <Col md={editingTechnicianId ? 6 : 3}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Durum</Form.Label>
                  <Form.Select name="status" value={formData.status} onChange={handleFieldChange}>
                    {statusOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <div className="border rounded-3 p-3 bg-light">
              <div className="fw-semibold mb-2">Yetkiler</div>
              <Row className="g-2">
                {permissionLabels.map((permissionItem) => (
                  <Col md={6} key={permissionItem.key}>
                    <Form.Check
                      type="switch"
                      label={permissionItem.label}
                      checked={Boolean(formData.permissions[permissionItem.key])}
                      onChange={(event) => handlePermissionToggle(permissionItem.key, event.target.checked)}
                    />
                  </Col>
                ))}
              </Row>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeFormModal} disabled={isSubmitting}>İptal</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner size="sm" animation="border" /> : 'Kaydet'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showPermissionModal} onHide={() => setShowPermissionModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            Yetkiler - {selectedTechnician?.user?.full_name || selectedTechnician?.user?.email || ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isPermissionLoading ? (
            <div className="text-center py-3">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {permissionLabels.map((permissionItem) => (
                <Form.Check
                  key={permissionItem.key}
                  type="switch"
                  label={permissionItem.label}
                  checked={Boolean(permissionForm[permissionItem.key])}
                  onChange={(event) => handlePermissionFormToggle(permissionItem.key, event.target.checked)}
                />
              ))}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPermissionModal(false)} disabled={isSavingPermissions}>Kapat</Button>
          <Button variant="primary" onClick={handleSavePermissions} disabled={isPermissionLoading || isSavingPermissions}>
            {isSavingPermissions ? <Spinner size="sm" animation="border" /> : 'Kaydet'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showServicesModal} onHide={() => setShowServicesModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            Yapılan Servisler - {selectedTechnician?.user?.full_name || selectedTechnician?.user?.email || ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {isTechnicianServicesLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : technicianServices.length === 0 ? (
            <div className="text-center py-5 text-muted">Bu teknisyene ait servis bulunamadı.</div>
          ) : (
            <div className="table-responsive">
              <Table hover className="m-0 align-middle">
                <thead className="bg-light">
                  <tr>
                    <th className="px-3">Fiş No</th>
                    <th>Müşteri</th>
                    <th>Durum</th>
                    <th>Randevu</th>
                    <th className="text-end px-3">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {technicianServices.map((svc) => (
                      <tr
                        key={svc.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => openServiceDetailModal(svc)}
                        title="Servis detayını görmek için tıklayın"
                        className="technician-service-row"
                      >
                        <td className="px-3 fw-semibold">{svc.receipt_number || '-'}</td>
                        <td>{svc.customer_full_name || '-'}</td>
                        <td>
                          <Badge bg="secondary">
                            {svc.status_name || svc.service_status_display || svc.service_status_name || svc.service_status || '-'}
                          </Badge>
                        </td>
                        <td>{formatDateTime(svc.scheduled_date)}</td>
                        <td className="text-end px-3">
                          <Button size="sm" variant="outline-primary" onClick={(event) => { event.stopPropagation(); openServiceDetailModal(svc); }}>
                            Detaya Git
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
      </Modal>

      <ServiceDetailModal
        show={showServiceDetailModal}
        serviceId={selectedServiceForDetail?.id}
        initialService={selectedServiceForDetail}
        onClose={closeServiceDetailModal}
      />

      <style>{`
        .technician-service-row:hover {
          background-color: rgba(33, 150, 243, 0.08);
        }
      `}</style>

      <Modal show={showShiftHistoryModal} onHide={() => setShowShiftHistoryModal(false)} size="xl" scrollable centered>
        <Modal.Header closeButton className="shift-history-header">
          <div className="d-flex align-items-center gap-3">
            <div className="shift-history-avatar" aria-hidden>
              {(() => {
                const fullName = selectedTechnician?.user?.full_name
                  || `${selectedTechnician?.user?.first_name || ''} ${selectedTechnician?.user?.last_name || ''}`.trim()
                  || selectedTechnician?.user?.email
                  || '?'
                const parts = fullName.split(/\s+/).filter(Boolean)
                if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
              })()}
            </div>
            <div>
              <div className="shift-history-eyebrow">Mesai Geçmişi</div>
              <Modal.Title className="shift-history-title m-0">
                {selectedTechnician?.user?.full_name || selectedTechnician?.user?.email || '-'}
              </Modal.Title>
              <div className="shift-history-subtitle">
                <FaCalendarAlt className="me-2" />
                {monthNameOptions[shiftHistoryMonthNumber - 1] || '-'} {shiftHistoryYear}
              </div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="shift-history-body">
          <Card className="shift-history-toolbar border-0 shadow-sm mb-3">
            <Card.Body className="py-3">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="shift-history-period">
                    <Button
                      variant="light"
                      className="shift-history-nav-btn"
                      onClick={() => moveShiftHistoryMonth(-1)}
                      disabled={isShiftHistoryLoading}
                      title="Onceki ay"
                    >
                      <FaChevronLeft />
                    </Button>
                    <div className="shift-history-period-label">
                      <span className="shift-history-period-month">
                        {monthNameOptions[shiftHistoryMonthNumber - 1] || '-'}
                      </span>
                      <span className="shift-history-period-year">{shiftHistoryYear}</span>
                    </div>
                    <Button
                      variant="light"
                      className="shift-history-nav-btn"
                      onClick={() => moveShiftHistoryMonth(1)}
                      disabled={isShiftHistoryLoading}
                      title="Sonraki ay"
                    >
                      <FaChevronRight />
                    </Button>
                  </div>
                  <div className="shift-history-divider d-none d-md-block" />
                  <div className="shift-history-period">
                    <Button
                      variant="light"
                      className="shift-history-nav-btn"
                      onClick={() => moveShiftHistoryYear(-1)}
                      disabled={isShiftHistoryLoading}
                      title="Onceki yil"
                    >
                      <FaChevronLeft />
                    </Button>
                    <div className="shift-history-period-label" style={{ minWidth: 70 }}>
                      <span className="shift-history-period-year">{shiftHistoryYear}</span>
                    </div>
                    <Button
                      variant="light"
                      className="shift-history-nav-btn"
                      onClick={() => moveShiftHistoryYear(1)}
                      disabled={isShiftHistoryLoading}
                      title="Sonraki yil"
                    >
                      <FaChevronRight />
                    </Button>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Badge bg="primary" pill className="shift-history-pill">
                    {shiftHistoryRows.length} Kayıt
                  </Badge>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => selectedTechnician?.id && loadShiftHistory(selectedTechnician.id, buildShiftHistoryMonthValue(shiftHistoryYear, shiftHistoryMonthNumber))}
                    disabled={isShiftHistoryLoading}
                  >
                    <FaSyncAlt className={isShiftHistoryLoading ? 'fa-spin me-2' : 'me-2'} />
                    Yenile
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>

          {(() => {
            const summary = shiftHistoryRows.reduce(
              (acc, row) => {
                if (row?.end_time) acc.completed += 1
                else acc.ongoing += 1
                if (row?.start_time && row?.end_time) {
                  const start = new Date(row.start_time)
                  const end = new Date(row.end_time)
                  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start) {
                    acc.totalMinutes += Math.round((end.getTime() - start.getTime()) / 60000)
                  }
                }
                return acc
              },
              { completed: 0, ongoing: 0, totalMinutes: 0 },
            )
            const totalHours = Math.floor(summary.totalMinutes / 60)
            const totalMins = summary.totalMinutes % 60
            const summaryCards = [
              { label: 'Toplam Mesai', value: `${totalHours}s ${totalMins}dk`, icon: <FaClock />, tone: 'primary' },
              { label: 'Tamamlanan', value: summary.completed, icon: <FaCheckCircle />, tone: 'success' },
              { label: 'Devam Eden', value: summary.ongoing, icon: <FaPlay />, tone: 'warning' },
              { label: 'Kayıt', value: shiftHistoryRows.length, icon: <FaHistory />, tone: 'info' },
            ]
            return (
              <Row className="g-2 mb-3">
                {summaryCards.map((card) => (
                  <Col xs={6} md={3} key={card.label}>
                    <div className={`shift-history-stat shift-history-stat--${card.tone}`}>
                      <div className="shift-history-stat-icon">{card.icon}</div>
                      <div>
                        <div className="shift-history-stat-value">{card.value}</div>
                        <div className="shift-history-stat-label">{card.label}</div>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            )
          })()}

          {isShiftHistoryLoading ? (
            <div className="shift-history-loading">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : shiftHistoryRows.length === 0 ? (
            <div className="shift-history-empty">
              <FaHistory className="shift-history-empty-icon" />
              <div className="shift-history-empty-title">Mesai kaydı bulunamadı</div>
              <div className="shift-history-empty-text">
                Seçilen donem icin bu teknisyene ait mesai kaydı yok.
              </div>
            </div>
          ) : (
            <div className="table-responsive shift-history-table-wrap">
              <Table hover className="shift-history-table align-middle mb-0">
                <thead>
                  <tr>
                    <th><FaCalendarAlt className="me-2" />Tarih</th>
                    <th><FaSignInAlt className="me-2" />Baslangic</th>
                    <th><FaSignOutAlt className="me-2" />Bitis</th>
                    <th><FaClock className="me-2" />Toplam Sure</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftHistoryRows.map((row) => (
                    <tr key={row.id}>
                      <td className="fw-semibold">{formatDate(row.date)}</td>
                      <td>{formatDateTime(row.start_time)}</td>
                      <td>{formatDateTime(row.end_time)}</td>
                      <td className="fw-semibold">{calculateShiftDuration(row)}</td>
                      <td>
                        <Badge bg={row.end_time ? 'success' : 'warning'} className="shift-history-status">
                          {row.end_time ? (
                            <><FaCheckCircle className="me-1" /> Tamamlandı</>
                          ) : (
                            <><FaPlay className="me-1" /> Devam ediyor</>
                          )}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={showLocationModal} onHide={() => setShowLocationModal(false)} size="xl" fullscreen="md-down" dialogClassName="technician-location-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            Konum Geçmişi - {selectedTechnician?.user?.full_name || selectedTechnician?.user?.email || ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3" style={{ maxHeight: 'calc(90vh - 76px)', overflowY: 'auto' }}>
          {isLocationLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : orderedLocationRows.length === 0 ? (
            <div className="text-center py-4 text-muted">Kayıtlı konum geçmişi bulunmuyor.</div>
          ) : (
            <div>
              <Row className="g-2 mb-3">
                <Col lg={3} md={6}>
                  <Form.Group>
                    <Form.Label className="small text-muted mb-1">Gün filtresi</Form.Label>
                    <Form.Control
                      type="date"
                      value={locationDate}
                      onChange={(event) => setLocationDate(event.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col lg={2} md={3} className="d-flex align-items-end">
                  <Button variant="outline-secondary" className="w-100" onClick={() => goLocationDateByDays(-1)}>
                    <FaChevronLeft className="me-1" /> Önceki
                  </Button>
                </Col>
                <Col lg={2} md={3} className="d-flex align-items-end">
                  <Button variant="outline-secondary" className="w-100" onClick={() => goLocationDateByDays(1)}>
                    Sonraki <FaChevronRight className="ms-1" />
                  </Button>
                </Col>
                <Col lg={2} md={3} className="d-flex align-items-end">
                  <Button variant="outline-primary" className="w-100" onClick={() => setLocationDate(getDateKey(new Date()))}>
                    Bugün
                  </Button>
                </Col>
                <Col lg={3} md={6} className="d-flex align-items-end">
                  <Form.Select value={locationDate} onChange={(event) => setLocationDate(event.target.value)}>
                    {locationDateOptions.map((dateKey) => (
                      <option key={dateKey} value={dateKey}>
                        {new Date(`${dateKey}T00:00:00`).toLocaleDateString('tr-TR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              </Row>

              <Row className="g-3 mb-3">
                <Col md={4}>
                  <div className="rounded-3 border bg-light p-3 h-100">
                    <div className="small text-muted mb-1">Gün içi kayıt</div>
                    <div className="fw-bold fs-5 d-flex align-items-center gap-2">
                      <FaMapMarkerAlt className="text-primary" />
                      {filteredLocationRows.length}
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="rounded-3 border bg-light p-3 h-100">
                    <div className="small text-muted mb-1">
                      {locationRouteDistanceKm !== null ? 'Surus mesafesi' : 'Sirali mesafe'}
                    </div>
                    <div className="fw-bold fs-5 d-flex align-items-center gap-2">
                      <FaRoute className="text-success" />
                      {formatDistanceKm(displayedDistanceKm)}
                    </div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="rounded-3 border bg-light p-3 h-100">
                    <div className="small text-muted mb-1">Zaman aralığı</div>
                    <div className="small fw-semibold text-dark">
                      {formatDateTime(filteredLocationRows[0]?.created_at)} - {formatDateTime(filteredLocationRows[filteredLocationRows.length - 1]?.created_at)}
                    </div>
                  </div>
                </Col>
              </Row>

              {filteredLocationRows.length === 0 ? (
                <div className="text-center py-4 text-muted border rounded-3 bg-light-subtle">
                  Seçilen gün için konum kaydı bulunmuyor.
                </div>
              ) : (
                <Row className="g-3">
                  <Col lg={8}>
                    <div className="rounded-3 border overflow-hidden" style={{ height: 560 }}>
                      <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <LocationMapBounds positions={locationPositions} />
                        <LocationDrivingRoute
                          positions={locationPositions}
                          onRouteStatusChange={setLocationRouteStatus}
                          onRouteDistanceChange={setLocationRouteDistanceKm}
                        />
                        {filteredLocationRows.map((row, index) => (
                          <Marker
                            key={row.id || `${row.created_at}-${index}`}
                            position={[row.latitudeNumber, row.longitudeNumber]}
                            icon={createOrderMarkerIcon(index + 1, activeLocationIndex === index)}
                            ref={(instance) => {
                              if (instance) markerRefs.current[index] = instance
                            }}
                            eventHandlers={{ click: () => setActiveLocationIndex(index) }}
                          >
                            <Tooltip direction="top" offset={[0, -10]}>
                              {index + 1}. kayıt
                            </Tooltip>
                            <Popup>
                              <div style={{ minWidth: 220 }}>
                                <div className="fw-semibold mb-1">{index + 1}. konum kaydı</div>
                                <div><strong>Adres:</strong> {getLocationAddress(row)}</div>
                                <div><strong>Tarih:</strong> {formatDateTime(row.created_at)}</div>
                                <div><strong>Koordinat:</strong> {row.latitudeNumber}, {row.longitudeNumber}</div>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </MapContainer>
                    </div>
                  </Col>

                  <Col lg={4}>
                    <div className="rounded-3 border d-flex flex-column" style={{ height: 560 }}>
                      <div className="p-3 border-bottom bg-light">
                        <div className="fw-semibold">Günlük Konum Sırası</div>
                        <small className="text-muted">
                          {locationRouteStatus === 'loading' && 'Sürüş rotası hesaplanıyor.'}
                          {locationRouteStatus === 'ready' && 'Sürüş rotası yol ağına göre çizildi.'}
                          {locationRouteStatus === 'error' && 'Sürüş rotası hesaplanamadı. Konum sırası listeleniyor.'}
                          {locationRouteStatus === 'idle' && 'Kayıtlar saat sırasına göre gösterilir.'}
                        </small>
                      </div>
                      <div className="p-3 overflow-auto">
                        {filteredLocationRows.map((row, index) => {
                          const nextDistance = index < filteredLocationRows.length - 1
                            ? distanceBetweenLocationRowsKm(row, filteredLocationRows[index + 1])
                            : null

                          return (
                            <div
                              key={row.id || `${row.created_at}-location-${index}`}
                              className={`border rounded-3 p-2 mb-2 ${activeLocationIndex === index ? 'border-primary bg-primary-subtle' : ''}`}
                              style={{ cursor: 'pointer' }}
                              onClick={() => focusLocationMarker(index)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  focusLocationMarker(index)
                                }
                              }}
                            >
                              <div className="d-flex justify-content-between align-items-start gap-2">
                                <Badge bg="primary" pill>{index + 1}</Badge>
                                <small className="text-muted text-end">{formatDateTime(row.created_at)}</small>
                              </div>
                              <div className="mt-2">
                                <small className="text-muted d-block">Konum</small>
                                <div className="fw-semibold" style={{ fontSize: '0.9rem', lineHeight: 1.3 }}>{getLocationAddress(row)}</div>
                              </div>
                              <small className="text-muted d-block mt-1">
                                {row.latitudeNumber}, {row.longitudeNumber}
                              </small>
                              {nextDistance !== null ? (
                                <div className="mt-2 small text-success">
                                  Sonraki kayda uzaklık: <strong>{formatDistanceKm(nextDistance)}</strong>
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                      {googleDirectionsUrl ? (
                        <div className="p-3 border-top">
                          <div className="d-grid gap-2">
                            <Button as="a" href={googleDirectionsUrl} target="_blank" rel="noreferrer" variant="primary" className="w-100">
                              Google Haritalar'da Yol Tarifi
                            </Button>
                            {activeExternalRouteUrl ? (
                              <Button as="a" href={activeExternalRouteUrl} target="_blank" rel="noreferrer" variant="outline-dark" className="w-100">
                                Dis Haritada Yol Al
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </Col>
                </Row>
              )}
            </div>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={showAttendanceModal} onHide={() => setShowAttendanceModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            Mesai / İzin Takvimi - {selectedTechnician?.user?.full_name || selectedTechnician?.user?.email || ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div className="d-flex align-items-center gap-2">
              <Form.Label className="m-0 fw-semibold">Ay</Form.Label>
              <Form.Control
                type="month"
                value={attendanceMonth}
                style={{ width: '170px' }}
                onChange={async (event) => {
                  const nextMonth = event.target.value
                  setAttendanceMonth(nextMonth)
                  setSelectedAttendanceDate('')
                  if (selectedTechnician?.id) {
                    await loadAttendance(selectedTechnician.id, nextMonth)
                  }
                }}
              />
            </div>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => selectedTechnician?.id && loadAttendance(selectedTechnician.id, attendanceMonth)}
            >
              Yenile
            </Button>
          </div>

          <Row className="g-3">
            <Col lg={8}>
              {isAttendanceLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                </div>
              ) : (
                <div className="border rounded-3 p-2">
                  <div
                    className="d-grid mb-2 text-center text-muted small fw-bold"
                    style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
                  >
                    <div>Pzt</div>
                    <div>Sal</div>
                    <div>Çar</div>
                    <div>Per</div>
                    <div>Cum</div>
                    <div>Cmt</div>
                    <div>Paz</div>
                  </div>

                  <div
                    className="d-grid gap-2"
                    style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
                  >
                    {attendanceCalendarCells.map((cell, index) => {
                      if (!cell) {
                        return <div key={`empty-${index}`} className="border rounded-3" style={{ minHeight: '86px', background: '#f8f9fa' }} />
                      }

                      const row = attendanceByDate[cell.iso]
                      const statusMeta = row ? getAttendanceStatusMeta(row.status) : null
                      const isActive = selectedAttendanceDate === cell.iso

                      return (
                        <button
                          key={cell.iso}
                          type="button"
                          className="border rounded-3 bg-white p-2 text-start"
                          style={{
                            minHeight: '86px',
                            outline: isActive ? '2px solid #0d6efd' : 'none',
                            backgroundColor: cell.weekend ? '#fcfcfc' : '#fff',
                          }}
                          onClick={() => handleAttendanceDaySelect(cell.iso)}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fw-semibold">{cell.day}</span>
                            {row?.source === 'shift' ? <Badge bg="dark">Shift</Badge> : null}
                          </div>
                          {statusMeta ? (
                            <div className="mt-2">
                              <Badge bg={statusMeta.badge}>{statusMeta.label}</Badge>
                            </div>
                          ) : (
                            <div className="mt-2 text-muted small">Kayıt yok</div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </Col>

            <Col lg={4}>
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <h6 className="fw-bold mb-3">Gün Kaydı</h6>
                  {selectedAttendanceDate ? (
                    <>
                      <div className="small text-muted mb-3">
                        Seçili tarih: <strong>{selectedAttendanceDate}</strong>
                      </div>

                      {attendanceForm.is_derived ? (
                        <div className="alert alert-info py-2">
                          Bu gün mesai kaydından otomatik geldi. Üzerine yeni durum kaydedebilirsiniz.
                        </div>
                      ) : null}

                      <Form.Group className="mb-2">
                        <Form.Label>Durum</Form.Label>
                        <Form.Select
                          value={attendanceForm.status}
                          onChange={(event) => setAttendanceForm((prev) => ({ ...prev, status: event.target.value }))}
                        >
                          {attendanceStatusOptions.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>

                      {attendanceForm.status === 'worked' ? (
                        <Row className="g-2 mb-2">
                          <Col>
                            <Form.Group>
                              <Form.Label>Başlangıç</Form.Label>
                              <Form.Control
                                type="time"
                                value={attendanceForm.start_time}
                                onChange={(event) => setAttendanceForm((prev) => ({ ...prev, start_time: event.target.value }))}
                              />
                            </Form.Group>
                          </Col>
                          <Col>
                            <Form.Group>
                              <Form.Label>Bitiş</Form.Label>
                              <Form.Control
                                type="time"
                                value={attendanceForm.end_time}
                                onChange={(event) => setAttendanceForm((prev) => ({ ...prev, end_time: event.target.value }))}
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                      ) : null}

                      <Form.Group className="mb-3">
                        <Form.Label>Not</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={attendanceForm.note}
                          onChange={(event) => setAttendanceForm((prev) => ({ ...prev, note: event.target.value }))}
                        />
                      </Form.Group>

                      <div className="d-flex gap-2">
                        <Button variant="primary" onClick={handleSaveAttendance} disabled={isSavingAttendance}>
                          {isSavingAttendance ? <Spinner size="sm" animation="border" /> : 'Kaydet'}
                        </Button>
                        <Button
                          variant="outline-danger"
                          onClick={handleDeleteAttendance}
                          disabled={isSavingAttendance || !isUuid(attendanceForm.id)}
                        >
                          Sil
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-muted small">
                      Takvimden bir gün seçerek çalışma veya izin kaydı oluşturabilirsiniz.
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Modal.Body>
      </Modal>
    </div>
  )
}

export default Technicians





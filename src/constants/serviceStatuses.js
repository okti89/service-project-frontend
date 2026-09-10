/**
 * Servis durumlari - TEK KAYNAK (single source of truth)
 *
 * Backend `services/models.py` -> `DEFAULT_SERVICE_STATUSES` ile birebir ayni olmali.
 * Yeni durum eklerken / cikarirken / siralama / renk degisikliklerinde
 * her iki tarafi da guncelleyin.
 */

export const SERVICE_STATUS_CODES = Object.freeze({
  NEW: 'new',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  POSTPONED: 'postponed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
})

export const SERVICE_STATUS_LIST = Object.freeze([
  { value: 'new', label: 'Yeni', color: '#16A34A', badge: 'success', isTerminal: false },
  { value: 'assigned', label: 'Atandı', color: '#2563EB', badge: 'info', isTerminal: false },
  { value: 'in_progress', label: 'İşlemde', color: '#F59E0B', badge: 'warning', isTerminal: false },
  { value: 'postponed', label: 'Ertelendi', color: '#7C3AED', badge: 'primary', isTerminal: false },
  { value: 'completed', label: 'Tamamlandı', color: '#16A34A', badge: 'success', isTerminal: true },
  { value: 'cancelled', label: 'İptal Edildi', color: '#DC2626', badge: 'danger', isTerminal: true },
])

export const SERVICE_STATUS_MAP = Object.freeze(
  SERVICE_STATUS_LIST.reduce((acc, item) => {
    acc[item.value] = item
    return acc
  }, {}),
)

export const ACTIVE_SERVICE_STATUS_CODES = Object.freeze(
  SERVICE_STATUS_LIST.filter((item) => !item.isTerminal).map((item) => item.value),
)

export const TERMINAL_SERVICE_STATUS_CODES = Object.freeze(
  SERVICE_STATUS_LIST.filter((item) => item.isTerminal).map((item) => item.value),
)

export function getServiceStatusMeta(code, fallbackList = SERVICE_STATUS_LIST) {
  if (!code) return null
  return (
    SERVICE_STATUS_MAP[code] ||
    fallbackList.find((item) => item.value === code) ||
    { value: code, label: 'Durum belirtilmedi', color: '#6B7280', badge: 'secondary', isTerminal: false }
  )
}

export function getServiceStatusLabel(serviceOrCode, fallbackList = SERVICE_STATUS_LIST) {
  if (serviceOrCode && typeof serviceOrCode === 'object') {
    const displayValue = [
      serviceOrCode.status_name,
      serviceOrCode.service_status_display,
      serviceOrCode.service_status_name,
      serviceOrCode.status_display,
      typeof serviceOrCode.status === 'object' ? (serviceOrCode.status?.name || serviceOrCode.status?.label) : null,
    ].find((value) => String(value || '').trim())

    if (displayValue) return String(displayValue).trim()
    return getServiceStatusMeta(serviceOrCode.service_status, fallbackList)?.label || 'Durum belirtilmedi'
  }

  return getServiceStatusMeta(serviceOrCode, fallbackList)?.label || 'Durum belirtilmedi'
}

export function isActiveServiceStatus(code) {
  return ACTIVE_SERVICE_STATUS_CODES.includes(code)
}

export function isTerminalServiceStatus(code) {
  return TERMINAL_SERVICE_STATUS_CODES.includes(code)
}

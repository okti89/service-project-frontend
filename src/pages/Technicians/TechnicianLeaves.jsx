import { useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Button, ButtonGroup, Card, Col, Form, InputGroup, Row, Spinner } from 'react-bootstrap'
import {
  FaCalendarAlt,
  FaCalendarCheck,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaFilter,
  FaHospital,
  FaListUl,
  FaMoon,
  FaPen,
  FaPlus,
  FaSave,
  FaTrashAlt,
  FaUmbrellaBeach,
  FaUserCog,
} from 'react-icons/fa'
import { toast } from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import api from '../../api/api'
import './TechnicianLeaves.css'

const c = (...codes) => String.fromCharCode(...codes)

const TEXT = {
  heroEyebrow: c(304) + 'zin Y' + c(246) + 'netimi',
  heroTitle: 'Teknisyen ' + c(304) + 'zin ve Devam Takvimi',
  heroFallback: 'Teknisyen se' + c(231) + 'erek kay' + c(305) + 'tlar' + c(305) + ' g' + c(246) + 'r' + c(252) + 'nt' + c(252) + 'leyin',
  filters: 'Filtreler',
  technician: 'Teknisyen',
  month: 'Ay',
  year: 'Y' + c(305) + 'l',
  refresh: 'Yenile',
  newRecord: 'Yeni Kay' + c(305) + 't',
  noTechnician: 'Teknisyen bulunamad' + c(305),
  leaveDay: c(304) + 'zinli G' + c(252) + 'n',
  sickDay: 'Raporlu G' + c(252) + 'n',
  officialHoliday: 'Resmi Tatil',
  absent: 'Devams' + c(305) + 'zl' + c(305) + 'k',
  noRecord: 'Kay' + c(305) + 't yok',
  dayEdit: 'G' + c(252) + 'n D' + c(252) + 'zenleme',
  selectedRecord: 'Se' + c(231) + 'ili Kay' + c(305) + 't',
  chooseDay: 'Takvimden bir g' + c(252) + 'n se' + c(231) + 'in',
  derivedInfo: 'Bu tarih mesai kayd' + c(305) + 'ndan t' + c(252) + 'retilmi' + c(351) + ' g' + c(246) + 'r' + c(252) + 'n' + c(252) + 'yor. ' + c(304) + 'sterseniz izin kayd' + c(305) + ' ile ' + c(252) + 'zerine yazabilirsiniz.',
  status: 'Durum',
  description: 'A' + c(231) + c(305) + 'klama',
  descriptionPlaceholder: c(304) + 'zin nedeni, a' + c(231) + c(305) + 'klama veya not ekleyin',
  save: 'Kaydet',
  sideHelp: 'Takvimden bir g' + c(252) + 'n se' + c(231) + 'erek yeni izin kayd' + c(305) + ' olu' + c(351) + 'turabilir veya mevcut kayd' + c(305) + ' d' + c(252) + 'zenleyebilirsiniz.',
  recentRecords: 'Son Kay' + c(305) + 'tlar',
  noFilteredRecords: 'Se' + c(231) + 'ili filtrelerde kay' + c(305) + 't bulunamad' + c(305) + '.',
  emptyDescription: 'A' + c(231) + c(305) + 'klama girilmemi' + c(351),
  all: 'T' + c(252) + 'm' + c(252),
  leave: c(304) + 'zinli',
  sick: 'Raporlu',
  offday: 'Resmi Tatil',
  absentStatus: 'Devams' + c(305) + 'z',
  worked: c(199) + 'al' + c(305) + c(351) + 't' + c(305),
  loadTechniciansError: 'Teknisyen listesi y' + c(252) + 'klenemedi.',
  loadAttendanceError: c(304) + 'zin ve devams' + c(305) + 'zl' + c(305) + 'k kay' + c(305) + 'tlar' + c(305) + ' y' + c(252) + 'klenemedi.',
  selectTechnicianFirst: 'L' + c(252) + 'tfen ' + c(246) + 'nce bir teknisyen se' + c(231) + 'in.',
  selectDayFirst: 'Takvimden bir g' + c(252) + 'n se' + c(231) + 'in.',
  recordUpdated: 'Kay' + c(305) + 't g' + c(252) + 'ncellendi.',
  recordAdded: 'Yeni kay' + c(305) + 't eklendi.',
  recordSaveError: 'Kay' + c(305) + 't kaydedilemedi.',
  deleteNotPossible: 'Silinebilir bir kay' + c(305) + 't bulunamad' + c(305) + '.',
  deleteConfirm: 'Se' + c(231) + 'ili izin kayd' + c(305) + ' silinsin mi?',
  recordDeleted: 'Kay' + c(305) + 't silindi.',
  recordDeleteError: 'Kay' + c(305) + 't silinemedi.',
  shiftBadge: 'Shift',
}

const MONTH_NAMES = [
  'Ocak',
  c(350) + 'ubat',
  'Mart',
  'Nisan',
  'May' + c(305) + 's',
  'Haziran',
  'Temmuz',
  'A' + c(287) + 'ustos',
  'Eyl' + c(252) + 'l',
  'Ekim',
  'Kas' + c(305) + 'm',
  'Aral' + c(305) + 'k',
]

const STATUS_OPTIONS = [
  { value: 'all', label: TEXT.all },
  { value: 'leave', label: TEXT.leave },
  { value: 'sick', label: TEXT.sick },
  { value: 'offday', label: TEXT.offday },
  { value: 'absent', label: TEXT.absentStatus },
]

const FORM_STATUS_OPTIONS = STATUS_OPTIONS.filter((item) => item.value !== 'all')

const statusMetaMap = {
  leave: {
    label: TEXT.leave,
    badge: 'warning',
    icon: FaUmbrellaBeach,
    accent: '#f59e0b',
    soft: '#fff7e6',
  },
  sick: {
    label: TEXT.sick,
    badge: 'danger',
    icon: FaHospital,
    accent: '#dc2626',
    soft: '#fee2e2',
  },
  offday: {
    label: TEXT.offday,
    badge: 'secondary',
    icon: FaMoon,
    accent: '#6366f1',
    soft: '#eef2ff',
  },
  absent: {
    label: TEXT.absentStatus,
    badge: 'dark',
    icon: FaExclamationTriangle,
    accent: '#0f172a',
    soft: '#e2e8f0',
  },
  worked: {
    label: TEXT.worked,
    badge: 'success',
    icon: FaCalendarCheck,
    accent: '#16a34a',
    soft: '#dcfce7',
  },
}

const WEEKDAY_LABELS = ['Pzt', 'Sal', c(199) + 'ar', 'Per', 'Cum', 'Cmt', 'Paz']

function getCurrentPeriod() {
  const now = new Date()
  return {
    month: String(now.getMonth() + 1).padStart(2, '0'),
    year: String(now.getFullYear()),
  }
}

function buildMonthValue(year, month) {
  return year + '-' + month
}

function readName(tech) {
  return (
    tech?.full_name ||
    tech?.user?.full_name ||
    (String(tech?.user?.first_name || '') + ' ' + String(tech?.user?.last_name || '')).trim() ||
    tech?.user?.email ||
    '-'
  )
}

function getInitials(tech) {
  const name = readName(tech)
  if (!name || name === '-') return '?'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function isUuid(value) {
  if (!value || typeof value !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function getStatusMeta(status) {
  return statusMetaMap[status] || {
    label: status || '-',
    badge: 'secondary',
    icon: FaCalendarCheck,
    accent: '#64748b',
    soft: '#f1f5f9',
  }
}

function buildCalendarCells(monthValue) {
  const parts = String(monthValue || '').split('-')
  const year = Number(parts[0])
  const month = Number(parts[1])
  if (!year || !month) return []

  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const mondayIndex = (firstDay.getDay() + 6) % 7
  const todayIso = new Date().toISOString().slice(0, 10)
  const cells = []

  for (let i = 0; i < mondayIndex; i += 1) cells.push(null)

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day)
    const iso = parts[0] + '-' + parts[1] + '-' + String(day).padStart(2, '0')
    cells.push({
      day,
      iso,
      isToday: iso === todayIso,
      weekend: [0, 6].includes(date.getDay()),
    })
  }

  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function formatDateText(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function TechnicianLeaves() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentPeriod = getCurrentPeriod()
  const initialMonth = searchParams.get('month') || currentPeriod.month
  const initialYear = searchParams.get('year') || currentPeriod.year

  const [technicians, setTechnicians] = useState([])
  const [selectedTechnician, setSelectedTechnician] = useState(searchParams.get('technician') || '')
  const [selectedMonth, setSelectedMonth] = useState(initialMonth)
  const [selectedYear, setSelectedYear] = useState(initialYear)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [attendanceRows, setAttendanceRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [formState, setFormState] = useState({
    id: '',
    status: 'leave',
    note: '',
    isDerived: false,
  })

  const monthValue = buildMonthValue(selectedYear, selectedMonth)

  useEffect(() => {
    const params = {}
    if (selectedTechnician) params.technician = selectedTechnician
    if (selectedMonth) params.month = selectedMonth
    if (selectedYear) params.year = selectedYear
    if (statusFilter && statusFilter !== 'all') params.status = statusFilter
    setSearchParams(params, { replace: true })
  }, [selectedMonth, selectedTechnician, selectedYear, setSearchParams, statusFilter])

  useEffect(() => {
    let active = true

    const loadTechnicians = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await api.get('/technicians/technician-list/')
        const list = Array.isArray(response.data) ? response.data : []
        if (!active) return
        setTechnicians(list)

        if (!selectedTechnician && list.length > 0) {
          setSelectedTechnician(String(list[0].id))
        } else if (selectedTechnician) {
          const exists = list.some((item) => String(item.id) === String(selectedTechnician))
          if (!exists && list.length > 0) {
            setSelectedTechnician(String(list[0].id))
          }
        }
      } catch {
        if (!active) return
        setError(TEXT.loadTechniciansError)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadTechnicians()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedTechnician) return
    let active = true

    const loadAttendance = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await api.get('/technicians/attendance/', {
          params: {
            technician: selectedTechnician,
            month: monthValue,
            include_shift: 'false',
          },
        })
        if (!active) return
        const rows = Array.isArray(response.data) ? response.data : []
        setAttendanceRows(rows)
      } catch {
        if (!active) return
        setAttendanceRows([])
        setError(TEXT.loadAttendanceError)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadAttendance()
    return () => {
      active = false
    }
  }, [monthValue, selectedTechnician])

  useEffect(() => {
    if (!selectedDate) return
    const row = attendanceRows.find((item) => item.date === selectedDate)
    if (row) {
      setFormState({
        id: row.id || '',
        status: row.status || 'leave',
        note: row.note || '',
        isDerived: Boolean(row.is_derived),
      })
    } else {
      setFormState({
        id: '',
        status: 'leave',
        note: '',
        isDerived: false,
      })
    }
  }, [attendanceRows, selectedDate])

  const selectedTechnicianData = useMemo(
    () => technicians.find((item) => String(item.id) === String(selectedTechnician)) || null,
    [selectedTechnician, technicians],
  )

  const attendanceByDate = useMemo(() => {
    const map = {}
    attendanceRows.forEach((row) => {
      if (row?.date) map[row.date] = row
    })
    return map
  }, [attendanceRows])

  const calendarCells = useMemo(() => buildCalendarCells(monthValue), [monthValue])

  const filteredRows = useMemo(() => {
    const rows = [...attendanceRows].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    if (statusFilter === 'all') return rows
    return rows.filter((item) => item.status === statusFilter)
  }, [attendanceRows, statusFilter])

  const metrics = useMemo(() => {
    return attendanceRows.reduce(
      (acc, row) => {
        if (row?.status === 'leave') acc.leave += 1
        if (row?.status === 'sick') acc.sick += 1
        if (row?.status === 'offday') acc.offday += 1
        if (row?.status === 'absent') acc.absent += 1
        return acc
      },
      { leave: 0, sick: 0, offday: 0, absent: 0 },
    )
  }, [attendanceRows])

  const recordCountLabel = filteredRows.length + ' kay' + c(305) + 't'
  const monthTitle = MONTH_NAMES[Number(selectedMonth) - 1] + ' ' + selectedYear

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, index) => String(currentYear - 2 + index))
  }, [])

  const handleMonthStep = (offset) => {
    const base = new Date(Number(selectedYear), Number(selectedMonth) - 1, 1)
    base.setMonth(base.getMonth() + offset)
    setSelectedMonth(String(base.getMonth() + 1).padStart(2, '0'))
    setSelectedYear(String(base.getFullYear()))
    setSelectedDate('')
  }

  const handleSelectDay = (dayIso) => {
    setSelectedDate(dayIso)
  }

  const handleCreateForToday = () => {
    const firstDay = new Date(Number(selectedYear), Number(selectedMonth) - 1, 1)
    const today = new Date()
    if (today.getFullYear() === Number(selectedYear) && today.getMonth() + 1 === Number(selectedMonth)) {
      setSelectedDate(today.toISOString().slice(0, 10))
      return
    }
    firstDay.setDate(1)
    setSelectedDate(firstDay.toISOString().slice(0, 10))
  }

  const reloadAttendance = async () => {
    if (!selectedTechnician) return
    setLoading(true)
    try {
      const response = await api.get('/technicians/attendance/', {
        params: {
          technician: selectedTechnician,
          month: monthValue,
          include_shift: 'false',
        },
      })
      setAttendanceRows(Array.isArray(response.data) ? response.data : [])
    } catch {
      setAttendanceRows([])
      setError(TEXT.loadAttendanceError)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedTechnician) {
      toast.error(TEXT.selectTechnicianFirst)
      return
    }
    if (!selectedDate) {
      toast.error(TEXT.selectDayFirst)
      return
    }

    setSaving(true)
    try {
      const payload = {
        technician: selectedTechnician,
        date: selectedDate,
        status: formState.status,
        note: formState.note || '',
      }

      if (isUuid(formState.id)) {
        await api.patch('/technicians/attendance/' + formState.id + '/', payload)
        toast.success(TEXT.recordUpdated)
      } else {
        await api.post('/technicians/attendance/', payload)
        toast.success(TEXT.recordAdded)
      }

      await reloadAttendance()
    } catch {
      toast.error(TEXT.recordSaveError)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!isUuid(formState.id)) {
      toast.error(TEXT.deleteNotPossible)
      return
    }
    if (!window.confirm(TEXT.deleteConfirm)) return

    setSaving(true)
    try {
      await api.delete('/technicians/attendance/' + formState.id + '/')
      toast.success(TEXT.recordDeleted)
      setSelectedDate('')
      setFormState({
        id: '',
        status: 'leave',
        note: '',
        isDerived: false,
      })
      await reloadAttendance()
    } catch {
      toast.error(TEXT.recordDeleteError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="technician-leaves-page">
      <Card className="leave-hero border-0">
        <Card.Body className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="leave-hero-avatar" aria-hidden>
              {getInitials(selectedTechnicianData)}
            </div>
            <div>
              <div className="leave-hero-eyebrow">{TEXT.heroEyebrow}</div>
              <h3 className="leave-hero-title">{TEXT.heroTitle}</h3>
              <div className="leave-hero-subtitle">
                {selectedTechnicianData ? readName(selectedTechnicianData) + ' i' + c(231) + 'in ayl' + c(305) + 'k izin plan' + c(305) : TEXT.heroFallback}
              </div>
            </div>
          </div>

          <div className="leave-hero-meta">
            <Badge bg="light" text="dark">{monthTitle}</Badge>
            <Badge bg="primary">{recordCountLabel}</Badge>
          </div>
        </Card.Body>
      </Card>

      <Card className="leave-filter-card border-0 shadow-sm">
        <Card.Body>
          <div className="leave-filter-title">
            <FaFilter className="me-2 text-primary" />
            {TEXT.filters}
          </div>

          <Row className="g-3 align-items-end">
            <Col xs={12} lg={5}>
              <Form.Label className="small fw-semibold text-muted mb-1">{TEXT.technician}</Form.Label>
              <InputGroup>
                <InputGroup.Text><FaUserCog /></InputGroup.Text>
                <Form.Select
                  value={selectedTechnician}
                  onChange={(event) => {
                    setSelectedTechnician(event.target.value)
                    setSelectedDate('')
                  }}
                >
                  {technicians.length === 0 ? <option value="">{TEXT.noTechnician}</option> : null}
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {readName(tech)}
                    </option>
                  ))}
                </Form.Select>
              </InputGroup>
            </Col>

            <Col xs={6} md={3} lg={2}>
              <Form.Label className="small fw-semibold text-muted mb-1">{TEXT.month}</Form.Label>
              <InputGroup>
                <InputGroup.Text><FaCalendarAlt /></InputGroup.Text>
                <Form.Select
                  value={selectedMonth}
                  onChange={(event) => {
                    setSelectedMonth(event.target.value)
                    setSelectedDate('')
                  }}
                >
                  {MONTH_NAMES.map((label, index) => (
                    <option key={label} value={String(index + 1).padStart(2, '0')}>
                      {label}
                    </option>
                  ))}
                </Form.Select>
              </InputGroup>
            </Col>

            <Col xs={6} md={3} lg={2}>
              <Form.Label className="small fw-semibold text-muted mb-1">{TEXT.year}</Form.Label>
              <Form.Select
                value={selectedYear}
                onChange={(event) => {
                  setSelectedYear(event.target.value)
                  setSelectedDate('')
                }}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </Form.Select>
            </Col>

            <Col xs={12} md={6} lg={3} className="d-flex gap-2">
              <Button variant="outline-primary" className="flex-fill" onClick={() => reloadAttendance()} disabled={!selectedTechnician || loading}>
                {loading ? <Spinner animation="border" size="sm" /> : TEXT.refresh}
              </Button>
              <Button variant="primary" className="flex-fill" onClick={handleCreateForToday} disabled={!selectedTechnician}>
                <FaPlus className="me-2" />
                {TEXT.newRecord}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error ? <Alert variant="danger" className="mb-0">{error}</Alert> : null}

      <Row className="g-3">
        <Col xs={6} lg={3}>
          <Card className="leave-stat-card leave-stat-card--warning border-0 shadow-sm h-100">
            <Card.Body>
              <div className="leave-stat-icon"><FaUmbrellaBeach /></div>
              <div className="leave-stat-value">{metrics.leave}</div>
              <div className="leave-stat-label">{TEXT.leaveDay}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} lg={3}>
          <Card className="leave-stat-card leave-stat-card--danger border-0 shadow-sm h-100">
            <Card.Body>
              <div className="leave-stat-icon"><FaHospital /></div>
              <div className="leave-stat-value">{metrics.sick}</div>
              <div className="leave-stat-label">{TEXT.sickDay}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} lg={3}>
          <Card className="leave-stat-card leave-stat-card--secondary border-0 shadow-sm h-100">
            <Card.Body>
              <div className="leave-stat-icon"><FaMoon /></div>
              <div className="leave-stat-value">{metrics.offday}</div>
              <div className="leave-stat-label">{TEXT.officialHoliday}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} lg={3}>
          <Card className="leave-stat-card leave-stat-card--dark border-0 shadow-sm h-100">
            <Card.Body>
              <div className="leave-stat-icon"><FaExclamationTriangle /></div>
              <div className="leave-stat-value">{metrics.absent}</div>
              <div className="leave-stat-label">{TEXT.absent}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="leave-content-card border-0 shadow-sm">
        <Card.Body className="d-flex flex-column gap-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <ButtonGroup className="leave-filter-pills">
              {STATUS_OPTIONS.map((item) => (
                <Button
                  key={item.value}
                  variant={statusFilter === item.value ? 'primary' : 'outline-secondary'}
                  onClick={() => setStatusFilter(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </ButtonGroup>

            <div className="leave-period-nav">
              <Button variant="outline-secondary" onClick={() => handleMonthStep(-1)}><FaChevronLeft /></Button>
              <div className="leave-period-label">{monthTitle}</div>
              <Button variant="outline-secondary" onClick={() => handleMonthStep(1)}><FaChevronRight /></Button>
            </div>
          </div>

          <Row className="g-4">
            <Col xl={8}>
              <Card className="leave-calendar-card border-0">
                <Card.Body>
                  <div className="leave-calendar-weekdays">
                    {WEEKDAY_LABELS.map((label) => <div key={label}>{label}</div>)}
                  </div>

                  {loading ? (
                    <div className="leave-loading">
                      <Spinner animation="border" variant="primary" />
                    </div>
                  ) : (
                    <div className="leave-calendar-grid">
                      {calendarCells.map((cell, index) => {
                        if (!cell) {
                          return <div key={'empty-' + index} className="leave-calendar-empty" />
                        }

                        const row = attendanceByDate[cell.iso]
                        const meta = row ? getStatusMeta(row.status) : null
                        const Icon = (meta && meta.icon) || FaCalendarCheck
                        const isSelected = selectedDate === cell.iso

                        return (
                          <button
                            key={cell.iso}
                            type="button"
                            className={'leave-calendar-day ' + (cell.weekend ? 'is-weekend ' : '') + (cell.isToday ? 'is-today ' : '') + (isSelected ? 'is-selected' : '')}
                            onClick={() => handleSelectDay(cell.iso)}
                          >
                            <div className="leave-calendar-top">
                              <span className="leave-calendar-day-number">{cell.day}</span>
                              {row?.is_derived ? <Badge bg="dark">{TEXT.shiftBadge}</Badge> : null}
                            </div>

                            {meta ? (
                              <div className="leave-calendar-entry" style={{ '--entry-soft': meta.soft, '--entry-accent': meta.accent }}>
                                <Icon />
                                <span>{meta.label}</span>
                              </div>
                            ) : (
                              <div className="leave-calendar-empty-text">{TEXT.noRecord}</div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col xl={4}>
              <div className="leave-side-column">
                <Card className="leave-editor-card border-0">
                  <Card.Body>
                    <div className="leave-editor-head">
                      <div>
                        <div className="leave-editor-eyebrow">{TEXT.dayEdit}</div>
                        <h5 className="mb-1">{TEXT.selectedRecord}</h5>
                        <div className="text-muted small">
                          {selectedDate ? formatDateText(selectedDate) : TEXT.chooseDay}
                        </div>
                      </div>
                      <FaPen className="text-primary" />
                    </div>

                    {selectedDate ? (
                      <>
                        {formState.isDerived ? (
                          <Alert variant="info" className="py-2 small mb-3">
                            {TEXT.derivedInfo}
                          </Alert>
                        ) : null}

                        <Form.Group className="mb-3">
                          <Form.Label>{TEXT.status}</Form.Label>
                          <Form.Select
                            value={formState.status}
                            onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value }))}
                          >
                            {FORM_STATUS_OPTIONS.map((item) => (
                              <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>{TEXT.description}</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={4}
                            placeholder={TEXT.descriptionPlaceholder}
                            value={formState.note}
                            onChange={(event) => setFormState((prev) => ({ ...prev, note: event.target.value }))}
                          />
                        </Form.Group>

                        <div className="d-flex gap-2">
                          <Button variant="primary" className="flex-fill" onClick={handleSave} disabled={saving}>
                            {saving ? <Spinner animation="border" size="sm" /> : <><FaSave className="me-2" />{TEXT.save}</>}
                          </Button>
                          <Button variant="outline-danger" onClick={handleDelete} disabled={saving || !isUuid(formState.id)}>
                            <FaTrashAlt />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="leave-editor-empty">
                        {TEXT.sideHelp}
                      </div>
                    )}
                  </Card.Body>
                </Card>

                <Card className="leave-list-card border-0">
                  <Card.Body>
                    <div className="leave-list-head">
                      <h5 className="mb-0 d-flex align-items-center gap-2">
                        <FaListUl className="text-primary" />
                        {TEXT.recentRecords}
                      </h5>
                      <span className="text-muted small">{recordCountLabel}</span>
                    </div>

                    {filteredRows.length === 0 ? (
                      <div className="leave-list-empty">{TEXT.noFilteredRecords}</div>
                    ) : (
                      <div className="leave-list-items">
                        {filteredRows.slice(0, 8).map((row) => {
                          const meta = getStatusMeta(row.status)
                          const Icon = meta.icon
                          return (
                            <button
                              key={row.id || row.date}
                              type="button"
                              className={'leave-list-item ' + (selectedDate === row.date ? 'is-active' : '')}
                              onClick={() => handleSelectDay(row.date)}
                            >
                              <div className="leave-list-icon" style={{ backgroundColor: meta.soft, color: meta.accent }}>
                                <Icon />
                              </div>
                              <div className="leave-list-body">
                                <div className="leave-list-title-row">
                                  <strong>{meta.label}</strong>
                                  <Badge bg={meta.badge}>{formatDateText(row.date)}</Badge>
                                </div>
                                <div className="leave-list-note">{row.note || TEXT.emptyDescription}</div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  )
}

export default TechnicianLeaves

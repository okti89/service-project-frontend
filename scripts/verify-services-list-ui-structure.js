import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const servicesPath = path.resolve('frontend/src/pages/Services/Services.jsx')
const servicesCssPath = path.resolve('frontend/src/pages/Services/Services.css')
const source = fs.readFileSync(servicesPath, 'utf8').replace(/\r\n/g, '\n')
const cssSource = fs.readFileSync(servicesCssPath, 'utf8').replace(/\r\n/g, '\n')

const requiredSourceMarkers = [
  'const SERVICE_SORT_OPTIONS = [',
  "const [sortMode, setSortMode] = useState('schedule_asc')",
  "if (sortMode === 'schedule_asc')",
  "if (sortMode === 'schedule_desc')",
  "if (sortMode === 'receipt_desc')",
  '<Form.Label className="fw-semibold">Sıralama</Form.Label>',
  '<th className="px-3 py-3 service-col-sequence">Sıra</th>',
  '<th className="py-3 service-col-appointment">Randevu Tarihi / Saati</th>',
  '<th className="py-3 service-col-ticket">Servis No / ID</th>',
  '<th className="py-3 service-col-tech">Teknisyen</th>',
  'displayedServices.map((svc, index) => {',
  'className="service-row-sequence"',
  'className="service-row-appointment-meta"',
  'className="service-row-appointment-time"',
  'className="service-row-ticket-id"',
  'className="service-list-table-wrap"',
  'aria-label="Detay"',
  'className="service-row-customer-name"',
  'className="service-row-phone"',
  '>Detay</Button>',
  '>Düzenle</Button>',
  '>PDF</Button>',
  '>E-posta</Button>',
  '>WhatsApp</Button>',
  'day.services.slice(0, 3).map((svc) => {',
  '+{day.services.length - 3} servis',
  'const daysInMonth = new Date(year, month + 1, 0).getDate()',
  'Array.from({ length: daysInMonth }',
  'gridColumnStart: index === 0 ? startOffset + 1 : undefined',
  'const openCreateModal = (scheduledDate = null) => {',
  "const hasScheduledDate = scheduledDate instanceof Date || typeof scheduledDate === 'string' || typeof scheduledDate === 'number'",
  'const openCreateModalForDate = (date) => {',
  'onClick={() => openCreateModalForDate(day.date)}',
  'onKeyDown={(event) => handleCalendarDayKeyDown(event, day.date)}',
  'style={{ gridColumnStart: day.gridColumnStart }}',
  'event.stopPropagation()',
  'aria-label="Düzenle"',
]

const requiredCssMarkers = [
  '.service-col-sequence',
  '.service-col-appointment',
  '.service-col-ticket',
  '.service-col-tech',
  '.service-row-sequence',
  '.service-row-appointment',
  '.service-row-appointment-time',
  '.service-row-ticket-id',
  '.service-row-phone',
  '.service-row-customer-name',
  '.service-list-table-wrap',
  'table-layout: fixed;',
  'width: 100%;',
  'height: 32px;',
  '--calendar-day-height: clamp(104px, calc((100vh - 360px) / 6), 126px);',
  'grid-auto-rows: var(--calendar-day-height);',
  'min-height: var(--calendar-day-height);',
  '.service-calendar-event .event-meta',
  'display: none;',
]

const forbiddenSourceMarkers = [
  '<th className="py-3">Sorumlu</th>',
  '<div className="table-responsive">',
  'className="service-row-status-badge"',
  '<FaEye />',
  '<FaEdit />',
  '<FaFilePdf />',
  '<FaEnvelope />',
  '<FaWhatsapp />',
  '<FaTrash />',
  'customer-phone d-inline-flex align-items-center',
  'day.services.slice(0, 4)',
  '+{day.services.length - 4} servis',
  'day.services.slice(0, 2)',
  '+{day.services.length - 2} servis',
  'Array.from({ length: 42 }',
  'isCurrentMonth',
  'is-muted',
]

const forbiddenCssMarkers = [
  'min-width: 1240px',
  'min-width: 210px;',
  'max-width: 235px;',
  '.service-row-status-badge',
  'min-width: 30px;',
  'min-height: 132px;',
]

const missing = [
  ...requiredSourceMarkers.filter((entry) => !source.includes(entry)),
  ...requiredCssMarkers.filter((entry) => !cssSource.includes(entry)),
]

const forbidden = [
  ...forbiddenSourceMarkers.filter((entry) => source.includes(entry)),
  ...forbiddenCssMarkers.filter((entry) => cssSource.includes(entry)),
]

if (missing.length > 0 || forbidden.length > 0) {
  if (missing.length > 0) {
    console.error('Missing service list UI markers:')
    for (const item of missing) console.error(`- ${item}`)
  }
  if (forbidden.length > 0) {
    console.error('Forbidden legacy service list markers:')
    for (const item of forbidden) console.error(`- ${item}`)
  }
  process.exit(1)
}

console.log('Service list UI structure markers look correct.')

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const servicesPath = path.resolve('frontend/src/pages/Services/Services.jsx')
const servicesCssPath = path.resolve('frontend/src/pages/Services/Services.css')
const source = fs.readFileSync(servicesPath, 'utf8').replace(/\r\n/g, '\n')
const cssSource = fs.readFileSync(servicesCssPath, 'utf8').replace(/\r\n/g, '\n')

const requiredSourceMarkers = [
  "{ value: 'customer_asc', label: 'Müşteri adı: A-Z' }",
  "{ value: 'customer_desc', label: 'Müşteri adı: Z-A' }",
  "{ value: 'technician_asc', label: 'Teknisyen adı: A-Z' }",
  "{ value: 'technician_desc', label: 'Teknisyen adı: Z-A' }",
  "const [customerEntryMode, setCustomerEntryMode] = useState('existing')",
  'function formatPhoneInput(value) {',
  'const handleCustomerEntryModeChange = (mode) => {',
  "setCustomerEntryMode('manual')",
  "setFormData((prev) => ({",
  "customer: ''",
  'const [showOptionCreateModal, setShowOptionCreateModal] = useState(false)',
  'const [optionCreateType, setOptionCreateType] = useState(\'\')',
  'const openOptionCreateModal = (type) => {',
  "onClick={() => openOptionCreateModal('deviceType')}",
  "onClick={() => openOptionCreateModal('brand')}",
  "onClick={() => openOptionCreateModal('model')}",
  "onClick={() => openOptionCreateModal('status')}",
  'dialogClassName="service-form-modal"',
  'className="service-form-layout"',
  'className="service-entry-mode"',
  'value={formatPhoneInput(formData.customer_phone)}',
  'value={formatPhoneInput(addFields.customerPhone)}',
  '<Modal show={showOptionCreateModal}',
]

const requiredCssMarkers = [
  '.service-form-modal',
  '.service-form-layout',
  '.service-form-panel',
  '.service-form-body',
  '.service-entry-mode',
  '.service-entry-mode .btn',
  '.service-option-create-modal',
]

const forbiddenSourceMarkers = [
  'toggleAddMode(',
  'addModes.deviceType ? (',
  'addModes.brand ? (',
  'addModes.model ? (',
  'addModes.status ? (',
  "variant={addModes.deviceType ? 'outline-secondary' : 'outline-primary'}",
  "variant={addModes.brand ? 'outline-secondary' : 'outline-primary'}",
  "variant={addModes.model ? 'outline-secondary' : 'outline-primary'}",
  "variant={addModes.status ? 'outline-secondary' : 'outline-primary'}",
]

const missing = [
  ...requiredSourceMarkers.filter((entry) => !source.includes(entry)),
  ...requiredCssMarkers.filter((entry) => !cssSource.includes(entry)),
]

const forbidden = [
  ...forbiddenSourceMarkers.filter((entry) => source.includes(entry)),
]

if (missing.length > 0 || forbidden.length > 0) {
  if (missing.length > 0) {
    console.error('Missing service form UX markers:')
    for (const item of missing) console.error(`- ${item}`)
  }
  if (forbidden.length > 0) {
    console.error('Forbidden legacy service form markers:')
    for (const item of forbidden) console.error(`- ${item}`)
  }
  process.exit(1)
}

console.log('Service form UX structure markers look correct.')

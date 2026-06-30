import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap'
import { FaBell, FaEdit, FaEye, FaFilePdf, FaMoneyCheckAlt, FaPlus, FaPrint, FaTrash } from 'react-icons/fa'
import toast from 'react-hot-toast'

import api from '../../api/api'
import './Payroll.css'

const emptyPayrollForm = {
  technician: '',
  period_start: '',
  period_end: '',
  base_salary: '',
}

const emptyComponentForm = {
  template: '',
  name: '',
  amount: '',
  type: 'addition',
}

const emptyPayrollLineItem = {
  template: '',
  name: '',
  amount: '',
  type: 'addition',
}

const MONTH_OPTIONS = [
  { value: '', label: 'Tum Aylar' },
  { value: '01', label: 'Ocak' },
  { value: '02', label: 'Subat' },
  { value: '03', label: 'Mart' },
  { value: '04', label: 'Nisan' },
  { value: '05', label: 'Mayis' },
  { value: '06', label: 'Haziran' },
  { value: '07', label: 'Temmuz' },
  { value: '08', label: 'Agustos' },
  { value: '09', label: 'Eylul' },
  { value: '10', label: 'Ekim' },
  { value: '11', label: 'Kasim' },
  { value: '12', label: 'Aralik' },
]

function toList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

function readApiError(error, fallback) {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data.detail === 'string') return data.detail
  if (typeof data.error === 'string') return data.error
  const first = Object.entries(data).find(([, value]) => value)
  if (!first) return fallback
  const [, value] = first
  if (Array.isArray(value) && value.length > 0) return String(value[0])
  if (typeof value === 'string') return value
  return fallback
}

function money(value) {
  return Number(value || 0).toLocaleString('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  })
}

function formatThousands(value) {
  if (value === '' || value === null || value === undefined) return ''
  const digits = String(value).replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('tr-TR')
}

function parseThousands(value) {
  if (value === '' || value === null || value === undefined) return ''
  const digits = String(value).replace(/\D/g, '')
  return digits
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('tr-TR')
}

function Payroll() {
  const [payrolls, setPayrolls] = useState([])
  const [componentsByPayroll, setComponentsByPayroll] = useState({})
  const [technicians, setTechnicians] = useState([])
  const [payrollTemplates, setPayrollTemplates] = useState([])

  const [isLoading, setIsLoading] = useState(true)
  const [isSavingPayroll, setIsSavingPayroll] = useState(false)
  const [isSavingComponent, setIsSavingComponent] = useState(false)
  const [activeActionId, setActiveActionId] = useState('')

  const [showPayrollModal, setShowPayrollModal] = useState(false)
  const [showComponentModal, setShowComponentModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const [payrollForm, setPayrollForm] = useState(emptyPayrollForm)
  const [componentForm, setComponentForm] = useState(emptyComponentForm)
  const [activePayroll, setActivePayroll] = useState(null)
  const [editingPayroll, setEditingPayroll] = useState(null)
  const [editingComponent, setEditingComponent] = useState(null)
  const [payrollLineItems, setPayrollLineItems] = useState([])
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)

  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()))
  const [monthFilter, setMonthFilter] = useState(
    String(new Date().getMonth() + 1).padStart(2, '0')
  )
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [paidFilter, setPaidFilter] = useState('')

  const technicianMap = useMemo(() => {
    const map = {}
    technicians.forEach((tech) => {
      const user = tech?.user || {}
      map[tech.id] = user.full_name || user.email || tech.id
    })
    return map
  }, [technicians])

  const payrollTemplateMap = useMemo(() => {
    const map = {}
    payrollTemplates.forEach((item) => {
      map[item.id] = item
    })
    return map
  }, [payrollTemplates])

  const loadPayrollComponents = useCallback(async (payrollId) => {
    try {
      const response = await api.get('/hr/payroll-components/', { params: { payroll: payrollId } })
      setComponentsByPayroll((prev) => ({ ...prev, [payrollId]: toList(response.data) }))
    } catch {
      setComponentsByPayroll((prev) => ({ ...prev, [payrollId]: [] }))
    }
  }, [])

  const loadComponentsBulk = useCallback(async (payrollIds) => {
    if (!payrollIds || payrollIds.length === 0) return
    try {
      // Tek istekle tüm bileşenleri çek
      const response = await api.get('/hr/payroll-components/', {
        params: { payroll_ids: payrollIds.join(',') },
      })
      const allComponents = toList(response.data)
      // payroll_id'ye göre grupla
      const grouped = {}
      payrollIds.forEach((id) => { grouped[id] = [] })
      allComponents.forEach((comp) => {
        const pid = comp.payroll
        if (!grouped[pid]) grouped[pid] = []
        grouped[pid].push(comp)
      })
      setComponentsByPayroll((prev) => ({ ...prev, ...grouped }))
    } catch {
      // Toplu istek başarısız olursa tek tek dene
      await Promise.all(payrollIds.map((id) => loadPayrollComponents(id)))
    }
  }, [loadPayrollComponents])

  const refreshPayrollSnapshot = useCallback(async (payrollId) => {
    if (!payrollId) return null
    const [payrollRes, componentsRes] = await Promise.all([
      api.get(`/hr/payrolls/${payrollId}/`),
      api.get('/hr/payroll-components/', { params: { payroll: payrollId } }),
    ])

    const payroll = payrollRes.data
    const components = toList(componentsRes.data)

    setPayrolls((prev) => prev.map((row) => (row.id === payrollId ? payroll : row)))
    setComponentsByPayroll((prev) => ({ ...prev, [payrollId]: components }))
    setActivePayroll((prev) => (prev?.id === payrollId ? payroll : prev))

    return { payroll, components }
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const now = new Date()
      const year = String(now.getFullYear())
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const monthStart = `${year}-${month}-01`
      const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const monthEnd = `${year}-${String(monthEndDate.getMonth() + 1).padStart(2, '0')}-${String(monthEndDate.getDate()).padStart(2, '0')}`

      const [payrollRes, techniciansRes, templatesRes] = await Promise.all([
        api.get('/hr/payrolls/', {
          params: {
            period_start__gte: monthStart,
            period_start__lte: monthEnd,
            ordering: '-period_start',
          },
        }),
        api.get('/technicians/technician-list/?include_inactive=false').catch(() => ({ data: [] })),
        api.get('/hr/payroll-templates/').catch(() => ({ data: [] })),
      ])

      const rows = toList(payrollRes.data)
      setPayrolls(rows)
      setTechnicians(toList(techniciansRes.data))
      setPayrollTemplates(toList(templatesRes.data).filter((item) => item?.is_active !== false))

      // N+1 yerine tek toplu istek
      if (rows.length > 0) {
        await loadComponentsBulk(rows.map((row) => row.id))
      }
    } catch (error) {
      toast.error(readApiError(error, 'Bordro verileri yüklenemedi.'))
    } finally {
      setIsLoading(false)
    }
  }, [loadComponentsBulk])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredPayrolls = useMemo(() => {
    return payrolls.filter((row) => {
      const periodStart = String(row.period_start || '')
      const periodEnd = String(row.period_end || row.period_start || '')
      const year = periodStart.slice(0, 4)
      const month = periodStart.slice(5, 7)
      if (yearFilter && year !== yearFilter) return false
      if (monthFilter && month !== monthFilter) return false
      if (startDateFilter && periodEnd < startDateFilter) return false
      if (endDateFilter && periodStart > endDateFilter) return false
      if (paidFilter === 'paid' && !row.is_paid) return false
      if (paidFilter === 'unpaid' && row.is_paid) return false
      return true
    })
  }, [payrolls, yearFilter, monthFilter, startDateFilter, endDateFilter, paidFilter])

  const summary = useMemo(() => {
    return filteredPayrolls.reduce(
      (acc, row) => {
        acc.total += 1
        acc.net += Number(row.net_salary || 0)
        acc.base += Number(row.base_salary || 0)
        acc.premiums += Number(row.total_premiums || 0)
        acc.deductions += Number(row.total_deductions || 0)
        if (row.is_paid) acc.paid += 1
        else acc.unpaid += 1
        return acc
      },
      { total: 0, paid: 0, unpaid: 0, base: 0, premiums: 0, deductions: 0, net: 0 }
    )
  }, [filteredPayrolls])

  const yearOptions = useMemo(() => {
    const years = new Set()
    payrolls.forEach((row) => {
      const year = String(row.period_start || '').slice(0, 4)
      if (year) years.add(year)
    })
    years.add(String(new Date().getFullYear()))
    return Array.from(years).sort((a, b) => Number(b) - Number(a))
  }, [payrolls])

  const componentRows = useMemo(
    () =>
      filteredPayrolls.flatMap((row) =>
        (componentsByPayroll[row.id] || []).map((component) => ({
          payrollId: row.id,
          technician: row.technician,
          component,
        }))
      ),
    [filteredPayrolls, componentsByPayroll]
  )

  const activePayrollComponents = useMemo(() => {
    if (!activePayroll?.id) return []
    return componentsByPayroll[activePayroll.id] || activePayroll.components || []
  }, [activePayroll, componentsByPayroll])

  const submitPayroll = async (event) => {
    event.preventDefault()
    if (isSavingPayroll) return
    setIsSavingPayroll(true)
    try {
      const payload = {
        technician: payrollForm.technician,
        period_start: payrollForm.period_start,
        period_end: payrollForm.period_end,
        base_salary: Number(payrollForm.base_salary || 0),
      }
      if (editingPayroll?.id) {
        await api.patch(`/hr/payrolls/${editingPayroll.id}/`, {
          technician: payload.technician,
          period_start: payload.period_start,
          period_end: payload.period_end,
          is_paid: editingPayroll.is_paid,
          paid_date: editingPayroll.paid_date,
        })
        toast.success('Bordro güncellendi.')
      } else {
        const payrollResponse = await api.post('/hr/payrolls/', payload)
        const createdPayrollId = payrollResponse?.data?.id
        const validLineItems = payrollLineItems
          .map((item) => ({
            template: item.template || null,
            name: String(item.name || '').trim(),
            amount: Number(item.amount || 0),
            type: item.type || 'addition',
            is_manual: !item.template,
          }))
          .filter((item) => item.name && Number.isFinite(item.amount) && item.amount > 0)

        if (createdPayrollId && validLineItems.length > 0) {
          await Promise.all(
            validLineItems.map((item) =>
              api.post('/hr/payroll-components/', {
                payroll: createdPayrollId,
                template: item.template,
                name: item.name,
                amount: item.amount,
                type: item.type,
                is_manual: item.is_manual,
              })
            )
          )
        }
        toast.success('Bordro oluşturuldu.')
      }
      setShowPayrollModal(false)
      setPayrollForm(emptyPayrollForm)
      setEditingPayroll(null)
      setPayrollLineItems([])
      await loadData()
    } catch (error) {
      toast.error(readApiError(error, editingPayroll ? 'Bordro güncellenemedi.' : 'Bordro oluşturulamadı.'))
    } finally {
      setIsSavingPayroll(false)
    }
  }

  const openPayrollCreateModal = () => {
    setEditingPayroll(null)
    setPayrollForm(emptyPayrollForm)
    setPayrollLineItems([{ ...emptyPayrollLineItem }])
    setShowPayrollModal(true)
  }

  const openPayrollEditModal = (payroll) => {
    setEditingPayroll(payroll)
    setPayrollForm({
      technician: payroll.technician || '',
      period_start: payroll.period_start || '',
      period_end: payroll.period_end || '',
      base_salary: payroll.base_salary || '',
    })
    setShowPayrollModal(true)
  }

  const openPayrollDetailModal = (payroll) => {
    setActivePayroll(payroll)
    setEditingComponent(null)
    setComponentForm(emptyComponentForm)
    setShowDetailModal(true)
  }

  const closePayrollModal = () => {
    setShowPayrollModal(false)
    setEditingPayroll(null)
    setPayrollForm(emptyPayrollForm)
    setPayrollLineItems([])
  }

  const closeComponentModal = () => {
    setShowComponentModal(false)
    setEditingComponent(null)
    setComponentForm(emptyComponentForm)
  }

  const addPayrollLineItem = () => {
    setPayrollLineItems((prev) => [...prev, { ...emptyPayrollLineItem }])
  }

  const addPayrollLineItemFromTemplate = (templateId) => {
    const template = payrollTemplateMap[templateId]
    if (!template) return
    setPayrollLineItems((prev) => [
      ...prev,
      {
        template: template.id,
        name: template.name || '',
        amount: template.default_amount || '',
        type: template.type || 'addition',
      },
    ])
  }

  const updatePayrollLineItem = (index, key, value) => {
    setPayrollLineItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        if (key === 'template') {
          const template = payrollTemplateMap[value]
          if (!template) {
            return {
              ...item,
              template: '',
              name: '',
              amount: '',
              type: 'addition',
            }
          }
          return {
            ...item,
            template: template.id,
            name: template.name || '',
            amount: template.default_amount || '',
            type: template.type || 'addition',
          }
        }
        return { ...item, [key]: value }
      })
    )
  }

  const removePayrollLineItem = (index) => {
    setPayrollLineItems((prev) => {
      if (prev.length <= 1) return [{ ...emptyPayrollLineItem }]
      return prev.filter((_, itemIndex) => itemIndex !== index)
    })
  }

  const openComponentModal = (payroll) => {
    setActivePayroll(payroll)
    setEditingComponent(null)
    setComponentForm(emptyComponentForm)
    setShowComponentModal(true)
  }

  const submitComponent = async (event) => {
    event.preventDefault()
    if (!activePayroll) return
    if (isSavingComponent) return
    setIsSavingComponent(true)
    try {
      const payload = {
        payroll: activePayroll.id,
        template: componentForm.template || null,
        name: componentForm.name,
        amount: Number(componentForm.amount || 0),
        type: componentForm.type,
        is_manual: !componentForm.template,
      }
      if (editingComponent?.id) {
        await api.patch(`/hr/payroll-components/${editingComponent.id}/`, payload)
        toast.success('Bordro kalemi güncellendi.')
      } else {
        await api.post('/hr/payroll-components/', payload)
        toast.success('Bordro kalemi eklendi.')
      }
      setShowComponentModal(false)
      setEditingComponent(null)
      setComponentForm(emptyComponentForm)
      await refreshPayrollSnapshot(activePayroll.id)
    } catch (error) {
      toast.error(readApiError(error, editingComponent ? 'Kalem güncellenemedi.' : 'Kalem eklenemedi.'))
    } finally {
      setIsSavingComponent(false)
    }
  }

  const openComponentEditModal = (payroll, component) => {
    setActivePayroll(payroll)
    setEditingComponent(component)
    setComponentForm({
      template: component.template || '',
      name: component.name || '',
      amount: component.amount || '',
      type: component.type || 'addition',
    })
    setShowComponentModal(true)
  }

  const applyComponentTemplate = (templateId) => {
    const template = payrollTemplateMap[templateId]
    if (!template) {
      setComponentForm((prev) => ({
        ...prev,
        template: '',
        name: '',
        amount: '',
        type: 'addition',
      }))
      return
    }
    setComponentForm((prev) => ({
      ...prev,
      template: template.id,
      name: template.name || '',
      amount: template.default_amount || '',
      type: template.type || 'addition',
    }))
  }

  const saveComponentAsTemplate = async () => {
    const name = String(componentForm.name || '').trim()
    const amount = Number(componentForm.amount || 0)
    const type = componentForm.type || 'addition'
    if (!name) {
      toast.error('Şablon için kalem adı gerekli.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Şablon için geçerli tutar gerekli.')
      return
    }
    if (isSavingTemplate) return
    setIsSavingTemplate(true)
    try {
      await api.post('/hr/payroll-templates/', {
        name,
        type,
        default_amount: amount,
        is_active: true,
      })
      const templatesRes = await api.get('/hr/payroll-templates/').catch(() => ({ data: [] }))
      setPayrollTemplates(toList(templatesRes.data).filter((item) => item?.is_active !== false))
      toast.success('Kalem şablon olarak kaydedildi.')
    } catch (error) {
      toast.error(readApiError(error, 'Şablon kaydedilemedi.'))
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const deleteComponent = async (componentId) => {
    if (!window.confirm('Bu bordro kalemi silinsin mi?')) return
    const payrollId = activePayroll?.id || componentRows.find((item) => item.component.id === componentId)?.payrollId
    try {
      await api.delete(`/hr/payroll-components/${componentId}/`)
      toast.success('Kalem silindi.')
      if (payrollId) {
        await refreshPayrollSnapshot(payrollId)
      } else {
        await loadData()
      }
    } catch (error) {
      toast.error(readApiError(error, 'Kalem silinemedi.'))
    }
  }

  const markAsPaid = async (payroll) => {
    try {
      await api.patch(`/hr/payrolls/${payroll.id}/`, {
        is_paid: true,
        paid_date: new Date().toISOString(),
      })
      toast.success('Bordro ödendi olarak işaretlendi.')
      await refreshPayrollSnapshot(payroll.id)
    } catch (error) {
      toast.error(readApiError(error, 'Ödeme durumu güncellenemedi.'))
    }
  }

  const downloadPayrollPdf = async (payroll) => {
    try {
      setActiveActionId(`pdf-${payroll.id}`)
      const response = await api.get(`/hr/payrolls/${payroll.id}/pdf/`, {
        responseType: 'blob',
      })
      const fileUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = `maas_bordro_${payroll.period_start}_${payroll.period_end}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(fileUrl)
      toast.success('PDF indirildi.')
    } catch (error) {
      toast.error(readApiError(error, 'PDF oluşturulamadı.'))
    } finally {
      setActiveActionId('')
    }
  }

  const printPayroll = async (payroll) => {
    let printWindow = null
    try {
      setActiveActionId(`print-${payroll.id}`)
      printWindow = window.open('', '_blank')
      const response = await api.get(`/hr/payrolls/${payroll.id}/pdf/`, {
        responseType: 'blob',
      })
      const fileUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      if (printWindow) {
        printWindow.location = fileUrl
        setTimeout(() => {
          try {
            printWindow.focus()
            printWindow.print()
          } catch {
            // no-op
          }
        }, 700)
      } else {
        window.open(fileUrl, '_blank')
      }
      toast.success('Yazdırma ekranı açıldı.')
    } catch (error) {
      if (printWindow) printWindow.close()
      toast.error(readApiError(error, 'Yazdırma açılamadı.'))
    } finally {
      setActiveActionId('')
    }
  }

  const sendPayrollNotification = async (payroll) => {
    try {
      setActiveActionId(`notify-${payroll.id}`)
      await api.post(`/hr/payrolls/${payroll.id}/send-notification/`)
      toast.success('Bildirim teknisyene gönderildi.')
    } catch (error) {
      toast.error(readApiError(error, 'Bildirim gönderilemedi.'))
    } finally {
      setActiveActionId('')
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="light" />
      </div>
    )
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h3 className="fw-bold m-0 text-light d-flex align-items-center">
          <FaMoneyCheckAlt className="me-2 text-warning" />
          Maaş Bordrosu
        </h3>
        <Button onClick={openPayrollCreateModal}>
          <FaPlus className="me-2" />
          Yeni Bordro
        </Button>
      </div>

      <Row className="payroll-summary-row g-2 g-lg-3 mb-4">
        <Col>
          <Card className="payroll-stat-card payroll-stat-card--total border-0 shadow-sm h-100">
            <Card.Body className="payroll-stat-body">
              <span className="payroll-stat-label">Bordro Adedi</span>
              <span className="payroll-stat-value">{summary.total}</span>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="payroll-stat-card payroll-stat-card--paid border-0 shadow-sm h-100">
            <Card.Body className="payroll-stat-body">
              <span className="payroll-stat-label">Ödenen</span>
              <span className="payroll-stat-value">{summary.paid}</span>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="payroll-stat-card payroll-stat-card--pending border-0 shadow-sm h-100">
            <Card.Body className="payroll-stat-body">
              <span className="payroll-stat-label">Bekleyen</span>
              <span className="payroll-stat-value">{summary.unpaid}</span>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="payroll-stat-card payroll-stat-card--premiums border-0 shadow-sm h-100">
            <Card.Body className="payroll-stat-body">
              <span className="payroll-stat-label">Toplam Prim</span>
              <span className="payroll-stat-value">{money(summary.premiums)}</span>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="payroll-stat-card payroll-stat-card--deductions border-0 shadow-sm h-100">
            <Card.Body className="payroll-stat-body">
              <span className="payroll-stat-label">Toplam Kesinti</span>
              <span className="payroll-stat-value">{money(summary.deductions)}</span>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="payroll-stat-card payroll-stat-card--net border-0 shadow-sm h-100">
            <Card.Body className="payroll-stat-body">
              <span className="payroll-stat-label">Toplam Net Maaş</span>
              <span className="payroll-stat-value">{money(summary.net)}</span>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm mb-3">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col md={6} xl={2}>
              <Form.Group>
                <Form.Label>Yıl</Form.Label>
                <Form.Select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
                  <option value="">Tüm Yıllar</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6} xl={2}>
              <Form.Group>
                <Form.Label>Ay</Form.Label>
                <Form.Select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
                  {MONTH_OPTIONS.map((month) => (
                    <option key={month.value || 'all'} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6} xl={3}>
              <Form.Group>
                <Form.Label>Başlangıç Tarihi</Form.Label>
                <Form.Control type="date" value={startDateFilter} onChange={(event) => setStartDateFilter(event.target.value)} />
              </Form.Group>
            </Col>
            <Col md={6} xl={3}>
              <Form.Group>
                <Form.Label>Bitiş Tarihi</Form.Label>
                <Form.Control type="date" value={endDateFilter} onChange={(event) => setEndDateFilter(event.target.value)} />
              </Form.Group>
            </Col>
            <Col md={6} xl={2}>
              <Form.Group>
                <Form.Label>Ödeme Durumu</Form.Label>
                <Form.Select value={paidFilter} onChange={(event) => setPaidFilter(event.target.value)}>
                  <option value="">Hepsi</option>
                  <option value="paid">Ödenen</option>
                  <option value="unpaid">Bekleyen</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm overflow-hidden">
        <Table responsive hover className="m-0 align-middle">
          <thead className="bg-light">
            <tr>
              <th className="text-center" style={{ width: '50px' }}>#</th>
              <th>Teknisyen</th>
              <th>Dönem</th>
              <th className="text-end">Taban</th>
              <th className="text-end">Prim</th>
              <th className="text-end">Kesinti</th>
              <th className="text-end">Net Maaş</th>
              <th>Durum</th>
              <th className="text-end">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayrolls.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-muted py-4">
                  Bordro kaydı bulunamadı.
                </td>
              </tr>
            ) : null}

            {filteredPayrolls.map((row, index) => (
              <tr key={row.id}>
                <td className="text-center text-muted fw-medium">{index + 1}</td>
                <td className="fw-semibold">{technicianMap[row.technician] || row.technician}</td>
                <td>{formatDate(row.period_start)} - {formatDate(row.period_end)}</td>
                <td className="text-end">{money(row.base_salary)}</td>
                <td className="text-end text-success">{money(row.total_premiums)}</td>
                <td className="text-end text-danger">{money(row.total_deductions)}</td>
                <td className="text-end fw-bold">{money(row.net_salary)}</td>
                <td>
                  <Badge bg={row.is_paid ? 'success' : 'warning'} text={row.is_paid ? 'light' : 'dark'}>
                    {row.is_paid ? 'Ödendi' : 'Bekliyor'}
                  </Badge>
                </td>
                <td className="text-end">
                  <div className="d-flex justify-content-end gap-2 flex-wrap">
                    <Button size="sm" variant="outline-primary" onClick={() => openComponentModal(row)}>
                      Kalem Ekle
                    </Button>
                    <Button size="sm" variant="outline-dark" onClick={() => openPayrollDetailModal(row)}>
                      <FaEye className="me-1" />
                      Detay
                    </Button>
                    <Button size="sm" variant="outline-primary" onClick={() => openPayrollEditModal(row)}>
                      <FaEdit className="me-1" />
                      Düzenle
                    </Button>
                    {!row.is_paid ? (
                      <Button size="sm" variant="outline-success" onClick={() => markAsPaid(row)}>
                        Ödendi Yap
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline-info"
                      disabled={activeActionId === `notify-${row.id}`}
                      onClick={() => sendPayrollNotification(row)}
                    >
                      <FaBell className="me-1" />
                      Bildir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      disabled={activeActionId === `pdf-${row.id}`}
                      onClick={() => downloadPayrollPdf(row)}
                    >
                      <FaFilePdf className="me-1" />
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      disabled={activeActionId === `print-${row.id}`}
                      onClick={() => printPayroll(row)}
                    >
                      <FaPrint className="me-1" />
                      Yazdır
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {activePayroll && (
      <Card className="border-0 shadow-sm mt-4">
        <Card.Header className="bg-light fw-semibold">Bordro Kalemleri</Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover className="m-0 align-middle">
            <thead>
              <tr>
                <th>Teknisyen</th>
                <th>Kalem</th>
                <th>Tip</th>
                <th className="text-end">Tutar</th>
                <th className="text-end">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {componentRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    Bordro kalemi bulunamadı.
                  </td>
                </tr>
              ) : (
                componentRows.map((item) => (
                    <tr key={`${item.payrollId}-${item.component.id}`}>
                      <td>{technicianMap[item.technician] || item.technician}</td>
                      <td>{item.component.name}</td>
                      <td>
                        <Badge bg={item.component.type === 'addition' ? 'success' : 'danger'}>
                          {item.component.type === 'addition' ? 'Eklenti' : 'Kesinti'}
                        </Badge>
                      </td>
                      <td className="text-end">{money(item.component.amount)}</td>
                      <td className="text-end">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="me-2"
                          onClick={() =>
                            openComponentEditModal(
                              filteredPayrolls.find((row) => row.id === item.payrollId) || activePayroll || { id: item.payrollId },
                              item.component
                            )
                          }
                        >
                          <FaEdit />
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => deleteComponent(item.component.id)}>
                          <FaTrash />
                        </Button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
      )}

      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="xl" dialogClassName="payroll-detail-modal" scrollable centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-dark">Bordro Detayı & Ekstre</Modal.Title>
        </Modal.Header>
        <Modal.Body className="payroll-detail-body pt-2" style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
          {!activePayroll ? null : (
            <Row className="g-4">
              {/* Left Column: Invoice Details & Items */}
              <Col lg={8}>
                {/* Hero Summary */}
                <div className="bg-white p-4 rounded-4 shadow-sm border mb-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-2 fw-semibold mb-2">
                        {technicianMap[activePayroll.technician] || activePayroll.technician}
                      </span>
                      <h3 className="fw-bold mb-1">
                        {formatDate(activePayroll.period_start)} - {formatDate(activePayroll.period_end)}
                      </h3>
                      <p className="text-muted small mb-0">Hakediş Dönemi ve Personel Detayı</p>
                    </div>
                    <div className="text-end">
                      <span className={`badge rounded-pill px-3 py-2 fs-6 fw-bold ${activePayroll.is_paid ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
                        {activePayroll.is_paid ? 'Ödendi' : 'Ödeme Bekliyor'}
                      </span>
                      {activePayroll.is_paid && activePayroll.paid_date && (
                        <div className="text-muted small mt-1">
                          Ödeme: {formatDate(activePayroll.paid_date)}
                        </div>
                      )}
                    </div>
                  </div>

                  <hr className="my-3 text-muted opacity-25" />

                  {/* Main stats grid */}
                  <Row className="g-3 text-center">
                    <Col xs={4}>
                      <div className="py-2 border rounded-3 bg-light-subtle">
                        <small className="text-muted d-block fw-semibold text-uppercase" style={{ fontSize: '0.7rem' }}>Taban Maaş</small>
                        <span className="fw-bold text-dark fs-5">{money(activePayroll.base_salary)}</span>
                      </div>
                    </Col>
                    <Col xs={4}>
                      <div className="py-2 border rounded-3 bg-success-subtle bg-opacity-10">
                        <small className="text-success d-block fw-semibold text-uppercase" style={{ fontSize: '0.7rem' }}>Toplam Prim</small>
                        <span className="fw-bold text-success fs-5">+{money(activePayroll.total_premiums)}</span>
                      </div>
                    </Col>
                    <Col xs={4}>
                      <div className="py-2 border rounded-3 bg-danger-subtle bg-opacity-10">
                        <small className="text-danger d-block fw-semibold text-uppercase" style={{ fontSize: '0.7rem' }}>Toplam Kesinti</small>
                        <span className="fw-bold text-danger fs-5">-{money(activePayroll.total_deductions)}</span>
                      </div>
                    </Col>
                  </Row>
                </div>

                {/* Items Table */}
                <Card className="border shadow-sm rounded-4 overflow-hidden mb-3">
                  <Card.Header className="bg-light fw-bold py-3 text-dark d-flex justify-content-between align-items-center">
                    <span>Hakediş / Kesinti Kalemleri</span>
                    <Badge bg="secondary" className="rounded-pill px-2 py-1">
                      {activePayrollComponents.length} Kalem
                    </Badge>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <div className="table-responsive">
                      <Table hover className="mb-0 align-middle">
                        <thead className="table-light">
                          <tr>
                            <th className="py-3 px-4">Kalem Adı</th>
                            <th style={{ width: '120px' }}>Tip</th>
                            <th style={{ width: '150px' }} className="text-end py-3 px-4">Tutar</th>
                            <th style={{ width: '120px' }} className="text-center">İşlem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activePayrollComponents.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center text-muted py-5">
                                Bu hakediş dönemi için herhangi bir ek kalem (prim/kesinti) bulunamadı.
                              </td>
                            </tr>
                          ) : (
                            activePayrollComponents.map((component) => (
                              <tr key={component.id}>
                                <td className="py-3 px-4 fw-semibold text-dark">{component.name}</td>
                                <td>
                                  <span className={`badge px-2.5 py-1.5 rounded-pill ${component.type === 'addition' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'}`} style={{ fontSize: '0.75rem' }}>
                                    {component.type === 'addition' ? 'Eklenti' : 'Kesinti'}
                                  </span>
                                </td>
                                <td className={`text-end py-3 px-4 fw-bold ${component.type === 'addition' ? 'text-success' : 'text-danger'}`}>
                                  {component.type === 'addition' ? '+' : '-'}{money(component.amount)}
                                </td>
                                <td className="text-center">
                                  <div className="d-flex justify-content-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline-secondary"
                                      className="border-0 p-1"
                                      onClick={() => openComponentEditModal(activePayroll, component)}
                                      title="Düzenle"
                                    >
                                      <FaEdit size={14} className="text-primary" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline-secondary"
                                      className="border-0 p-1"
                                      onClick={() => deleteComponent(component.id)}
                                      title="Sil"
                                    >
                                      <FaTrash size={14} className="text-danger" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </Table>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              {/* Right Column: Premium Invoice Summary Card & Quick Actions */}
              <Col lg={4}>
                {/* Net Salary Summary Card */}
                <div className="bg-dark text-white p-4 rounded-4 shadow-sm border border-dark mb-4 text-center">
                  <span className="text-muted d-block small fw-bold text-uppercase mb-2" style={{ letterSpacing: '0.05em' }}>NET ÖDENECEK TUTAR</span>
                  <h1 className="fw-extrabold display-6 text-white mb-3" style={{ fontSize: '2.2rem' }}>
                    {money(activePayroll.net_salary)}
                  </h1>
                  <hr className="bg-secondary my-3 opacity-25" />
                  <Row className="g-2 text-start text-white-50 small">
                    <Col xs={6}>Taban Maaş:</Col>
                    <Col xs={6} className="text-end text-white">{money(activePayroll.base_salary)}</Col>
                    <Col xs={6}>Ek Gelirler:</Col>
                    <Col xs={6} className="text-end text-success fw-semibold">+{money(activePayroll.total_premiums)}</Col>
                    <Col xs={6}>Kesintiler:</Col>
                    <Col xs={6} className="text-end text-danger fw-semibold">-{money(activePayroll.total_deductions)}</Col>
                  </Row>
                </div>

                {/* Operations & Actions */}
                <Card className="border shadow-sm rounded-4 overflow-hidden">
                  <Card.Header className="bg-light fw-bold py-3 text-dark">
                    Bordro İşlemleri
                  </Card.Header>
                  <Card.Body className="d-flex flex-column gap-2 p-3">
                    <Button variant="dark" className="py-2.5 rounded-3 d-flex align-items-center justify-content-center gap-2 fw-semibold" onClick={() => openPayrollEditModal(activePayroll)}>
                      <FaEdit />
                      Bordroyu Düzenle
                    </Button>
                    <Button variant="primary" className="py-2.5 rounded-3 d-flex align-items-center justify-content-center gap-2 fw-semibold" onClick={() => openComponentModal(activePayroll)}>
                      <FaPlus />
                      Yeni Kalem (Prim/Kesinti) Ekle
                    </Button>
                    {!activePayroll.is_paid ? (
                      <Button variant="success" className="py-2.5 rounded-3 d-flex align-items-center justify-content-center gap-2 fw-semibold" onClick={() => markAsPaid(activePayroll)}>
                        Ödemeyi Onayla ve Kapat
                      </Button>
                    ) : null}
                    
                    <hr className="my-2" />
                    
                    <div className="d-grid gap-2">
                      <Button
                        variant="outline-info"
                        className="py-2 rounded-3 text-dark border-secondary-subtle d-flex align-items-center justify-content-center gap-2"
                        disabled={activeActionId === `notify-${activePayroll.id}`}
                        onClick={() => sendPayrollNotification(activePayroll)}
                      >
                        <FaBell /> Personel Bildirimi Gönder
                      </Button>
                      <Button
                        variant="outline-danger"
                        className="py-2 rounded-3 text-dark border-secondary-subtle d-flex align-items-center justify-content-center gap-2"
                        disabled={activeActionId === `pdf-${activePayroll.id}`}
                        onClick={() => downloadPayrollPdf(activePayroll)}
                      >
                        <FaFilePdf /> PDF Raporu İndir
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={showPayrollModal} onHide={closePayrollModal} size="lg" centered scrollable>
        <Form onSubmit={submitPayroll}>
          <Modal.Header closeButton>
            <Modal.Title>{editingPayroll ? 'Bordro Düzenle' : 'Yeni Bordro'}</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Teknisyen</Form.Label>
                  <Form.Select
                    required
                    value={payrollForm.technician}
                    onChange={(event) => setPayrollForm((prev) => ({ ...prev, technician: event.target.value }))}
                  >
                    <option value="">Seçiniz</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech?.user?.full_name || tech?.user?.email || tech.id}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Taban Maaş</Form.Label>
                  <Form.Control
                    type="text"
                    inputMode="decimal"
                    required={!editingPayroll}
                    disabled={Boolean(editingPayroll)}
                    value={formatThousands(payrollForm.base_salary)}
                    onChange={(event) =>
                      setPayrollForm((prev) => ({ ...prev, base_salary: parseThousands(event.target.value) }))
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Dönem Başlangıç</Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={payrollForm.period_start}
                    onChange={(event) => setPayrollForm((prev) => ({ ...prev, period_start: event.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Dönem Bitiş</Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={payrollForm.period_end}
                    onChange={(event) => setPayrollForm((prev) => ({ ...prev, period_end: event.target.value }))}
                  />
                </Form.Group>
              </Col>
            </Row>

            {!editingPayroll ? (
              <div className="mt-4">
                <hr />
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <div className="fw-semibold">Ek Gelir ve Kesintiler (Kalemler)</div>
                    <div className="text-muted small">Bordroya eklenecek prim, avans, ceza vb. kalemleri ekleyin.</div>
                  </div>
                  <Button type="button" variant="primary" size="sm" onClick={addPayrollLineItem}>
                    <FaPlus className="me-1" /> Yeni Kalem Ekle
                  </Button>
                </div>

                {payrollTemplates.length > 0 ? (
                  <div className="mb-3 p-3 bg-light rounded border">
                    <div className="text-muted small fw-semibold mb-2">Şablonlardan Hızlı Ekle:</div>
                    <div className="row g-2">
                      <div className="col-md-6 border-end">
                        <div className="text-success small fw-semibold mb-1">Eklentiler / Primler</div>
                        <div className="d-flex flex-wrap gap-1">
                          {payrollTemplates.filter(t => t.type !== 'deduction').map((template) => (
                            <Button
                              key={template.id}
                              type="button"
                              size="sm"
                              variant="outline-success"
                              className="py-1 px-2 text-capitalize"
                              onClick={() => addPayrollLineItemFromTemplate(template.id)}
                            >
                              + {template.name} {template.default_amount ? `(${money(template.default_amount)})` : ''}
                            </Button>
                          ))}
                          {payrollTemplates.filter(t => t.type !== 'deduction').length === 0 && (
                            <span className="text-muted small">Kayıtlı eklenti şablonu yok.</span>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6 ps-md-3">
                        <div className="text-danger small fw-semibold mb-1">Kesintiler</div>
                        <div className="d-flex flex-wrap gap-1">
                          {payrollTemplates.filter(t => t.type === 'deduction').map((template) => (
                            <Button
                              key={template.id}
                              type="button"
                              size="sm"
                              variant="outline-danger"
                              className="py-1 px-2 text-capitalize"
                              onClick={() => addPayrollLineItemFromTemplate(template.id)}
                            >
                              - {template.name} {template.default_amount ? `(${money(template.default_amount)})` : ''}
                            </Button>
                          ))}
                          {payrollTemplates.filter(t => t.type === 'deduction').length === 0 && (
                            <span className="text-muted small">Kayıtlı kesinti şablonu yok.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {payrollLineItems.length > 0 ? (
                  <div className="table-responsive border rounded">
                    <Table size="sm" className="mb-0 align-middle">
                      <thead className="bg-light">
                        <tr>
                          <th>Kalem Adı</th>
                          <th style={{ width: '160px' }}>Tip</th>
                          <th style={{ width: '130px' }}>Tutar</th>
                          <th style={{ width: '90px' }} className="text-center">Şablon Yap</th>
                          <th style={{ width: '50px' }} className="text-center">Sil</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payrollLineItems.map((item, index) => {
                          const isTemplateSaved = payrollTemplates.some(
                            (t) =>
                              t.name.toLowerCase() === String(item.name || '').trim().toLowerCase() &&
                              t.type === item.type &&
                              Number(t.default_amount) === Number(item.amount)
                          );
                          return (
                            <tr key={`payroll-line-${index}`}>
                              <td>
                                <Form.Control
                                  size="sm"
                                  required
                                  value={item.name}
                                  placeholder="Örn. Yol Primi, Avans"
                                  onChange={(event) => updatePayrollLineItem(index, 'name', event.target.value)}
                                />
                              </td>
                              <td>
                                <Form.Select
                                  size="sm"
                                  value={item.type}
                                  onChange={(event) => updatePayrollLineItem(index, 'type', event.target.value)}
                                >
                                  <option value="addition">Eklenti (+)</option>
                                  <option value="deduction">Kesinti (-)</option>
                                </Form.Select>
                              </td>
                              <td>
                                <Form.Control
                                  size="sm"
                                  required
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={item.amount}
                                  onChange={(event) => updatePayrollLineItem(index, 'amount', event.target.value)}
                                />
                                {item.amount ? (
                                  <div className="text-muted text-end" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                                    {money(item.amount)}
                                  </div>
                                ) : null}
                              </td>
                              <td className="text-center">
                                <Button
                                  type="button"
                                  variant="link"
                                  size="sm"
                                  className={`p-0 ${isTemplateSaved ? 'text-warning' : 'text-muted'}`}
                                  disabled={!item.name || !item.amount || isSavingTemplate || isTemplateSaved}
                                  onClick={async () => {
                                    const name = String(item.name || '').trim()
                                    const amount = Number(item.amount || 0)
                                    const type = item.type || 'addition'
                                    if (!name || amount <= 0) return
                                    setIsSavingTemplate(true)
                                    try {
                                      await api.post('/hr/payroll-templates/', {
                                        name,
                                        type,
                                        default_amount: amount,
                                        is_active: true,
                                      })
                                      const templatesRes = await api.get('/hr/payroll-templates/').catch(() => ({ data: [] }))
                                      setPayrollTemplates(toList(templatesRes.data).filter((t) => t?.is_active !== false))
                                      toast.success(`"${name}" şablon olarak kaydedildi.`)
                                    } catch (error) {
                                      toast.error(readApiError(error, 'Şablon kaydedilemedi.'))
                                    } finally {
                                      setIsSavingTemplate(false)
                                    }
                                  }}
                                  title={isTemplateSaved ? 'Şablon olarak kayıtlı' : 'Şablon olarak kaydet'}
                                >
                                  {isTemplateSaved ? '✓ Kayıtlı' : '★ Kaydet'}
                                </Button>
                              </td>
                              <td className="text-center">
                                <Button
                                  type="button"
                                  variant="link"
                                  className="text-danger p-0"
                                  onClick={() => removePayrollLineItem(index)}
                                >
                                  <FaTrash />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center p-3 border border-dashed rounded text-muted small bg-light">
                    Henüz bir prim veya kesinti eklenmedi. Hızlı eklemek için yukarıdaki şablonları kullanabilir veya "Yeni Kalem Ekle" butonuna basabilirsiniz.
                  </div>
                )}
              </div>
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closePayrollModal}>
              İptal
            </Button>
            <Button type="submit" disabled={isSavingPayroll}>
              {isSavingPayroll ? <Spinner animation="border" size="sm" /> : editingPayroll ? 'Güncelle' : 'Kaydet'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showComponentModal} onHide={closeComponentModal} centered>
        <Form onSubmit={submitComponent}>
          <Modal.Header closeButton>
            <Modal.Title>{editingComponent ? 'Bordro Kalemi Düzenle' : 'Bordro Kalemi Ekle'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Şablondan Seç</Form.Label>
              <Form.Select value={componentForm.template || ''} onChange={(event) => applyComponentTemplate(event.target.value)}>
                <option value="">Manuel Ekle</option>
                {payrollTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.default_amount ? `(${money(template.default_amount)})` : ''}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Kalem Adı</Form.Label>
              <Form.Control
                required
                value={componentForm.name}
                onChange={(event) => setComponentForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </Form.Group>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Tip</Form.Label>
                  <Form.Select
                    value={componentForm.type}
                    onChange={(event) => setComponentForm((prev) => ({ ...prev, type: event.target.value }))}
                  >
                    <option value="addition">Eklenti</option>
                    <option value="deduction">Kesinti</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Tutar</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={componentForm.amount}
                    onChange={(event) => setComponentForm((prev) => ({ ...prev, amount: event.target.value }))}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="outline-dark" onClick={saveComponentAsTemplate} disabled={isSavingTemplate}>
              {isSavingTemplate ? <Spinner animation="border" size="sm" /> : 'Şablon Kaydet'}
            </Button>
            <Button variant="secondary" onClick={closeComponentModal}>
              İptal
            </Button>
            <Button type="submit" disabled={isSavingComponent}>
              {isSavingComponent ? <Spinner animation="border" size="sm" /> : editingComponent ? 'Güncelle' : 'Ekle'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  )
}

export default Payroll



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
  Tab,
  Table,
  Tabs,
} from 'react-bootstrap'
import {
  FaChartLine,
  FaExchangeAlt,
  FaFolderOpen,
  FaMoneyCheckAlt,
  FaPlus,
  FaSync,
  FaTrash,
  FaWallet,
  FaRegClock,
  FaEdit
} from 'react-icons/fa'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

import api from '../../api/api'
import { getServiceStatusMeta } from '../../constants/serviceStatuses'
import Services from '../Services/Services'

const MONTH_OPTIONS = [
  { value: '01', label: 'Ocak' },
  { value: '02', label: 'Şubat' },
  { value: '03', label: 'Mart' },
  { value: '04', label: 'Nisan' },
  { value: '05', label: 'Mayıs' },
  { value: '06', label: 'Haziran' },
  { value: '07', label: 'Temmuz' },
  { value: '08', label: 'Ağustos' },
  { value: '09', label: 'Eylül' },
  { value: '10', label: 'Ekim' },
  { value: '11', label: 'Kasım' },
  { value: '12', label: 'Aralık' },
]

const ACCOUNT_TYPE_LABELS = {
  cash: 'Nakit',
  bank: 'Banka',
  credit_card: 'Kredi Karti',
  other: 'Diğer',
}

const ACCOUNT_COLORS = [
  { bg: '#667eea', text: '#fff', badge: 'light' },
  { bg: '#11998e', text: '#fff', badge: 'light' },
  { bg: '#f7971e', text: '#333', badge: 'dark' },
  { bg: '#fc4a1a', text: '#fff', badge: 'light' },
  { bg: '#0f3460', text: '#fff', badge: 'light' },
  { bg: '#ee0979', text: '#fff', badge: 'light' },
]

const TRANSACTION_TYPE_LABELS = {
  income: 'Gelir',
  expense: 'Gider',
}

function isReversalTransaction(tx) {
  const receipt = String(tx?.receipt_number || '').toUpperCase()
  const description = String(tx?.description || '').toLowerCase()
  return (
    tx?.is_retrieved === true
    || receipt.includes(':REV:')
    || description.includes('ters kayıt')
    || description.includes('iptal')
    || description.includes('geri alındi')
  )
}

function getBaseReceiptNumber(receiptNumber) {
  const value = String(receiptNumber || '').trim()
  if (!value) return ''
  const markerIndex = value.toUpperCase().indexOf(':REV:')
  return markerIndex >= 0 ? value.slice(0, markerIndex) : value
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\u0131/g, 'i')
    .replace(/\u015f/g, 's')
    .replace(/\u011f/g, 'g')
    .replace(/\u00e7/g, 'c')
    .replace(/\u00f6/g, 'o')
    .replace(/\u00fc/g, 'u')
}

function getExpenseKind(tx, categoryName = '') {
  if (tx?.transaction_type !== 'expense') return ''
  if (isReversalTransaction(tx)) return 'reversal'

  const receipt = String(tx?.receipt_number || '').toUpperCase()
  const category = normalizeText(categoryName)
  const description = normalizeText(tx?.description)

  if (receipt.startsWith('PAYROLL:') || category.includes('maas') || description.includes('maas')) return 'salary'
  if (tx?.service || category.includes('servis')) return 'service'
  return 'other'
}

function getIncomeKind(tx, categoryName = '') {
  if (tx?.transaction_type !== 'income') return ''
  if (isReversalTransaction(tx)) return 'reversal'

  const receipt = String(tx?.receipt_number || '').toUpperCase()
  const category = normalizeText(categoryName)
  const description = normalizeText(tx?.description)

  if (tx?.service || category.includes('servis')) return 'service'
  if (
    category.includes('tahsil') ||
    description.includes('tahsil') ||
    description.includes('ödeme') ||
    receipt.startsWith('PAY:')
  ) return 'collection'
  return 'other'
}

const emptyAccountForm = {
  name: '',
  account_type: 'cash',
  currency: 'TRY',
  balance: '',
}

const emptyCategoryForm = {
  name: '',
  type: 'expense',
}

const createDefaultTransactionDate = () => {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

const emptyTransactionForm = {
  transaction_type: 'expense',
  account: '',
  category: '',
  amount: '',
  date: createDefaultTransactionDate(),
  description: '',
  receipt_number: '',
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

  const firstEntry = Object.entries(data).find(([, value]) => value)
  if (!firstEntry) return fallback

  const [, value] = firstEntry
  if (Array.isArray(value) && value.length > 0) return String(value[0])
  if (typeof value === 'string') return value
  return fallback
}

function formatCurrency(value, currency = 'TRY') {
  const numeric = Number(value || 0)
  if (Number.isNaN(numeric)) return '0.00'

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency || 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric)
}

function formatDate(value) {
  if (!value) return '-'

  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return '-'

  return dt.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const StatCard = ({ title, value, countText, countLabel = 'Kayıt Sayısı:', bgColor, textLight = true, footerText }) => (
  <Card
    className="border-0 shadow-sm h-100"
    style={{
      backgroundColor: bgColor,
      color: textLight ? '#fff' : '#333',
      borderRadius: '12px',
    }}
  >
    <Card.Body className="d-flex flex-column justify-content-between p-3" style={{ minHeight: '110px' }}>
      <div>
        <small className="opacity-75 d-block mb-1 text-uppercase fw-semibold" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
          {title}
        </small>
        <h4 className="m-0 fw-bold" style={{ whiteSpace: 'nowrap', fontSize: '1.2rem' }}>
          {formatCurrency(value, 'TRY')}
        </h4>
      </div>
      {(countText !== undefined || footerText !== undefined) && (
        <div
          className="mt-2 pt-2 d-flex justify-content-between align-items-center"
          style={{
            borderTop: textLight ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.08)',
            fontSize: '0.75rem'
          }}
        >
          {countText !== undefined ? (
            <>
              <span className="opacity-75">{countLabel}</span>
              <span className="fw-bold">{countText}</span>
            </>
          ) : footerText}
        </div>
      )}
    </Card.Body>
  </Card>
)

const SummaryCards = ({ accounts, transactions, receivables, filtersActive }) => {
  const summary = useMemo(() => {
    let income = 0
    let incomeCount = 0
    let expense = 0
    let expenseCount = 0
    let reversal = 0
    let reversalCount = 0

    transactions.forEach((tx) => {
      const amount = Number(tx.amount || 0)
      const isReversal = isReversalTransaction(tx)

      if (isReversal) {
        reversal += amount
        reversalCount++
      } else {
        if (tx.transaction_type === 'income') {
          income += amount
          incomeCount++
        } else if (tx.transaction_type === 'expense') {
          expense += amount
          expenseCount++
        }
      }
    })

    const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0)
    const uncollected = (receivables || []).reduce((sum, r) => sum + Number(r.remaining_amount || 0), 0)
    const net = income - expense

    return {
      totalBalance,
      income,
      incomeCount,
      reversal,
      reversalCount,
      expense,
      expenseCount,
      uncollected,
      net,
    }
  }, [accounts, transactions, receivables])

  return (
    <Row className="g-3 mb-4">
      <Col md={4} xl={2}>
        <StatCard
          title="Toplam Bakiye"
          value={summary.totalBalance}
          countText={accounts.length}
          countLabel="Hesap Sayısı:"
          bgColor="#3182ce"
        />
      </Col>
      <Col md={4} xl={2}>
        <StatCard
          title="Toplam Gelir"
          value={summary.income}
          countText={summary.incomeCount}
          bgColor="#38a169"
        />
      </Col>
      <Col md={4} xl={2}>
        <StatCard
          title="Toplam Gider"
          value={summary.expense}
          countText={summary.expenseCount}
          bgColor="#e53e3e"
        />
      </Col>
      <Col md={4} xl={2}>
        <StatCard
          title="Net Bakiye"
          value={summary.net}
          countText={transactions.length}
          bgColor="#5a67d8"
        />
      </Col>
      <Col md={4} xl={2}>
        <StatCard
          title="Tahsil Edilmemiş"
          value={summary.uncollected}
          countText={(receivables || []).length}
          countLabel="Fatura Sayısı:"
          bgColor="#dd6b20"
        />
      </Col>
      <Col md={4} xl={2}>
        <StatCard
          title="İptal / İade"
          value={summary.reversal}
          countText={summary.reversalCount}
          bgColor="#718096"
        />
      </Col>
    </Row>
  )
}

const AccountsTab = ({ accounts, loading, onRefresh, onFilterByAccount }) => {
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyAccountForm)
  const [balanceDisplay, setBalanceDisplay] = useState('')

  const openCreateModal = () => {
    setEditingId(null)
    setForm(emptyAccountForm)
    setBalanceDisplay('')
    setShowModal(true)
  }

  const openEditModal = (account) => {
    setEditingId(account.id)
    const bal = account.balance ?? ''
    setForm({
      name: account.name || '',
      account_type: account.account_type || 'cash',
      currency: account.currency || 'TRY',
      balance: bal,
    })
    setBalanceDisplay(bal !== '' ? Number(bal).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '')
    setShowModal(true)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)

    const payload = {
      name: form.name,
      account_type: form.account_type,
      currency: form.currency || 'TRY',
    }

    if (form.balance !== '' && form.balance !== null) {
      payload.balance = Number(form.balance)
    }

    try {
      if (editingId) {
        await api.patch(`/accounting/accounts/${editingId}/`, payload)
        toast.success('Hesap güncellendi.')
      } else {
        await api.post('/accounting/accounts/', payload)
        toast.success('Hesap oluşturuldu.')
      }

      setShowModal(false)
      await onRefresh()
    } catch (error) {
      toast.error(readApiError(error, 'Hesap kaydedilemedi.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bu hesabı silmek istediginize emin misiniz?')) return

    try {
      await api.delete(`/accounting/accounts/${id}/`)
      toast.success('Hesap silindi.')
      await onRefresh()
    } catch (error) {
      toast.error(readApiError(error, 'Hesap silinemedi.'))
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    )
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="m-0 fw-bold">Hesaplar</h5>
        <Button onClick={openCreateModal}>
          <FaPlus className="me-2" /> Hesap Ekle
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-5 text-muted bg-white rounded-3 border">
          Kayıtlı hesap bulunamadı.
        </div>
      ) : (
        <Row className="g-3">
          {accounts.map((account, idx) => {
            const palette = ACCOUNT_COLORS[idx % ACCOUNT_COLORS.length]
            return (
              <Col md={6} xl={4} key={account.id}>
                <Card
                  className="border-0 h-100"
                  style={{
                    background: palette.bg,
                    color: palette.text,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.25)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)' }}
                  onClick={() => onFilterByAccount && onFilterByAccount(account.id)}
                >
                  <Card.Body className="d-flex flex-column p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 className="fw-bold mb-1" style={{ color: palette.text }}>{account.name}</h5>
                        <Badge bg={palette.badge} text={palette.badge === 'light' ? 'dark' : undefined} className="fw-normal opacity-75">
                          {ACCOUNT_TYPE_LABELS[account.account_type] || account.account_type}
                        </Badge>
                      </div>
                      <div className="d-flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => openEditModal(account)}
                        >
                          Düzenle
                        </Button>
                      </div>
                    </div>
                    <div className="mt-auto pt-3 d-flex justify-content-between align-items-center" style={{ borderTop: `1px solid rgba(255,255,255,0.3)` }}>
                      <span className="small" style={{ color: palette.text, opacity: 0.8 }}>Bakiye {account.currency}</span>
                      <h4 className="m-0 fw-bold" style={{ color: palette.text, whiteSpace: 'nowrap' }}>{formatCurrency(account.balance, account.currency)}</h4>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title>{editingId ? 'Hesap Düzenle' : 'Yeni Hesap'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Hesap Adı</Form.Label>
              <Form.Control
                required
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </Form.Group>

            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Hesap Türü</Form.Label>
                  <Form.Select
                    value={form.account_type}
                    onChange={(e) => setForm((prev) => ({ ...prev, account_type: e.target.value }))}
                  >
                    <option value="cash">Nakit</option>
                    <option value="bank">Banka</option>
                    <option value="credit_card">Kredi Kartı</option>
                    <option value="other">Diğer</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Para Birimi</Form.Label>
                  <Form.Control
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mt-3">
              <Form.Label>Başlangıç Bakiyesi</Form.Label>
              <Form.Control
                type="text"
                inputMode="decimal"
                placeholder="Örn: 9.000,00"
                value={balanceDisplay}
                onChange={(e) => {
                  const raw = e.target.value
                  setBalanceDisplay(raw)
                  // Temizle ve sayiya cevir
                  const cleaned = raw.replace(/\./g, '').replace(',', '.')
                  const numeric = parseFloat(cleaned)
                  setForm((prev) => ({ ...prev, balance: raw === '' ? '' : (isNaN(numeric) ? prev.balance : numeric) }))
                }}
                onBlur={() => {
                  const num = Number(form.balance)
                  if (form.balance !== '' && !isNaN(num)) {
                    setBalanceDisplay(num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                  } else if (form.balance === '') {
                    setBalanceDisplay('')
                  }
                }}
                onFocus={() => {
                  if (form.balance !== '' && form.balance !== null && !isNaN(Number(form.balance))) {
                    setBalanceDisplay(String(form.balance))
                  }
                }}
              />
              <Form.Text className="text-muted">Rakam girin, alandan çıkınca otomatik formatlanır. (Örn: 9000 → 9.000,00)</Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}

const CategoriesTab = ({ categories, loading, onRefresh }) => {
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyCategoryForm)

  const openCreateModal = () => {
    setEditingId(null)
    setForm(emptyCategoryForm)
    setShowModal(true)
  }

  const openEditModal = (category) => {
    setEditingId(category.id)
    setForm({
      name: category.name || '',
      type: category.type || 'expense',
    })
    setShowModal(true)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      if (editingId) {
        await api.patch(`/accounting/transaction-categories/${editingId}/`, form)
        toast.success('Kategori güncellendi.')
      } else {
        await api.post('/accounting/transaction-categories/', form)
        toast.success('Kategori eklendi.')
      }

      setShowModal(false)
      await onRefresh()
    } catch (error) {
      toast.error(readApiError(error, 'Kategori kaydedilemedi.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return

    try {
      await api.delete(`/accounting/transaction-categories/${id}/`)
      toast.success('Kategori silindi.')
      await onRefresh()
    } catch (error) {
      toast.error(readApiError(error, 'Kategori silinemedi.'))
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    )
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="m-0 fw-bold">İşlem Kategorileri</h5>
        <Button onClick={openCreateModal}>
          <FaPlus className="me-2" /> Kategori Ekle
        </Button>
      </div>

      <Card className="border-0 shadow-sm rounded-3 overflow-hidden">
        <Table responsive hover className="m-0 align-middle">
          <thead className="bg-light">
            <tr>
              <th>Kategori</th>
              <th>Tip</th>
              <th className="text-end">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-4 text-muted">
                  Kategori bulunamadı.
                </td>
              </tr>
            ) : null}

            {categories.map((category) => (
              <tr key={category.id}>
                <td className="fw-semibold">{category.name}</td>
                <td>
                  <Badge bg={category.type === 'income' ? 'success' : 'danger'}>
                    {TRANSACTION_TYPE_LABELS[category.type] || category.type}
                  </Badge>
                </td>
                <td className="text-end">
                  <div className="d-flex justify-content-end gap-2">
                    <Button size="sm" variant="outline-primary" onClick={() => openEditModal(category)}>Düzenle</Button>
                    <Button size="sm" variant="outline-danger" onClick={() => handleDelete(category.id)}>
                      <FaTrash />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title>{editingId ? 'Kategori Düzenle' : 'Yeni Kategori'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Kategori Adı</Form.Label>
              <Form.Control
                required
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Tip</Form.Label>
              <Form.Select
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              >
                <option value="income">Gelir</option>
                <option value="expense">Gider</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}

const TransactionsTab = ({
  accounts,
  categories,
  transactions,
  loading,
  filters,
  onChangeFilter,
  onRefresh,
  onOpenService,
}) => {
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState(emptyTransactionForm)

  const accountMap = useMemo(() => {
    const map = {}
    accounts.forEach((item) => {
      map[item.id] = item
    })
    return map
  }, [accounts])

  const transactionRelationMap = useMemo(() => {
    const map = {}
    const originalsByReceipt = new Map()

    transactions.forEach((tx) => {
      if (isReversalTransaction(tx)) return
      const receipt = getBaseReceiptNumber(tx.receipt_number)
      if (!receipt) return
      originalsByReceipt.set(receipt, tx)
    })

    transactions.forEach((tx) => {
      if (!isReversalTransaction(tx)) return
      const baseReceipt = getBaseReceiptNumber(tx.receipt_number)
      if (!baseReceipt) return

      const original = originalsByReceipt.get(baseReceipt)
      if (!original) return

      map[original.id] = {
        kind: 'reversed-original',
        relatedId: tx.id,
        relatedDate: tx.date,
      }
      map[tx.id] = {
        kind: 'reversal-entry',
        relatedId: original.id,
        relatedDate: original.date,
      }
    })

    return map
  }, [transactions])

  const categoryMap = useMemo(() => {
    const map = {}
    categories.forEach((item) => {
      map[item.id] = item
    })
    return map
  }, [categories])

  const visibleTransactions = useMemo(() => {
    return transactions.filter((tx) => transactionRelationMap[tx.id]?.kind !== 'reversal-entry')
  }, [transactions, transactionRelationMap])

  const categoryOptions = useMemo(() => {
    return categories.filter((category) => category.type === form.transaction_type)
  }, [categories, form.transaction_type])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)

    const payload = {
      transaction_type: form.transaction_type,
      account: form.account,
      amount: Number(form.amount),
      date: new Date(form.date).toISOString(),
      description: form.description,
      receipt_number: form.receipt_number,
    }

    if (form.category) payload.category = form.category

    try {
      await api.post('/accounting/transactions/', payload)
      toast.success('Hareket eklendi.')
      setShowModal(false)
      setForm(emptyTransactionForm)
      await onRefresh()
    } catch (error) {
      toast.error(readApiError(error, 'Hareket kaydedilemedi.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenModal = () => {
    if (accounts.length === 0) {
      toast.error('İşlem eklemek için önce bir hesap oluşturun.')
      return
    }

    setForm((prev) => ({
      ...emptyTransactionForm,
      account: prev.account || accounts[0]?.id || '',
      category: '',
    }))
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    )
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h5 className="m-0 fw-bold">Gelir / Gider Hareketleri</h5>
        <Button onClick={handleOpenModal}>
          <FaPlus className="me-2" /> Hareket Ekle
        </Button>
      </div>

      <Card className="border-0 shadow-sm rounded-3 mb-3">
        <Card.Body>
          <Row className="g-2 align-items-end flex-lg-nowrap">
            <Col xs={12} md={6} lg={2}>
              <Form.Group>
                <Form.Label>İşlem Türü</Form.Label>
                <Form.Select
                  value={filters.transaction_type}
                  onChange={(e) => {
                    const nextType = e.target.value
                    onChangeFilter('transaction_type', nextType)
                    if (nextType === 'income') {
                      onChangeFilter('expense_kind', '')
                    }
                    if (nextType === 'expense') {
                      onChangeFilter('income_kind', '')
                    }
                    if (!nextType) {
                      onChangeFilter('expense_kind', '')
                      onChangeFilter('income_kind', '')
                    }
                  }}
                >
                  <option value="">Hepsi</option>
                  <option value="income">Gelir</option>
                  <option value="expense">Gider</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} md={6} lg={2}>
              <Form.Group>
                <Form.Label>Hesap</Form.Label>
                <Form.Select value={filters.account} onChange={(e) => onChangeFilter('account', e.target.value)}>
                  <option value="">Tüm Hesaplar</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} md={6} lg={2}>
              <Form.Group>
                <Form.Label>Kategori</Form.Label>
                <Form.Select
                  value={filters.category}
                  onChange={(e) => onChangeFilter('category', e.target.value)}
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({TRANSACTION_TYPE_LABELS[category.type] || category.type})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} md={6} lg={2}>
              <Form.Group>
                <Form.Label>Gider Türü</Form.Label>
                <Form.Select
                  value={filters.expense_kind}
                  onChange={(e) => onChangeFilter('expense_kind', e.target.value)}
                  disabled={filters.transaction_type === 'income'}
                >
                  <option value="">Hepsi</option>
                  <option value="salary">Maaş</option>
                  <option value="reversal">İptal / İade</option>
                  <option value="service">Servis</option>
                  <option value="other">Diğer</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} md={6} lg={2}>
              <Form.Group>
                <Form.Label>Gelir Türü</Form.Label>
                <Form.Select
                  value={filters.income_kind}
                  onChange={(e) => onChangeFilter('income_kind', e.target.value)}
                  disabled={filters.transaction_type === 'expense'}
                >
                  <option value="">Hepsi</option>
                  <option value="collection">Tahsilat</option>
                  <option value="reversal">İptal / İade</option>
                  <option value="service">Servis</option>
                  <option value="other">Diğer</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} md={6} lg="auto" className="d-flex align-items-end">
              <Button
                variant="outline-secondary"
                className="text-nowrap px-3 w-100" style={{ minHeight: "38px", whiteSpace: "nowrap" }}
                onClick={() => {
                  onChangeFilter('transaction_type', '')
                  onChangeFilter('account', '')
                  onChangeFilter('category', '')
                  onChangeFilter('expense_kind', '')
                  onChangeFilter('income_kind', '')
                }}
              >
                Temizle
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm rounded-3 overflow-hidden">
        <Table responsive hover className="m-0 align-middle">
          <thead className="bg-light">
            <tr>
              <th>Tarih</th>
              <th>Tür</th>
              <th>Hesap</th>
              <th>Kategori</th>
              <th>Tutar</th>
              <th>Açıklama</th>
              <th>Makbuz No</th>
            </tr>
          </thead>
          <tbody>
            {visibleTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4 text-muted">
                  Hareket bulunamadı.
                </td>
              </tr>
            ) : null}

            {visibleTransactions.map((tx) => {
              const account = accountMap[tx.account]
              const category = categoryMap[tx.category]
              const colorClass = tx.transaction_type === 'income' ? 'text-success' : 'text-danger'
              const sign = tx.transaction_type === 'income' ? '+' : '-'
              const isReversal = isReversalTransaction(tx)
              const isRetrieved = tx.is_retrieved === true
              const relation = transactionRelationMap[tx.id] || null
              const isLinkedOriginal = relation?.kind === 'reversed-original'
              const typeLabel = isReversal
                ? 'İptal / İade'
                : (TRANSACTION_TYPE_LABELS[tx.transaction_type] || tx.transaction_type)
              const badgeVariant = isReversal
                ? 'warning'
                : (tx.transaction_type === 'income' ? 'success' : 'danger')
              const hasService = Boolean(tx.service)

              return (
                <tr
                  key={tx.id}
                  style={{
                    cursor: hasService ? 'pointer' : 'default',
                    opacity: (isRetrieved || isLinkedOriginal) ? 0.45 : 1,
                    textDecoration: (isRetrieved || isLinkedOriginal) ? 'line-through' : 'none',
                    backgroundColor: (isRetrieved || isLinkedOriginal) ? '#f8f9fa' : undefined,
                  }}
                  onClick={hasService && onOpenService ? () => onOpenService(tx.service) : undefined}
                  title={(isRetrieved || isLinkedOriginal) ? 'Bu işlem iptal edildi' : (hasService ? 'Servis detayını görüntüle' : undefined)}
                >
                  <td>{formatDate(tx.date)}</td>
                  <td>
                    <Badge bg={badgeVariant} text={isReversal ? 'dark' : undefined}>
                      {typeLabel}
                    </Badge>
                    {(isRetrieved || isLinkedOriginal) && (
                      <Badge bg="secondary" className="ms-1" style={{ fontSize: '0.7rem' }}>
                        İptal Edildi
                      </Badge>
                    )}
                    {hasService && !isRetrieved && (
                      <Badge bg="info" className="ms-1" style={{ fontSize: '0.7rem' }}>
                        Servis
                      </Badge>
                    )}

                  </td>
                  <td>{account?.name || '-'}</td>
                  <td>{category?.name || '-'}</td>
                  <td className={`fw-semibold ${colorClass}`} style={{ whiteSpace: 'nowrap' }}>
                    <div>{sign} {formatCurrency(tx.amount, account?.currency || 'TRY')}</div>

                  </td>
                  <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={tx.description || ''}>
                    {tx.description || '-'}
                  </td>
                  <td title={tx.receipt_number || ''}>
                    {tx.receipt_number ? (tx.receipt_number.length > 10 ? tx.receipt_number.slice(0, 8) + '...' : tx.receipt_number) : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>Yeni Hareket</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>İşlem Turu</Form.Label>
                  <Form.Select
                    value={form.transaction_type}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        transaction_type: e.target.value,
                        category: '',
                      }))
                    }
                  >
                    <option value="income">Gelir</option>
                    <option value="expense">Gider</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Hesap</Form.Label>
                  <Form.Select
                    required
                    value={form.account}
                    onChange={(e) => setForm((prev) => ({ ...prev, account: e.target.value }))}
                  >
                    <option value="">Seçiniz</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Kategori (Opsiyonel)</Form.Label>
                  <Form.Select
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="">Seçiniz</option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Tutar</Form.Label>
                  <Form.Control
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Tarih</Form.Label>
                  <Form.Control
                    required
                    type="datetime-local"
                    value={form.date}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Makbuz No</Form.Label>
                  <Form.Control
                    value={form.receipt_number}
                    onChange={(e) => setForm((prev) => ({ ...prev, receipt_number: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Açıklama</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}

function Accounting() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('accounts')

  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])

  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(true)
  const [receivables, setReceivables] = useState([])
  const [loadingReceivables, setLoadingReceivables] = useState(true)

  const [filters, setFilters] = useState({
    transaction_type: '',
    account: '',
    category: '',
    expense_kind: '',
    income_kind: '',
  })

  // Tarih ve dönem filtreleme durumları
  const [periodType, setPeriodType] = useState('monthly')
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())
  const [filterMonth, setFilterMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'))

  const currentYear = new Date().getFullYear()
  const years = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => (currentYear - i).toString())
  }, [currentYear])

  const [openServiceId, setOpenServiceId] = useState(null)

  useEffect(() => {
    if (periodType === 'yearly') {
      setFilterMonth('ALL')
    } else if (periodType === 'monthly' && filterMonth === 'ALL') {
      setFilterMonth((new Date().getMonth() + 1).toString().padStart(2, '0'))
    }
  }, [periodType, filterMonth])

  const periodLabel = useMemo(() => {
    if (periodType === 'yearly') {
      return filterYear === 'ALL' ? 'Tüm Yıllar' : `${filterYear} Yılı`
    }
    if (periodType === 'monthly') {
      const monthLabel = MONTH_OPTIONS.find((m) => m.value === filterMonth)?.label || 'Tüm Aylar'
      const yearLabel = filterYear === 'ALL' ? '' : ` ${filterYear}`
      return `${monthLabel}${yearLabel}`
    }
    return 'Tüm Dönemler'
  }, [periodType, filterYear, filterMonth])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.date) return true
      const dateStr = String(t.date)
      if (periodType !== 'ALL') {
        if (filterYear !== 'ALL' && !dateStr.startsWith(filterYear)) return false
        if (periodType === 'monthly' && filterMonth !== 'ALL') {
          const parts = dateStr.split('-')
          if (parts.length > 1 && parts[1] !== filterMonth) return false
        }
      }
      return true
    })
  }, [transactions, periodType, filterYear, filterMonth])

  const filtersActive = Boolean(
    filters.transaction_type ||
    filters.account ||
    filters.category ||
    filters.expense_kind ||
    filters.income_kind ||
    periodType !== 'ALL'
  )

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    try {
      const response = await api.get('/accounting/accounts/')
      setAccounts(toList(response.data))
    } catch (error) {
      toast.error(readApiError(error, 'Hesaplar yüklenemedi.'))
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true)
    try {
      const response = await api.get('/accounting/transaction-categories/')
      setCategories(toList(response.data))
    } catch (error) {
      toast.error(readApiError(error, 'Kategoriler yüklenemedi.'))
    } finally {
      setLoadingCategories(false)
    }
  }, [])

  const loadTransactions = useCallback(async (nextFilters) => {
    setLoadingTransactions(true)

    const params = {}
    if (nextFilters.transaction_type) params.transaction_type = nextFilters.transaction_type
    if (nextFilters.account) params.account = nextFilters.account
    if (nextFilters.category) params.category = nextFilters.category

    try {
      const response = await api.get('/accounting/transactions/', { params })
      const rows = toList(response.data)
      const categoryNameById = {}
      categories.forEach((item) => {
        categoryNameById[item.id] = item.name || ''
      })

      let filteredRows = rows
      if (nextFilters.expense_kind) {
        filteredRows = filteredRows.filter((tx) => (
          getExpenseKind(tx, categoryNameById[tx.category]) === nextFilters.expense_kind
        ))
      }

      if (nextFilters.income_kind) {
        filteredRows = filteredRows.filter((tx) => (
          getIncomeKind(tx, categoryNameById[tx.category]) === nextFilters.income_kind
        ))
      }

      filteredRows.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      setTransactions(filteredRows)
    } catch (error) {
      toast.error(readApiError(error, 'Hareketler yüklenemedi.'))
    } finally {
      setLoadingTransactions(false)
    }
  }, [categories])

  const loadReceivables = useCallback(async () => {
    setLoadingReceivables(true)
    try {
      const response = await api.get('/reports/overdue-receivables/', { params: { limit: 200 } })
      const rows = toList(response?.data)
      setReceivables(rows)
    } catch (error) {
      toast.error(readApiError(error, 'Alacak listesi yüklenemedi.'))
    } finally {
      setLoadingReceivables(false)
    }
  }, [])

  useEffect(() => {
    loadAccounts()
    loadCategories()
    loadReceivables()
  }, [loadAccounts, loadCategories, loadReceivables])

  useEffect(() => {
    loadTransactions(filters)
  }, [filters, loadTransactions])

  const handleChangeFilter = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleHardRefresh = async () => {
    await Promise.all([loadAccounts(), loadCategories(), loadTransactions(filters), loadReceivables()])
    toast.success('Muhasebe verileri güncellendi.')
  }

  const openServiceDetailFromReceivable = async (serviceId) => {
    if (!serviceId) return
    setOpenServiceId(serviceId)
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h3 className="fw-bold m-0 text-light d-flex align-items-center">
          <FaMoneyCheckAlt className="me-3 text-warning" style={{ fontSize: '1.8rem' }} />
          Finans ve Muhasebe
        </h3>
        <Button variant="outline-light" onClick={handleHardRefresh}>
          <FaSync className="me-2" /> Yenile
        </Button>
      </div>

      {/* Dönem / Tarih Filtresi */}
      <Card className="border-0 shadow-sm rounded-4 mb-4 bg-light">
        <Card.Body className="p-3">
          <Row className="g-3 align-items-center">
            <Col xs="auto" className="d-flex align-items-center">
              <span className="me-2 text-muted fw-bold small">Dönem:</span>
              <div className="btn-group" role="group">
                <Button
                  size="sm"
                  variant={periodType === 'monthly' ? 'primary' : 'outline-secondary'}
                  onClick={() => setPeriodType('monthly')}
                >
                  Aylık
                </Button>
                <Button
                  size="sm"
                  variant={periodType === 'yearly' ? 'primary' : 'outline-secondary'}
                  onClick={() => setPeriodType('yearly')}
                >
                  Yıllık
                </Button>
                <Button
                  size="sm"
                  variant={periodType === 'ALL' ? 'primary' : 'outline-secondary'}
                  onClick={() => setPeriodType('ALL')}
                >
                  Tüm Dönem
                </Button>
              </div>
            </Col>
            {periodType !== 'ALL' && (
              <Col xs="auto">
                <Form.Select
                  size="sm"
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  style={{ width: '120px' }}
                >
                  <option value="ALL">Tüm Yıllar</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Form.Select>
              </Col>
            )}
            {periodType === 'monthly' && (
              <Col xs="auto">
                <Form.Select
                  size="sm"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  style={{ width: '120px' }}
                >
                  <option value="ALL">Tüm Aylar</option>
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Form.Select>
              </Col>
            )}
            <Col className="text-end">
              <span className="text-muted small">
                Seçili Dönem: <strong className="text-dark">{periodLabel}</strong>
              </span>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <SummaryCards accounts={accounts} transactions={filteredTransactions} receivables={receivables} filtersActive={filtersActive} />

      <Card className="border-0 shadow-lg rounded-4 overflow-hidden">
        <Card.Body className="p-0">
          <Tabs
            activeKey={activeTab}
            onSelect={(nextTab) => setActiveTab(nextTab || 'accounts')}
            className="border-bottom px-4 pt-3 bg-light"
          >
            <Tab
              eventKey="accounts"
              title={
                <span className="fw-semibold">
                  <FaWallet className="me-2" /> Hesaplar
                </span>
              }
            >
              <div className="p-4">
                <AccountsTab
                  accounts={accounts}
                  loading={loadingAccounts}
                  onRefresh={loadAccounts}
                  onFilterByAccount={(accountId) => {
                    handleChangeFilter('account', accountId)
                    setActiveTab('transactions')
                  }}
                />
              </div>
            </Tab>

            <Tab
              eventKey="categories"
              title={
                <span className="fw-semibold">
                  <FaFolderOpen className="me-2" /> Kategoriler
                </span>
              }
            >
              <div className="p-4">
                <CategoriesTab categories={categories} loading={loadingCategories} onRefresh={loadCategories} />
              </div>
            </Tab>

            <Tab
              eventKey="transactions"
              title={
                <span className="fw-semibold">
                  <FaExchangeAlt className="me-2" /> Hareketler
                </span>
              }
            >
              <div className="p-4">
                <TransactionsTab
                  accounts={accounts}
                  categories={categories}
                  transactions={filteredTransactions}
                  loading={loadingTransactions}
                  filters={filters}
                  onChangeFilter={handleChangeFilter}
                  onRefresh={() => loadTransactions(filters)}
                  onOpenService={openServiceDetailFromReceivable}
                />
              </div>
            </Tab>

            <Tab
              eventKey="receivables"
              title={
                <span className="fw-semibold">
                  <FaRegClock className="me-2" /> Alacaklar
                </span>
              }
            >
              <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="m-0 fw-bold">Vadesi Geçmiş Alacaklar</h5>
                  <h4 className="m-0 fw-bold text-danger">
                    Toplam: {formatCurrency(receivables.reduce((acc, r) => acc + Number(r.remaining_amount || 0), 0), 'TRY')}
                  </h4>
                </div>
                {loadingReceivables ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" />
                  </div>
                ) : (
                  <Card className="border-0 shadow-sm rounded-3 overflow-hidden">
                    <Table responsive hover className="m-0 align-middle">
                      <thead className="bg-light">
                        <tr>
                          <th>Fiş No</th>
                          <th>Müşteri</th>
                          <th>Telefon</th>
                          <th>Randevu</th>
                          <th>Durum</th>
                          <th>Toplam</th>
                          <th>Ödenen</th>
                          <th>Kalan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receivables.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-4 text-muted">
                              Vadesi geçmiş alacak bulunamadı.
                            </td>
                          </tr>
                        ) : null}
                        {receivables.map((row) => (
                          <tr
                            key={row.service_id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => openServiceDetailFromReceivable(row.service_id)}
                            title="Servis detayini ac"
                          >
                            <td className="fw-semibold">#{row.receipt_number || '-'}</td>
                            <td>{row.customer_full_name || '-'}</td>
                            <td>{row.customer_phone || '-'}</td>
                            <td>{formatDate(row.scheduled_date)}</td>
                            <td>
                              {(() => {
                                const meta = getServiceStatusMeta(row.service_status)
                                return <Badge bg={meta.badge}>{meta.label}</Badge>
                              })()}
                            </td>
                            <td>{formatCurrency(row.total_amount, 'TRY')}</td>
                            <td>{formatCurrency(row.paid_amount, 'TRY')}</td>
                            <td className="fw-bold text-danger">{formatCurrency(row.remaining_amount, 'TRY')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card>
                )}
              </div>
            </Tab>

          </Tabs>
        </Card.Body>
      </Card>

      {openServiceId && (
        <Services
          renderAsModalOnly={true}
          initialServiceId={openServiceId}
          onCloseModal={() => {
            setOpenServiceId(null)
            loadReceivables()
            loadTransactions(filters)
          }}
        />
      )}
    </div>
  )
}

export default Accounting

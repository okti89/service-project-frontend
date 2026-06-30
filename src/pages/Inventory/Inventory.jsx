import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Col, Dropdown, Form, Modal, Row, Spinner, Tab, Table, Tabs } from 'react-bootstrap'
import { FaBoxes, FaEdit, FaPlus, FaSearch, FaSyncAlt, FaTimes, FaTrash, FaWarehouse } from 'react-icons/fa'
import toast from 'react-hot-toast'

import api from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import './Inventory.css'

const emptyProductForm = {
  name: '',
  code: '',
  category_id: '',
  price: '',
  stock_quantity: 0,
  description: '',
  is_active: true,
  image: null,
}

const emptyMovementForm = {
  product_id: '',
  technician: '',
  movement_type: 'in',
  quantity: 1,
  description: '',
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
  if (typeof data.error === 'string') return data.error

  const first = Object.entries(data).find(([, value]) => value)
  if (!first) return fallback

  const [, value] = first
  if (Array.isArray(value) && value.length > 0) return String(value[0])
  if (typeof value === 'string') return value
  return fallback
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

function currency(value) {
  return Number(value || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const Inventory = () => {
  const { user } = useAuth()

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [movements, setMovements] = useState([])
  const [technicians, setTechnicians] = useState([])

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [isSavingMovement, setIsSavingMovement] = useState(false)
  const [isSavingCategory, setIsSavingCategory] = useState(false)
  const [isInlineCategorySaving, setIsInlineCategorySaving] = useState(false)
  const [inlineCategoryName, setInlineCategoryName] = useState('')
  const [showInlineCategory, setShowInlineCategory] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [movementSearch, setMovementSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [movementProductFilter, setMovementProductFilter] = useState('')
  const [movementTypeFilter, setMovementTypeFilter] = useState('')
  const [movementDateFrom, setMovementDateFrom] = useState('')
  const [movementDateTo, setMovementDateTo] = useState('')
  const [movementTechnicianFilter, setMovementTechnicianFilter] = useState('')
  const [activeTab, setActiveTab] = useState('products')

  const [showProductModal, setShowProductModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [showProductMovementsModal, setShowProductMovementsModal] = useState(false)
  const [showProductDetailModal, setShowProductDetailModal] = useState(false)
  const [isProductDetailLoading, setIsProductDetailLoading] = useState(false)
  const [productDetailMovements, setProductDetailMovements] = useState([])

  const [selectedImage, setSelectedImage] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedProductMovements, setSelectedProductMovements] = useState([])
  const [isProductMovementsLoading, setIsProductMovementsLoading] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [movementForm, setMovementForm] = useState(emptyMovementForm)
  const [newCategoryName, setNewCategoryName] = useState('')

  const fetchAll = async (silent = false) => {
    if (silent) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const [productsRes, categoriesRes, movementsRes, techniciansRes] = await Promise.all([
        api.get('/products/products/'),
        api.get('/products/categories/'),
        api.get('/products/stock-movements/'),
        api.get('/technicians/technician-list/?include_inactive=false').catch(() => ({ data: [] })),
      ])

      setProducts(toList(productsRes.data))
      setCategories(toList(categoriesRes.data))
      setMovements(toList(movementsRes.data))
      setTechnicians(toList(techniciansRes.data))
    } catch (error) {
      toast.error(readApiError(error, 'Stok verileri yüklenemedi.'))
    } finally {
      if (silent) setIsRefreshing(false)
      else setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (!showMovementModal) return
    if (movementForm.product_id) return
    if (!products.length) return
    setMovementForm((prev) => ({ ...prev, product_id: products[0].id }))
  }, [products, movementForm.product_id, showMovementModal])

  useEffect(() => {
    if (!showMovementModal) return
    if (movementForm.technician) return

    const currentUserId = user?.id || ''
    const hasCurrentUser = technicians.some((tech) => String(tech?.user?.id) === String(currentUserId))
    if (hasCurrentUser) {
      setMovementForm((prev) => ({ ...prev, technician: currentUserId }))
      return
    }

    const firstTechUserId = technicians[0]?.user?.id || ''
    if (firstTechUserId) {
      setMovementForm((prev) => ({ ...prev, technician: firstTechUserId }))
    }
  }, [movementForm.technician, showMovementModal, technicians, user?.id])

  const openCreateProduct = () => {
    setEditingProduct(null)
    setProductForm(emptyProductForm)
    setShowInlineCategory(false)
    setInlineCategoryName('')
    setShowProductModal(true)
  }

  const openEditProduct = (product) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name || '',
      code: product.code || '',
      category_id: product.category_detail?.id || '',
      price: product.price ?? '',
      stock_quantity: product.stock_quantity ?? 0,
      description: product.description || '',
      is_active: Boolean(product.is_active),
      image: null,
    })
    setShowInlineCategory(false)
    setInlineCategoryName('')
    setShowProductModal(true)
  }

  const closeProductModal = () => {
    setShowProductModal(false)
    setEditingProduct(null)
    setProductForm(emptyProductForm)
    setShowInlineCategory(false)
    setInlineCategoryName('')
  }

  const handleProductField = (event) => {
    const { name, type, checked, value } = event.target
    setProductForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleProductImage = (event) => {
    const file = event.target.files?.[0] || null
    setProductForm((prev) => ({ ...prev, image: file }))
  }

  const submitProduct = async (event) => {
    event.preventDefault()
    if (isSavingProduct) return
    setIsSavingProduct(true)

    const payload = new FormData()
    payload.append('name', productForm.name)
    payload.append('price', String(productForm.price || 0))
    payload.append('stock_quantity', String(productForm.stock_quantity || 0))
    payload.append('is_active', String(Boolean(productForm.is_active)))

    if (productForm.category_id) payload.append('category_id', productForm.category_id)
    if (productForm.code) payload.append('code', productForm.code)
    if (productForm.description) payload.append('description', productForm.description)
    if (productForm.image) payload.append('image', productForm.image)

    try {
      if (editingProduct?.id) {
        await api.patch(`/products/products/${editingProduct.id}/`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        toast.success('Ürün güncellendi.')
      } else {
        await api.post('/products/products/', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        toast.success('Ürün eklendi.')
      }

      closeProductModal()
      await fetchAll(true)
    } catch (error) {
      toast.error(readApiError(error, 'Ürün kaydedilemedi.'))
    } finally {
      setIsSavingProduct(false)
    }
  }

  const deleteProduct = async (productId) => {
    if (!window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) return

    try {
      await api.delete(`/products/products/${productId}/`)
      toast.success('Ürün silindi.')
      await fetchAll(true)
    } catch (error) {
      toast.error(readApiError(error, 'Ürün silinemedi.'))
    }
  }

  const toggleProductActive = async (product) => {
    const nextActive = !Boolean(product.is_active)
    setProducts((prev) => prev.map((item) => (item.id === product.id ? { ...item, is_active: nextActive } : item)))

    try {
      await api.patch(`/products/products/${product.id}/`, { is_active: nextActive })
    } catch (error) {
      toast.error(readApiError(error, 'Durum güncellenemedi.'))
      await fetchAll(true)
    }
  }

  const addCategory = async (event) => {
    event.preventDefault()
    if (isSavingCategory) return

    const name = String(newCategoryName || '').trim()
    if (!name) {
      toast.error('Kategori adı zorunlu.')
      return
    }

    setIsSavingCategory(true)
    try {
      await api.post('/products/categories/', { name })
      setNewCategoryName('')
      toast.success('Kategori eklendi.')
      await fetchAll(true)
    } catch (error) {
      toast.error(readApiError(error, 'Kategori eklenemedi.'))
    } finally {
      setIsSavingCategory(false)
    }
  }

  const deleteCategory = async (categoryId) => {
    if (!window.confirm('Kategori silinsin mi? Bu kategoriye bağlı ürünler kategorisiz kalabilir.')) return

    try {
      await api.delete(`/products/categories/${categoryId}/`)
      toast.success('Kategori silindi.')
      await fetchAll(true)
    } catch (error) {
      toast.error(readApiError(error, 'Kategori silinemedi.'))
    }
  }

  const submitInlineCategory = async () => {
    const name = String(inlineCategoryName || '').trim()
    if (!name) {
      toast.error('Kategori adı zorunlu.')
      return
    }
    if (isInlineCategorySaving) return

    setIsInlineCategorySaving(true)
    try {
      const response = await api.post('/products/categories/', { name })
      const created = response?.data
      if (created && created.id) {
        setCategories((prev) => {
          const exists = prev.some((cat) => cat.id === created.id)
          if (exists) return prev
          return [...prev, created]
        })
        setProductForm((prev) => ({ ...prev, category_id: created.id }))
      } else {
        await fetchAll(true)
      }
      setInlineCategoryName('')
      setShowInlineCategory(false)
      toast.success('Kategori eklendi.')
    } catch (error) {
      toast.error(readApiError(error, 'Kategori eklenemedi.'))
    } finally {
      setIsInlineCategorySaving(false)
    }
  }

  const cancelInlineCategory = () => {
    setInlineCategoryName('')
    setShowInlineCategory(false)
  }

  const openMovementModal = () => {
    setMovementForm(emptyMovementForm)
    setShowMovementModal(true)
  }

  const submitMovement = async (event) => {
    event.preventDefault()
    if (isSavingMovement) return

    if (!movementForm.product_id) {
      toast.error('Ürün seçmelisiniz.')
      return
    }
    if (!movementForm.technician) {
      toast.error('Teknisyen seçmelisiniz.')
      return
    }

    setIsSavingMovement(true)
    try {
      await api.post('/products/stock-movements/', {
        product_id: movementForm.product_id,
        technician: movementForm.technician,
        movement_type: movementForm.movement_type,
        quantity: Number(movementForm.quantity || 0),
        description: movementForm.description || '',
      })
      toast.success('Stok hareketi eklendi.')
      setShowMovementModal(false)
      setMovementForm(emptyMovementForm)
      await fetchAll(true)
    } catch (error) {
      toast.error(readApiError(error, 'Stok hareketi eklenemedi.'))
    } finally {
      setIsSavingMovement(false)
    }
  }

  const deleteMovement = async (movementId) => {
    if (!window.confirm('Bu stok hareketi iptal edilsin mi?')) return

    try {
      await api.delete(`/products/stock-movements/${movementId}/`)
      toast.success('Stok hareketi iptal edildi.')
      await fetchAll(true)
    } catch (error) {
      toast.error(readApiError(error, 'Stok hareketi silinemedi.'))
    }
  }

  const openProductMovements = async (product) => {
    setMovementProductFilter(product.id)
    setActiveTab('movements')
    setShowProductMovementsModal(false)
  }

  const openProductDetail = async (product) => {
    setSelectedProduct(product)
    setShowProductDetailModal(true)
    setIsProductDetailLoading(true)
    setProductDetailMovements([])
    try {
      const response = await api.get('/products/stock-movements/', { params: { product: product.id } })
      setProductDetailMovements(toList(response.data))
    } catch {
      setProductDetailMovements([])
    } finally {
      setIsProductDetailLoading(false)
    }
  }

  const closeProductDetail = () => {
    setShowProductDetailModal(false)
    setSelectedProduct(null)
    setProductDetailMovements([])
  }

  const productDetailStats = useMemo(() => {
    if (!selectedProduct) return null
    const list = productDetailMovements
    const inQty = list.filter((m) => m.movement_type === 'in' || m.movement_type === 'return').reduce((sum, m) => sum + Number(m.quantity || 0), 0)
    const outQty = list.filter((m) => m.movement_type === 'out').reduce((sum, m) => sum + Number(m.quantity || 0), 0)
    const adjustmentQty = list.filter((m) => m.movement_type === 'adjustment').reduce((sum, m) => sum + Number(m.quantity || 0), 0)
    return {
      total: list.length,
      inQty,
      outQty,
      adjustmentQty,
      stockValue: Number(selectedProduct.stock_quantity || 0) * Number(selectedProduct.price || 0)
    }
  }, [productDetailMovements, selectedProduct])

  const stats = useMemo(() => {
    const totalProducts = products.length
    const totalQuantity = products.reduce((sum, item) => sum + Number(item.stock_quantity || 0), 0)
    const totalValue = products.reduce(
      (sum, item) => sum + Number(item.stock_quantity || 0) * Number(item.price || 0),
      0
    )
    const outOfStock = products.filter((item) => Number(item.stock_quantity || 0) <= 0).length

    return { totalProducts, totalQuantity, totalValue, outOfStock }
  }, [products])

  const movementStats = useMemo(() => {
    return movements.reduce(
      (acc, row) => {
        const qty = Number(row.quantity || 0)
        if (row.movement_type === 'in' || row.movement_type === 'return') acc.incoming += qty
        if (row.movement_type === 'out') acc.outgoing += qty
        if (row.movement_type === 'adjustment') acc.adjustments += qty
        return acc
      },
      { incoming: 0, outgoing: 0, adjustments: 0 }
    )
  }, [movements])

  const displayedProducts = useMemo(() => {
    return products.filter((item) => {
      if (categoryFilter && item.category_detail?.id !== categoryFilter) return false
      if (statusFilter === 'in_stock' && Number(item.stock_quantity || 0) <= 0) return false
      if (statusFilter === 'out_stock' && Number(item.stock_quantity || 0) > 0) return false
      if (statusFilter === 'active' && !item.is_active) return false
      if (statusFilter === 'inactive' && item.is_active) return false

      if (!searchTerm.trim()) return true
      const q = searchTerm.toLowerCase()
      return (
        String(item.name || '').toLowerCase().includes(q)
        || String(item.code || '').toLowerCase().includes(q)
        || String(item.category_detail?.name || '').toLowerCase().includes(q)
      )
    })
  }, [categoryFilter, products, searchTerm, statusFilter])

  const displayedMovements = useMemo(() => {
    const search = movementSearch.trim().toLocaleLowerCase('tr-TR')
    const fromTs = movementDateFrom ? new Date(`${movementDateFrom}T00:00:00`).getTime() : null
    const toTs = movementDateTo ? new Date(`${movementDateTo}T23:59:59.999`).getTime() : null

    return movements.filter((row) => {
      if (movementProductFilter) {
        const rowProductId = row.product_detail?.id || row.product_id
        if (String(rowProductId) !== String(movementProductFilter)) return false
      }
      if (movementTypeFilter && row.movement_type !== movementTypeFilter) return false
      if (movementTechnicianFilter) {
        const rowTechId = row.technician_id || row.technician
        if (String(rowTechId) !== String(movementTechnicianFilter)) return false
      }
      if (fromTs !== null || toTs !== null) {
        const ts = row.created_at ? new Date(row.created_at).getTime() : null
        if (ts === null) return false
        if (fromTs !== null && ts < fromTs) return false
        if (toTs !== null && ts > toTs) return false
      }
      if (!search) return true
      return (
        String(row.product_detail?.name || '').toLocaleLowerCase('tr-TR').includes(search)
        || String(row.technician_name || '').toLocaleLowerCase('tr-TR').includes(search)
        || String(row.description || '').toLocaleLowerCase('tr-TR').includes(search)
        || String(row.movement_type_display || row.movement_type || '').toLocaleLowerCase('tr-TR').includes(search)
      )
    })
  }, [
    movementSearch,
    movements,
    movementProductFilter,
    movementTypeFilter,
    movementTechnicianFilter,
    movementDateFrom,
    movementDateTo
  ])

  const clearMovementFilters = () => {
    setMovementProductFilter('')
    setMovementTypeFilter('')
    setMovementDateFrom('')
    setMovementDateTo('')
    setMovementTechnicianFilter('')
    setMovementSearch('')
  }

  const hasActiveMovementFilters =
    Boolean(movementProductFilter)
    || Boolean(movementTypeFilter)
    || Boolean(movementTechnicianFilter)
    || Boolean(movementDateFrom)
    || Boolean(movementDateTo)
    || Boolean(movementSearch.trim())

  const setQuickFilter = (next) => {
    setStatusFilter(next)
  }

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  return (
    <div className="inventory-page">
      <div className="inventory-header d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h3 className="m-0 fw-bold text-light">
            <FaBoxes className="me-2 text-primary" />
            Stok ve Envanter
          </h3>
          <div className="inventory-subtitle">Ürün kartları, stok hareketleri ve değer takibi</div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Button variant="outline-light" onClick={() => setShowCategoryModal(true)}>
            Kategori Yönet
          </Button>
          <Button variant="outline-info" onClick={openMovementModal}>
            <FaPlus className="me-1" />
            Stok Hareketi
          </Button>
          <Button variant="primary" onClick={openCreateProduct}>
            <FaPlus className="me-1" />
            Yeni Ürün
          </Button>
          <Button variant="outline-light" onClick={() => fetchAll(true)} disabled={isRefreshing}>
            {isRefreshing ? <Spinner animation="border" size="sm" /> : <><FaSyncAlt className="me-1" />Yenile</>}
          </Button>
        </div>
      </div>

      <Row className="g-3 mb-4">
        <Col md={6} xl={3}>
          <Card className={`inventory-stat-card ${statusFilter === '' ? 'is-active' : ''}`} onClick={() => setQuickFilter('')}>
            <span>Toplam Ürün</span>
            <strong>{stats.totalProducts}</strong>
          </Card>
        </Col>
        <Col md={6} xl={3}>
          <Card className={`inventory-stat-card ${statusFilter === 'in_stock' ? 'is-active' : ''}`} onClick={() => setQuickFilter('in_stock')}>
            <span>Stokta Olan</span>
            <strong>{stats.totalProducts - stats.outOfStock}</strong>
          </Card>
        </Col>
        <Col md={6} xl={3}>
          <Card className={`inventory-stat-card ${statusFilter === 'out_stock' ? 'is-active' : ''}`} onClick={() => setQuickFilter('out_stock')}>
            <span>Tükenen</span>
            <strong>{stats.outOfStock}</strong>
          </Card>
        </Col>
        <Col md={6} xl={3}>
          <Card className="inventory-stat-card is-value">
            <span>Toplam Stok Değeri</span>
            <strong>{currency(stats.totalValue)} TL</strong>
          </Card>
        </Col>
      </Row>

      <Card className="inventory-filter-card border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col lg={4}>
              <Form.Label className="fw-semibold">Ürün Ara</Form.Label>
              <div className="position-relative">
                <FaSearch className="position-absolute top-50 translate-middle-y text-muted" style={{ left: '10px' }} />
                <Form.Control
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Ürün, kod veya kategori"
                  style={{ paddingLeft: '32px' }}
                />
              </div>
            </Col>
            <Col lg={4}>
              <Form.Label className="fw-semibold">Kategori</Form.Label>
              <Form.Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="">Tüm kategoriler</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col lg={3}>
              <Form.Label className="fw-semibold">Durum</Form.Label>
              <Form.Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">Tüm durumlar</option>
                <option value="in_stock">Stokta var</option>
                <option value="out_stock">Stokta yok</option>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </Form.Select>
            </Col>
            <Col lg={1}>
              <Form.Label className="fw-semibold">Liste</Form.Label>
              <div className="form-control bg-light text-muted text-center">{displayedProducts.length}</div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k || 'products')}
        className="mb-3 border-0 nav-pills bg-white rounded-3 p-2 shadow-sm"
        style={{ maxWidth: '420px' }}
      >
        <Tab eventKey="products" title={<span><FaBoxes className="me-2" />Ürünler</span>} />
        <Tab eventKey="movements" title={<span><FaWarehouse className="me-2" />Stok Hareketleri</span>} />
      </Tabs>

      {activeTab === 'products' ? (
      <Card className="inventory-table-card border-0 shadow-sm mb-4">
        <Card.Header className="bg-light fw-semibold">Ürünler</Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="m-0 align-middle">
              <thead>
                <tr>
                  <th className="px-3">#</th>
                  <th>Görsel</th>
                  <th>Ürün</th>
                  <th className="text-end">Fiyat</th>
                  <th className="text-center">Stok</th>
                  <th className="text-center">Durum</th>
                  <th className="text-center">Aktif</th>
                  <th className="text-end px-3">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {displayedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-4">
                      Kayıtlı ürün bulunamadı.
                    </td>
                  </tr>
                ) : (
                  displayedProducts.map((item, index) => {
                    const isOut = Number(item.stock_quantity || 0) <= 0 || item.status === 'out_stock'
                    return (
                      <tr key={item.id}>
                        <td className="px-3 text-muted">{index + 1}</td>
                        <td>
                          {item.image ? (
                            <img
                              src={resolveImageUrl(item.image)}
                              alt={item.name}
                              onClick={() => {
                                setSelectedImage(resolveImageUrl(item.image))
                                setShowImageModal(true)
                              }}
                              style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }}
                            />
                          ) : (
                            <span className="text-muted small">-</span>
                          )}
                        </td>
                        <td className="text-truncate" style={{ maxWidth: '220px' }}>
                          <button
                            type="button"
                            onClick={() => openProductDetail(item)}
                            className="btn btn-link p-0 fw-semibold text-decoration-none text-truncate d-block"
                            style={{ whiteSpace: 'nowrap', maxWidth: '100%' }}
                          >
                            {item.name || '-'}
                          </button>
                          <small className="d-block text-muted text-truncate" style={{ maxWidth: '100%' }}>
                            {item.category_detail?.name || 'Kategorisiz'}
                          </small>
                        </td>
                        <td className="text-end text-nowrap">{currency(item.price)} TL</td>
                        <td className="text-center fw-semibold">{Number(item.stock_quantity || 0)}</td>
                        <td className="text-center">
                          <Badge bg={isOut ? 'danger' : 'success'}>{isOut ? 'Stokta Yok' : 'Stokta Var'}</Badge>
                        </td>
                        <td className="text-center">
                          <Form.Check
                            type="switch"
                            checked={Boolean(item.is_active)}
                            onChange={() => toggleProductActive(item)}
                            className="d-inline-flex"
                          />
                        </td>
                        <td className="text-end px-3">
                          <div className="d-flex flex-wrap justify-content-end gap-1">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => openProductDetail(item)}
                            >
                              Detay
                            </Button>
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={() => openProductMovements(item)}
                            >
                              Hareketler
                            </Button>
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => openEditProduct(item)}
                            >
                              <FaEdit className="me-1" /> Düzenle
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => deleteProduct(item.id)}
                            >
                              <FaTrash className="me-1" /> Sil
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
      ) : null}

      {activeTab === 'movements' ? (
      <>
      <Row className="g-3 mb-3">
        <Col md={4}>
          <Card className="inventory-mini-card border-0 shadow-sm">
            <Card.Body><span>Stok Giriş / İade</span><strong>{movementStats.incoming}</strong></Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="inventory-mini-card border-0 shadow-sm">
            <Card.Body><span>Stok Çıkış</span><strong>{movementStats.outgoing}</strong></Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="inventory-mini-card border-0 shadow-sm">
            <Card.Body><span>Düzeltme</span><strong>{movementStats.adjustments}</strong></Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="inventory-table-card border-0 shadow-sm">
        <Card.Header className="bg-light fw-semibold d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span><FaWarehouse className="me-2 text-primary" />Stok Hareketleri</span>
          <div className="inventory-movement-search">
            <FaSearch className="position-absolute top-50 translate-middle-y text-muted" style={{ left: '10px' }} />
            <Form.Control
              size="sm"
              value={movementSearch}
              onChange={(event) => setMovementSearch(event.target.value)}
              placeholder="Hareket ara"
              style={{ paddingLeft: '30px', minWidth: '220px' }}
            />
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="px-3 py-2 border-bottom bg-white">
            <Row className="g-2 align-items-end">
              <Col xs={6} md={3} lg={2}>
                <Form.Label className="small text-muted mb-1">Ürün</Form.Label>
                <Form.Select
                  size="sm"
                  value={movementProductFilter}
                  onChange={(event) => setMovementProductFilter(event.target.value)}
                >
                  <option value="">Tüm ürünler</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col xs={6} md={3} lg={2}>
                <Form.Label className="small text-muted mb-1">Hareket</Form.Label>
                <Form.Select
                  size="sm"
                  value={movementTypeFilter}
                  onChange={(event) => setMovementTypeFilter(event.target.value)}
                >
                  <option value="">Tüm tipler</option>
                  <option value="in">Stok Giriş</option>
                  <option value="out">Stok Çıkış</option>
                  <option value="adjustment">Düzeltme</option>
                  <option value="return">İade</option>
                </Form.Select>
              </Col>
              <Col xs={6} md={3} lg={2}>
                <Form.Label className="small text-muted mb-1">Teknisyen</Form.Label>
                <Form.Select
                  size="sm"
                  value={movementTechnicianFilter}
                  onChange={(event) => setMovementTechnicianFilter(event.target.value)}
                >
                  <option value="">Tüm teknisyenler</option>
                  {technicians.map((tech) => {
                    const id = tech.user?.id || tech.id
                    const label = tech.user?.full_name || tech.user?.email || `Teknisyen #${id}`
                    return (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    )
                  })}
                </Form.Select>
              </Col>
              <Col xs={6} md={3} lg={2}>
                <Form.Label className="small text-muted mb-1">Başlangıç</Form.Label>
                <Form.Control
                  size="sm"
                  type="date"
                  value={movementDateFrom}
                  onChange={(event) => setMovementDateFrom(event.target.value)}
                />
              </Col>
              <Col xs={6} md={3} lg={2}>
                <Form.Label className="small text-muted mb-1">Bitiş</Form.Label>
                <Form.Control
                  size="sm"
                  type="date"
                  value={movementDateTo}
                  onChange={(event) => setMovementDateTo(event.target.value)}
                />
              </Col>
              <Col xs={6} md={12} lg={2} className="d-flex align-items-end">
                {hasActiveMovementFilters ? (
                  <Button size="sm" variant="outline-secondary" onClick={clearMovementFilters}>
                    <FaTimes className="me-1" />Temizle
                  </Button>
                ) : (
                  <small className="text-muted">Filtreler aktif değil</small>
                )}
              </Col>
            </Row>
            {hasActiveMovementFilters ? (
              <div className="small text-muted mt-2">
                {displayedMovements.length} / {movements.length} hareket gösteriliyor
              </div>
            ) : null}
          </div>
          <div className="table-responsive">
            <Table hover className="m-0 align-middle">
              <thead>
                <tr>
                  <th className="px-3">Tarih</th>
                  <th>Ürün</th>
                  <th>Hareket</th>
                  <th className="text-center">Miktar</th>
                  <th>Teknisyen</th>
                  <th>Açıklama</th>
                  <th className="text-end px-3">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {displayedMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      {hasActiveMovementFilters
                        ? 'Filtreye uyan stok hareketi bulunamadı.'
                        : 'Henüz stok hareketi yok.'}
                    </td>
                  </tr>
                ) : (
                  displayedMovements.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3">
                        {row.created_at ? new Date(row.created_at).toLocaleString('tr-TR') : '-'}
                      </td>
                      <td>{row.product_detail?.name || '-'}</td>
                      <td>
                        <Badge
                          bg={row.movement_type === 'out' ? 'danger' : row.movement_type === 'adjustment' ? 'warning' : 'success'}
                        >
                          {row.movement_type_display || row.movement_type}
                        </Badge>
                      </td>
                      <td className="text-center fw-semibold">{Number(row.quantity || 0)}</td>
                      <td>{row.technician_name || row.technician_id || '-'}</td>
                      <td>{row.description || '-'}</td>
                      <td className="text-end px-3">
                        <Button size="sm" variant="outline-danger" onClick={() => deleteMovement(row.id)}>
                          <FaTrash />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
      </>
      ) : null}

      <Modal show={showProductModal} onHide={closeProductModal} size="lg" backdrop="static">
        <Form onSubmit={submitProduct}>
          <Modal.Header closeButton>
            <Modal.Title>{editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>Ürün Adı *</Form.Label>
                <Form.Control name="name" value={productForm.name} onChange={handleProductField} required />
              </Col>
              <Col md={3}>
                <Form.Label>Kod/SKU</Form.Label>
                <Form.Control name="code" value={productForm.code} onChange={handleProductField} />
              </Col>
              <Col md={3}>
                <Form.Label className="d-flex justify-content-between align-items-center">
                  <span>Kategori</span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="p-0 text-decoration-none fw-semibold"
                    onClick={() => setShowInlineCategory((prev) => !prev)}
                    title="Hızlı kategori ekle"
                  >
                    {showInlineCategory ? '− Kapat' : '+ Yeni Ekle'}
                  </Button>
                </Form.Label>
                <Form.Select name="category_id" value={productForm.category_id} onChange={handleProductField}>
                  <option value="">Seçiniz</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Form.Select>
                {showInlineCategory ? (
                  <div className="d-flex gap-2 mt-2">
                    <Form.Control
                      size="sm"
                      value={inlineCategoryName}
                      onChange={(event) => setInlineCategoryName(event.target.value)}
                      placeholder="Yeni kategori adı"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          submitInlineCategory()
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={submitInlineCategory}
                      disabled={isInlineCategorySaving || !inlineCategoryName.trim()}
                    >
                      {isInlineCategorySaving ? <Spinner animation="border" size="sm" /> : 'Ekle'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-secondary"
                      onClick={cancelInlineCategory}
                      disabled={isInlineCategorySaving}
                    >
                      İptal
                    </Button>
                  </div>
                ) : null}
              </Col>
              <Col md={4}>
                <Form.Label>Fiyat *</Form.Label>
                <Form.Control
                  name="price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={productForm.price}
                  onChange={handleProductField}
                  required
                />
              </Col>
              <Col md={4}>
                <Form.Label>Stok Miktarı *</Form.Label>
                <Form.Control
                  name="stock_quantity"
                  type="number"
                  min={0}
                  value={productForm.stock_quantity}
                  onChange={handleProductField}
                  required
                />
              </Col>
              <Col md={4}>
                <Form.Label>Görsel</Form.Label>
                <Form.Control type="file" accept="image/*" onChange={handleProductImage} />
              </Col>
              <Col md={9}>
                <Form.Label>Açıklama</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="description"
                  value={productForm.description}
                  onChange={handleProductField}
                />
              </Col>
              <Col md={3} className="d-flex align-items-end">
                <Form.Check
                  type="switch"
                  id="product-active"
                  label={productForm.is_active ? 'Aktif' : 'Pasif'}
                  name="is_active"
                  checked={Boolean(productForm.is_active)}
                  onChange={handleProductField}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeProductModal} disabled={isSavingProduct}>
              İptal
            </Button>
            <Button variant="primary" type="submit" disabled={isSavingProduct}>
              {isSavingProduct ? <Spinner animation="border" size="sm" /> : 'Kaydet'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showCategoryModal} onHide={() => setShowCategoryModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Kategori Yönetimi</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={addCategory} className="d-flex gap-2 mb-3">
            <Form.Control
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="Yeni kategori adı"
            />
            <Button type="submit" variant="primary" disabled={isSavingCategory}>
              {isSavingCategory ? <Spinner animation="border" size="sm" /> : 'Ekle'}
            </Button>
          </Form>
          <div className="table-responsive">
            <Table size="sm" className="m-0">
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td className="text-center text-muted">Kategori yok.</td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id}>
                      <td className="align-middle">{cat.name}</td>
                      <td className="text-end">
                        <Button size="sm" variant="outline-danger" onClick={() => deleteCategory(cat.id)}>
                          <FaTrash />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Modal.Body>
      </Modal>

      <Modal show={showMovementModal} onHide={() => setShowMovementModal(false)}>
        <Form onSubmit={submitMovement}>
          <Modal.Header closeButton>
            <Modal.Title>Yeni Stok Hareketi</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={12}>
                <Form.Label>Ürün *</Form.Label>
                <Form.Select
                  value={movementForm.product_id}
                  onChange={(event) => setMovementForm((prev) => ({ ...prev, product_id: event.target.value }))}
                  required
                >
                  <option value="">Seçiniz</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.code || '-'})
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label>Hareket Tipi *</Form.Label>
                <Form.Select
                  value={movementForm.movement_type}
                  onChange={(event) => setMovementForm((prev) => ({ ...prev, movement_type: event.target.value }))}
                >
                  <option value="in">Stok Giriş</option>
                  <option value="out">Stok Çıkış</option>
                  <option value="return">İade</option>
                  <option value="adjustment">Düzeltme</option>
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label>Miktar *</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={movementForm.quantity}
                  onChange={(event) => setMovementForm((prev) => ({ ...prev, quantity: event.target.value }))}
                  required
                />
              </Col>
              <Col md={12}>
                <Form.Label>Teknisyen *</Form.Label>
                <Form.Select
                  value={movementForm.technician}
                  onChange={(event) => setMovementForm((prev) => ({ ...prev, technician: event.target.value }))}
                  required
                >
                  <option value="">Seçiniz</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.user?.id || ''}>
                      {tech.user?.full_name || tech.user?.email || tech.id}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={12}>
                <Form.Label>Açıklama</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={movementForm.description}
                  onChange={(event) => setMovementForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowMovementModal(false)} disabled={isSavingMovement}>
              İptal
            </Button>
            <Button variant="primary" type="submit" disabled={isSavingMovement}>
              {isSavingMovement ? <Spinner animation="border" size="sm" /> : 'Kaydet'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showImageModal} onHide={() => setShowImageModal(false)} centered size="lg">
        <Modal.Header closeButton className="bg-dark border-secondary" data-bs-theme="dark">
          <Modal.Title className="text-white">Ürün Görseli</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark p-3 d-flex justify-content-center">
          {selectedImage ? (
            <img
              src={selectedImage}
              alt="Ürün görseli"
              className="img-fluid rounded shadow"
              style={{
                maxHeight: '85vh',
                border: '4px solid #ffffff',
                outline: '2px solid rgba(255, 255, 255, 0.35)',
                backgroundColor: '#ffffff',
              }}
            />
          ) : null}
        </Modal.Body>
      </Modal>

      <Modal show={showProductMovementsModal} onHide={() => setShowProductMovementsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{selectedProduct?.name || 'Ürün'} Hareketleri</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {isProductMovementsLoading ? (
            <div className="text-center p-4"><Spinner animation="border" size="sm" /></div>
          ) : (
            <div className="table-responsive">
              <Table hover className="m-0 align-middle">
                <thead>
                  <tr>
                    <th className="px-3">Tarih</th>
                    <th>Hareket</th>
                    <th className="text-center">Miktar</th>
                    <th>Teknisyen</th>
                    <th>Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProductMovements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        Bu ürüne ait hareket yok.
                      </td>
                    </tr>
                  ) : (
                    selectedProductMovements.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3">{row.created_at ? new Date(row.created_at).toLocaleString('tr-TR') : '-'}</td>
                        <td>{row.movement_type_display || row.movement_type}</td>
                        <td className="text-center fw-semibold">{Number(row.quantity || 0)}</td>
                        <td>{row.technician_name || '-'}</td>
                        <td>{row.description || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={showProductDetailModal} onHide={closeProductDetail} size="lg" scrollable>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>
            <FaBoxes className="me-2 text-primary" />
            Ürün Detayı
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProduct ? (
            <>
              <Card className="border-0 shadow-sm mb-3">
                <Card.Body>
                  <Row className="g-3">
                    <Col md={4} className="text-center">
                      {selectedProduct.image ? (
                        <img
                          src={resolveImageUrl(selectedProduct.image)}
                          alt={selectedProduct.name}
                          className="img-fluid rounded"
                          style={{ maxHeight: '180px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          className="bg-light d-flex align-items-center justify-content-center rounded text-muted"
                          style={{ height: '180px' }}
                        >
                          Görsel yok
                        </div>
                      )}
                    </Col>
                    <Col md={8}>
                      <h4 className="fw-bold mb-1">{selectedProduct.name || '-'}</h4>
                      <div className="text-muted mb-2">
                        {selectedProduct.category_detail?.name || 'Kategorisiz'} • <code>{selectedProduct.code || '-'}</code>
                      </div>
                      {selectedProduct.description ? (
                        <p className="small text-secondary mb-3">{selectedProduct.description}</p>
                      ) : (
                        <p className="small text-muted mb-3">Açıklama eklenmemiş.</p>
                      )}
                      <Row className="g-2">
                        <Col xs={6} md={3}>
                          <div className="small text-muted">Birim Fiyat</div>
                          <div className="fw-semibold">{currency(selectedProduct.price)} TL</div>
                        </Col>
                        <Col xs={6} md={3}>
                          <div className="small text-muted">Mevcut Stok</div>
                          <div className="fw-semibold">{Number(selectedProduct.stock_quantity || 0)} adet</div>
                        </Col>
                        <Col xs={6} md={3}>
                          <div className="small text-muted">Stok Değeri</div>
                          <div className="fw-semibold">{currency(productDetailStats?.stockValue || 0)} TL</div>
                        </Col>
                        <Col xs={6} md={3}>
                          <div className="small text-muted">Durum</div>
                          <div>
                            <Badge bg={Number(selectedProduct.stock_quantity || 0) <= 0 ? 'danger' : 'success'}>
                              {Number(selectedProduct.stock_quantity || 0) <= 0 ? 'Stokta Yok' : 'Stokta Var'}
                            </Badge>
                            <Badge bg={selectedProduct.is_active ? 'primary' : 'secondary'} className="ms-1">
                              {selectedProduct.is_active ? 'Aktif' : 'Pasif'}
                            </Badge>
                          </div>
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {productDetailStats ? (
                <Row className="g-2 mb-3">
                  <Col xs={6} md={3}>
                    <div className="border rounded p-2 text-center">
                      <div className="small text-muted">Toplam Hareket</div>
                      <div className="fw-bold fs-5">{productDetailStats.total}</div>
                    </div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="border rounded p-2 text-center">
                      <div className="small text-muted">Giriş</div>
                      <div className="fw-bold fs-5 text-success">{productDetailStats.inQty}</div>
                    </div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="border rounded p-2 text-center">
                      <div className="small text-muted">Çıkış</div>
                      <div className="fw-bold fs-5 text-danger">{productDetailStats.outQty}</div>
                    </div>
                  </Col>
                  <Col xs={6} md={3}>
                    <div className="border rounded p-2 text-center">
                      <div className="small text-muted">Düzeltme</div>
                      <div className="fw-bold fs-5 text-warning">{productDetailStats.adjustmentQty}</div>
                    </div>
                  </Col>
                </Row>
              ) : null}

              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold m-0">Stok Hareketleri</h6>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => {
                    closeProductDetail()
                    openProductMovements(selectedProduct)
                  }}
                >
                  Tümünü Gör
                </Button>
              </div>

              {isProductDetailLoading ? (
                <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
              ) : productDetailMovements.length === 0 ? (
                <div className="text-muted text-center py-4">Bu ürüne ait hareket kaydı yok.</div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="m-0 align-middle">
                    <thead>
                      <tr>
                        <th className="px-2">Tarih</th>
                        <th>Hareket</th>
                        <th className="text-center">Miktar</th>
                        <th>Teknisyen</th>
                        <th>Açıklama</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productDetailMovements.slice(0, 20).map((row) => (
                        <tr key={row.id}>
                          <td className="px-2">{row.created_at ? new Date(row.created_at).toLocaleString('tr-TR') : '-'}</td>
                          <td>
                            <Badge bg={row.movement_type === 'out' ? 'danger' : row.movement_type === 'adjustment' ? 'warning' : 'success'}>
                              {row.movement_type_display || row.movement_type}
                            </Badge>
                          </td>
                          <td className="text-center fw-semibold">{Number(row.quantity || 0)}</td>
                          <td>{row.technician_name || '-'}</td>
                          <td className="text-truncate" style={{ maxWidth: '200px' }} title={row.description || ''}>
                            {row.description || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  {productDetailMovements.length > 20 ? (
                    <div className="text-center small text-muted py-2">
                      + {productDetailMovements.length - 20} hareket daha. Tümünü görmek için "Tümünü Gör" tıklayın.
                    </div>
                  ) : null}
                </div>
              )}
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={closeProductDetail}>Kapat</Button>
          {selectedProduct ? (
            <>
              <Button variant="outline-info" onClick={() => {
                closeProductDetail()
                openProductMovements(selectedProduct)
              }}>
                Hareketler
              </Button>
              <Button variant="primary" onClick={() => {
                closeProductDetail()
                openEditProduct(selectedProduct)
              }}>
                Düzenle
              </Button>
            </>
          ) : null}
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default Inventory

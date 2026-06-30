import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { ConfigProvider, useConfig } from './context/ConfigContext'
import { NotificationProvider } from './context/NotificationContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Navbar, Nav, Container, Form, Button, FormControl, Modal, Spinner } from 'react-bootstrap'
import { Toaster } from 'react-hot-toast'
import {
  FaWrench,
  FaMoneyCheckAlt,
  FaClock,
  FaCog,
  FaBoxes,
  FaUsers,
  FaHome,
  FaChartLine,
  FaUserCog,
  FaUserShield,
  FaBell,
  FaPaperPlane,
  FaLightbulb,
  FaSignOutAlt
} from 'react-icons/fa'
import './App.css'
import Landing from './pages/Home/Landing'
import Dashboard from './pages/Home/Dashboard'
import Login from './pages/Auth/Login'
import ForgotPassword from './pages/Auth/ForgotPassword'
import ResetPassword from './pages/Auth/ResetPassword'
import Customers from './pages/Customers/Customers'
import Inventory from './pages/Inventory/Inventory'
import Settings from './pages/Config/Settings'
import Services from './pages/Services/Services'
import Technicians from './pages/Technicians/Technicians'
import WorkingHours from './pages/Technicians/WorkingHours'
import Users from './pages/Users/Users'
import Planner from './pages/Planner/Planner'
import Notifications from './pages/Notifications/Notifications'
import Inbox from './pages/Notifications/Inbox'
import Accounting from './pages/Accounting/Accounting'
import Reports from './pages/Reports/Reports'
import Payroll from './pages/Payroll/Payroll'
import PublicServiceTracking from './pages/PublicServiceTracking/PublicServiceTracking'
import GlobalSearchModal from './components/GlobalSearchModal'
import Feed from './pages/Feed/Feed'
import api from './api/api'

const resolveLogoUrl = (logoPath) => {
  if (!logoPath) return ''
  if (/^https?:\/\//i.test(logoPath)) return logoPath

  const baseUrl = api.defaults.baseURL || ''
  if (!baseUrl) return logoPath

  try {
    const parsed = new URL(baseUrl)
    const apiOrigin = `${parsed.protocol}//${parsed.host}`
    return `${apiOrigin}${logoPath.startsWith('/') ? '' : '/'}${logoPath}`
  } catch {
    return logoPath
  }
}

const Sidebar = ({ location, onFeedbackClick, brandName, brandLogo }) => (
  <div className="sidebar d-none d-lg-flex">
    <Link to="/dashboard" className="sidebar-brand">
      {brandLogo ? (
        <img
          src={brandLogo}
          alt={brandName || 'Serfix'}
          className="me-2"
          style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}
        />
      ) : (
        <span className="text-primary me-2">⚙</span>
      )}
      {brandName || 'Serfix'}
    </Link>
    <div className="sidebar-nav">
      <Link to="/dashboard" className={`sidebar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
        <FaHome /> Ana Sayfa
      </Link>
      <Link to="/dashboard/users" className={`sidebar-link ${location.pathname.includes('/users') ? 'active' : ''}`}>
        <FaUserShield /> Kullanıcılar
      </Link>
      <Link to="/dashboard/services" className={`sidebar-link ${location.pathname.includes('/services') ? 'active' : ''}`}>
        <FaWrench /> Servisler
      </Link>
      <Link to="/dashboard/inventory" className={`sidebar-link ${location.pathname.includes('/inventory') ? 'active' : ''}`}>
        <FaBoxes /> Stok & Envanter
      </Link>
      <Link to="/dashboard/customers" className={`sidebar-link ${location.pathname.includes('/customers') ? 'active' : ''}`}>
        <FaUsers /> Müşteriler
      </Link>
      <Link to="/dashboard/technicians" className={`sidebar-link ${location.pathname.includes('/technicians') ? 'active' : ''}`}>
        <FaUserCog /> Teknisyenler
      </Link>
      <Link to="/dashboard/working-hours" className={`sidebar-link ${location.pathname.includes('/working-hours') ? 'active' : ''}`}>
        <FaClock /> Mesai Saatleri
      </Link>
      <Link to="/dashboard/accounting" className={`sidebar-link ${location.pathname.includes('/accounting') ? 'active' : ''}`}>
        <FaMoneyCheckAlt /> Muhasebe
      </Link>
      <Link to="/dashboard/payroll" className={`sidebar-link ${location.pathname.includes('/payroll') ? 'active' : ''}`}>
        <FaMoneyCheckAlt /> Maaş Bordrosu
      </Link>
      <Link to="/dashboard/reporting" className={`sidebar-link ${location.pathname.includes('/reporting') ? 'active' : ''}`}>
        <FaChartLine /> Raporlar
      </Link>
      <Link to="/dashboard/feed" className={`sidebar-link ${location.pathname.includes('/feed') ? 'active' : ''}`}>
        <FaBell /> Haber Akışı
      </Link>

      <Link to="/dashboard/inbox" className={`sidebar-link ${location.pathname.includes('/inbox') ? 'active' : ''}`}>
        <FaBell /> Bildirimlerim
      </Link>
      <Link to="/dashboard/notifications" className={`sidebar-link ${location.pathname.includes('/notifications') ? 'active' : ''}`}>
        <FaPaperPlane /> Kampanya & Duyuru
      </Link>
      <Link to="/dashboard/settings" className={`sidebar-link ${location.pathname.includes('/settings') ? 'active' : ''}`}>
        <FaCog /> Ayarlar
      </Link>

      <div className="mt-auto mb-3">
        <div 
          onClick={onFeedbackClick} 
          className="sidebar-link text-warning fw-bold mx-2 rounded-3" 
          style={{ cursor: 'pointer', backgroundColor: 'rgba(255, 193, 7, 0.1)' }}
        >
          <FaLightbulb className="me-2 text-warning" /> Öneri & Hata Bildir
        </div>
      </div>
    </div>
  </div>
)

const MainLayout = () => {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { config } = useConfig()
  
  // Feedback State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackSubject, setFeedbackSubject] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [globalSearchInitialQuery, setGlobalSearchInitialQuery] = useState('')
  const [topSearchQuery, setTopSearchQuery] = useState('')
  const [now, setNow] = useState(new Date())

  const today = now.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const currentTime = now.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    
  })

  const openGlobalSearch = (query = '') => {
    setGlobalSearchInitialQuery(query || '')
    setShowGlobalSearch(true)
  }

  useEffect(() => {
    const handleOpenEvent = (event) => {
      openGlobalSearch(event?.detail?.query || '')
    }

    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openGlobalSearch('')
      }
    }

    window.addEventListener('app:open-global-search', handleOpenEvent)
    window.addEventListener('keydown', handleShortcut)
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => {
      window.removeEventListener('app:open-global-search', handleOpenEvent)
      window.removeEventListener('keydown', handleShortcut)
      window.clearInterval(timer)
    }
  }, [])

  return (
    <div className="app-layout">
      <Sidebar
        location={location}
        onFeedbackClick={() => setShowFeedbackModal(true)}
        brandName={config?.name}
        brandLogo={resolveLogoUrl(config?.logo)}
      />

      <div className="main-content">
        <Navbar className="custom-navbar" expand="lg" variant="dark">
          <Container fluid className="px-4">
            <Navbar.Toggle aria-controls="top-nav" />
            <Navbar.Collapse id="top-nav">
              <Nav className="me-auto" style={{ flex: 1, maxWidth: '400px' }}>
                <Form
                  className="d-flex w-100"
                  onSubmit={(event) => {
                    event.preventDefault()
                    openGlobalSearch(topSearchQuery)
                  }}
                >
                  <FormControl
                    type="search"
                    placeholder="Global ara... (Ctrl+K)"
                    className="search-input w-100"
                    aria-label="Search"
                    value={topSearchQuery}
                    onChange={(event) => setTopSearchQuery(event.target.value)}
                    onClick={() => openGlobalSearch(topSearchQuery)}
                  />
                </Form>
              </Nav>
              <Nav>
                <Navbar.Text className="text-white d-flex flex-row align-items-center gap-2 lh-sm">
                  <span className="fw-bold fs-6">{today}</span>
                  <span className="small text-white-50">{currentTime}</span>
                </Navbar.Text>
                <Navbar.Text className="text-white ms-3">
                  {user?.full_name || user?.email || 'Kullanıcı'}
                </Navbar.Text>
                <Button
                  variant="outline-light"
                  size="sm"
                  className="ms-3"
                  onClick={logout}
                >
                  <FaSignOutAlt className="me-1" />
                  Çıkış
                </Button>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <Container fluid className="p-4">
          <Outlet />
        </Container>
      </div>

      {/* FEEDBACK MODAL */}
      <Modal show={showFeedbackModal} onHide={() => !feedbackSubmitting && setShowFeedbackModal(false)} centered>
        <Form onSubmit={async (e) => {
          e.preventDefault()
          if (!feedbackMessage.trim()) {
             import('react-hot-toast').then(m => m.default.error('Lütfen bir mesaj girin.')); return;
          }
          setFeedbackSubmitting(true)
          try {
            const { default: api } = await import('./api/api')
            await api.post('/feedback/feedbacks/', { subject: feedbackSubject || 'Uygulama Geri Bildirimi', message: feedbackMessage })
            import('react-hot-toast').then(m => m.default.success('Geri bildiriminiz başarıyla iletildi. Teşekkür ederiz!'))
            setShowFeedbackModal(false)
            setFeedbackSubject('')
            setFeedbackMessage('')
          } catch {
            import('react-hot-toast').then(m => m.default.error('Bildirim gönderilirken bir hata oluştu.'))
          } finally {
            setFeedbackSubmitting(false)
          }
        }}>
          <Modal.Header closeButton className="bg-light">
            <Modal.Title className="fw-bold"><FaLightbulb className="me-2 text-warning"/>Öneri & Hata Bildir</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <p className="text-muted mb-4" style={{fontSize: '0.9rem'}}>Karşılaştığınız bir hatayı bildirmek veya uygulamanın gelişimi için bir fikir sunmak istiyorsanız formu kullanın. Mesajınız anında yöneticilere e-posta olarak ulaştırılır.</p>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Konu</Form.Label>
              <Form.Control type="text" placeholder="Örn: Stok Modülü Hatası / Yeni Özellik İsteği" value={feedbackSubject} onChange={e => setFeedbackSubject(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Mesajınız *</Form.Label>
              <Form.Control as="textarea" rows={5} placeholder="Detayları buraya yazınız..." required value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowFeedbackModal(false)} disabled={feedbackSubmitting}>İptal</Button>
            <Button variant="primary" type="submit" disabled={feedbackSubmitting}>
              {feedbackSubmitting ? <Spinner animation="border" size="sm" /> : 'Gönder'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <GlobalSearchModal
        show={showGlobalSearch}
        initialQuery={globalSearchInitialQuery}
        onHide={() => setShowGlobalSearch(false)}
      />

    </div>
  )
}

const AuthLayout = () => (
  <div
    className="min-vh-100 d-flex justify-content-center align-items-center"
    style={{ background: 'linear-gradient(135deg, #182b3a 0%, #203a43 50%, #2c5364 100%)' }}
  >
    <div className="p-4 bg-white rounded-3 shadow" style={{ width: '400px' }}>
      <Outlet />
    </div>
  </div>
)

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

const GuestRoute = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

const PlaceholderPage = ({ title }) => (
  <div className="bg-white text-center p-5 shadow-sm rounded-3">
    <h3 className="fw-bold text-primary">{title} Modülü</h3>
    <p className="text-muted mt-2">Bu sayfanın arayüzü henüz kodlanmamıştır.</p>
  </div>
)

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AuthProvider>
        <ConfigProvider>
          <BrowserRouter>
            <Toaster position="top-right" />
            <Routes>
              <Route path="/" element={<Landing />} />

              <Route path="/login" element={<Login />} />
              <Route path="/service-tracking/:serviceId" element={<PublicServiceTracking />} />

              <Route element={<GuestRoute />}>
                <Route element={<AuthLayout />}>
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<NotificationProvider><MainLayout /></NotificationProvider>}>
                  <Route index element={<Dashboard />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="services" element={<Services />} />
                  <Route path="technicians" element={<Technicians />} />
                  <Route path="working-hours" element={<WorkingHours />} />
                  <Route path="users" element={<Users />} />
                  <Route path="accounting" element={<Accounting />} />
                  <Route path="payroll" element={<Payroll />} />
                  <Route path="reporting" element={<Reports />} />
                  <Route path="feed" element={<Feed />} />
                  <Route path="inbox" element={<Inbox />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="planner" element={<Planner />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="*" element={<PlaceholderPage title="Yapım Aşamasında" />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </ConfigProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App


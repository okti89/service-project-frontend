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
  FaSignOutAlt,
  FaMapMarkerAlt,
  FaUserClock,
  FaCalendarCheck,
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
import TechnicianLeaves from './pages/Technicians/TechnicianLeaves'
import Users from './pages/Users/Users'
import Planner from './pages/Planner/Planner'
import Notifications from './pages/Notifications/Notifications'
import Inbox from './pages/Notifications/Inbox'
import Accounting from './pages/Accounting/Accounting'
import Reports from './pages/Reports/Reports'
import Payroll from './pages/Payroll/Payroll'
import PublicServiceTracking from './pages/PublicServiceTracking/PublicServiceTracking'
import PrivacyPolicy from './pages/Public/PrivacyPolicy'
import GlobalSearchModal from './components/GlobalSearchModal'
import PlaceholderPage from './components/PlaceholderPage'
import Feed from './pages/Feed/Feed'
import api from './api/api'

const c = (...codes) => String.fromCharCode(...codes)

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

const sidebarSections = [
  {
    title: 'Panel',
    links: [
      { to: '/dashboard', icon: FaHome, label: 'Ana Sayfa', match: (pathname) => pathname === '/dashboard' },
      { to: '/dashboard/services', icon: FaWrench, label: 'Servisler', match: (pathname) => pathname.includes('/services') },
      { to: '/dashboard/pending-users', icon: FaUserClock, label: 'Onay Bekleyenler', match: (pathname) => pathname.includes('/pending-users') },
      { to: '/dashboard/customers', icon: FaUsers, label: 'M' + c(252) + c(351) + 'teriler', match: (pathname) => pathname.includes('/customers') },
    ],
  },
  {
    title: 'Teknisyen Y' + c(246) + 'netimi',
    links: [
      { to: '/dashboard/technicians', icon: FaUserCog, label: 'Teknisyenler', match: (pathname) => pathname.includes('/technicians') && !pathname.includes('/technician-') },
      { to: '/dashboard/working-hours', icon: FaClock, label: 'Mesailer', match: (pathname) => pathname.includes('/working-hours') },
      { to: '/dashboard/technician-locations', icon: FaMapMarkerAlt, label: 'Konumlar', match: (pathname) => pathname.includes('/technician-locations') },
      { to: '/dashboard/technician-leaves', icon: FaCalendarCheck, label: c(304) + 'zinler', match: (pathname) => pathname.includes('/technician-leaves') },
    ],
  },
  {
    title: 'Operasyon',
    links: [
      { to: '/dashboard/inventory', icon: FaBoxes, label: 'Stok & Envanter', match: (pathname) => pathname.includes('/inventory') },
      { to: '/dashboard/accounting', icon: FaMoneyCheckAlt, label: 'Finans & Muhasebe', match: (pathname) => pathname.includes('/accounting') },
      { to: '/dashboard/payroll', icon: FaMoneyCheckAlt, label: 'Maa' + c(351) + ' Bordrosu', match: (pathname) => pathname.includes('/payroll') },
      { to: '/dashboard/reporting', icon: FaChartLine, label: 'Raporlar', match: (pathname) => pathname.includes('/reporting') },
    ],
  },
  {
    title: 'Sistem',
    links: [
      { to: '/dashboard/users', icon: FaUserShield, label: 'T' + c(252) + 'm Kullan' + c(305) + 'c' + c(305) + 'lar', match: (pathname) => pathname.includes('/users') && !pathname.includes('/pending-users') },
      { to: '/dashboard/inbox', icon: FaBell, label: 'Bildirimlerim', match: (pathname) => pathname.includes('/inbox') },
      { to: '/dashboard/notifications', icon: FaPaperPlane, label: 'Kampanya & Duyuru', match: (pathname) => pathname.includes('/notifications') },
      { to: '/dashboard/settings', icon: FaCog, label: 'Firma Ayarlar' + c(305), match: (pathname) => pathname.includes('/settings') },
      { to: '/dashboard/feed', icon: FaBell, label: 'Haber Ak' + c(305) + c(351) + c(305), match: (pathname) => pathname.includes('/feed') },
    ],
  },
]

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
        <FaCog className="text-primary me-2" />
      )}
      {brandName || 'Serfix'}
    </Link>
    <div className="sidebar-nav">
      {sidebarSections.map((section) => (
        <div key={section.title} className="mb-2">
          <div
            className="px-3 pt-3 pb-2 text-uppercase text-white-50"
            style={{ fontSize: '0.72rem', letterSpacing: '0.08em', fontWeight: 700 }}
          >
            {section.title}
          </div>
          {section.links.map((item) => {
            const Icon = item.icon
            const isActive = item.match(location.pathname)
            return (
              <Link key={item.to} to={item.to} className={`sidebar-link ${isActive ? 'active' : ''}`}>
                <Icon /> {item.label}
              </Link>
            )
          })}
        </div>
      ))}

      <div className="mt-auto mb-3">
        <div
          onClick={onFeedbackClick}
          className="sidebar-link text-warning fw-bold mx-2 rounded-3"
          style={{ cursor: 'pointer', backgroundColor: 'rgba(255, 193, 7, 0.1)' }}
        >
          <FaLightbulb className="me-2 text-warning" /> {c(214) + 'neri & Hata Bildir'}
        </div>
      </div>
    </div>
  </div>
)

const MainLayout = () => {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { config } = useConfig()

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
                  {user?.full_name || user?.email || ('Kullan' + c(305) + 'c' + c(305))}
                </Navbar.Text>
                <Button variant="outline-light" size="sm" className="ms-3" onClick={logout}>
                  <FaSignOutAlt className="me-1" />
                  {'Çıkış'}
                </Button>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <Container fluid className="p-4">
          <Outlet />
        </Container>
      </div>

      <Modal show={showFeedbackModal} onHide={() => !feedbackSubmitting && setShowFeedbackModal(false)} centered>
        <Form
          onSubmit={async (event) => {
            event.preventDefault()
            if (!feedbackMessage.trim()) {
              import('react-hot-toast').then((m) => m.default.error('L' + c(252) + 'tfen bir mesaj girin.'))
              return
            }
            setFeedbackSubmitting(true)
            try {
              const { default: feedbackApi } = await import('./api/api')
              await feedbackApi.post('/feedback/feedbacks/', {
                subject: feedbackSubject || 'Uygulama Geri Bildirimi',
                message: feedbackMessage,
              })
              import('react-hot-toast').then((m) => m.default.success('Geri bildiriminiz ba' + c(351) + 'ar' + c(305) + 'yla iletildi. Te' + c(351) + 'ekk' + c(252) + 'r ederiz!'))
              setShowFeedbackModal(false)
              setFeedbackSubject('')
              setFeedbackMessage('')
            } catch {
              import('react-hot-toast').then((m) => m.default.error('Bildirim gönderilirken bir hata oluştu.'))
            } finally {
              setFeedbackSubmitting(false)
            }
          }}
        >
          <Modal.Header closeButton className="bg-light">
            <Modal.Title className="fw-bold"><FaLightbulb className="me-2 text-warning" />{'Öneri & Hata Bildir'}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
              {'Karşılaştığınız bir hatayı bildirmek veya uygulamanın gelişimi için bir fikir sunmak istiyorsanız formu kullanın.'}
              <br />
              {'Mesajınız anında yöneticilere e-posta olarak ulaştırılır.'}
            </p>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Konu</Form.Label>
              <Form.Control
                type="text"
                placeholder={c(214) + 'rn: Stok Mod' + c(252) + 'l' + c(252) + ' Hatas' + c(305) + ' / Yeni ' + c(214) + 'zellik ' + c(304) + 'ste' + c(287) + 'i'}
                value={feedbackSubject}
                onChange={(event) => setFeedbackSubject(event.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">{'Mesaj' + c(305) + 'n' + c(305) + 'z *'}</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                placeholder={'Detaylar' + c(305) + ' buraya yaz' + c(305) + 'n' + c(305) + 'z...'}
                required
                value={feedbackMessage}
                onChange={(event) => setFeedbackMessage(event.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowFeedbackModal(false)} disabled={feedbackSubmitting}>{c(304) + 'ptal'}</Button>
            <Button variant="primary" type="submit" disabled={feedbackSubmitting}>
              {feedbackSubmitting ? <Spinner animation="border" size="sm" /> : 'G' + c(246) + 'nder'}
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
              <Route path="/service-tracking/:serviceId" element={<PublicServiceTracking />} />`r`n              <Route path="/privacy-policy/" element={<PrivacyPolicy />} />

              <Route element={<GuestRoute />}>
                <Route element={<AuthLayout />}>
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<NotificationProvider><MainLayout /></NotificationProvider>}>
                  <Route index element={<Dashboard />} />
                  <Route path="pending-users" element={<Users defaultFilter="pending" />} />
                  <Route path="users" element={<Users />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="services" element={<Services />} />
                  <Route path="technicians" element={<Technicians />} />
                  <Route path="working-hours" element={<WorkingHours defaultTab="shifts" />} />
                  <Route path="technician-locations" element={<WorkingHours defaultTab="locations" />} />
                  <Route path="technician-leaves" element={<TechnicianLeaves />} />
                  <Route path="accounting" element={<Accounting />} />
                  <Route path="payroll" element={<Payroll />} />
                  <Route path="reporting" element={<Reports />} />
                  <Route path="feed" element={<Feed />} />
                  <Route path="inbox" element={<Inbox />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="planner" element={<Planner />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="*" element={<PlaceholderPage title={'Yap?m A?amas?nda'} />} />
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

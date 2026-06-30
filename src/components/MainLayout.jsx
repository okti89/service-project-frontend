import { useEffect, useState } from 'react'
import { Navbar, Nav, Container, Form, FormControl, Button } from 'react-bootstrap'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  FaWrench,
  FaMoneyCheckAlt,
  FaClock,
  FaCog,
  FaBoxes,
  FaShoppingCart,
  FaUsers,
  FaPlus,
  FaWallet,
  FaHome,
  FaChartLine,
  FaUserCog,
  FaUserShield,
  FaBell,
  FaPaperPlane,
  FaLightbulb,
  FaSignOutAlt,
} from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'

const Sidebar = ({ brandName }) => {
  const location = useLocation()

  return (
    <div className="sidebar d-none d-lg-flex">
      <Link to="/dashboard" className="sidebar-brand">
        <span className="text-primary me-2">S</span>
        {brandName || 'Servis Yönetimi'}
      </Link>
      <div className="sidebar-nav">
        <Link to="/dashboard" className={`sidebar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
          <FaHome /> Ana Sayfa
        </Link>
        <Link
          to="/dashboard/services"
          className={`sidebar-link ${location.pathname.includes('/services') ? 'active' : ''}`}
        >
          <FaWrench /> Servisler
        </Link>
        <Link
          to="/dashboard/inventory"
          className={`sidebar-link ${location.pathname.includes('/inventory') ? 'active' : ''}`}
        >
          <FaBoxes /> Stok & Envanter
        </Link>
        <Link
          to="/dashboard/customers"
          className={`sidebar-link ${location.pathname.includes('/customers') ? 'active' : ''}`}
        >
          <FaUsers /> Müşteriler
        </Link>
        <Link
          to="/dashboard/technicians"
          className={`sidebar-link ${location.pathname.includes('/technicians') ? 'active' : ''}`}
        >
          <FaUserCog /> Teknisyenler
        </Link>
        <Link
          to="/dashboard/working-hours"
          className={`sidebar-link ${location.pathname.includes('/working-hours') ? 'active' : ''}`}
        >
          <FaClock /> Mesai Saatleri
        </Link>
        <Link
          to="/dashboard/accounting"
          className={`sidebar-link ${location.pathname.includes('/accounting') ? 'active' : ''}`}
        >
          <FaMoneyCheckAlt /> Muhasebe
        </Link>
        <Link
          to="/dashboard/payroll"
          className={`sidebar-link ${location.pathname.includes('/payroll') ? 'active' : ''}`}
        >
          <FaMoneyCheckAlt /> Maaş Bordrosu
        </Link>
        <Link
          to="/dashboard/planner"
          className={`sidebar-link ${location.pathname.includes('/planner') ? 'active' : ''}`}
        >
          <FaClock /> Görevler & Bakım
        </Link>
        <Link
          to="/dashboard/reporting"
          className={`sidebar-link ${location.pathname.includes('/reporting') ? 'active' : ''}`}
        >
          <FaChartLine /> Raporlar
        </Link>
        <Link
          to="/dashboard/feed"
          className={`sidebar-link ${location.pathname.includes('/feed') ? 'active' : ''}`}
        >
          <FaBell /> Haber Akışı
        </Link>

        <div
          className="mt-auto pt-4 pb-2 px-3 text-muted"
          style={{ fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          SISTEM
        </div>

        <Link
          to="/dashboard/users"
          className={`sidebar-link ${location.pathname.includes('/users') ? 'active' : ''}`}
        >
          <FaUserShield /> Kullanıcılar
        </Link>
        <Link
          to="/dashboard/inbox"
          className={`sidebar-link ${location.pathname.includes('/inbox') ? 'active' : ''}`}
        >
          <FaBell /> Bildirimlerim
        </Link>
        <Link
          to="/dashboard/notifications"
          className={`sidebar-link ${location.pathname.includes('/notifications') ? 'active' : ''}`}
        >
          <FaPaperPlane /> Kampanya & Duyuru
        </Link>
        <Link
          to="/dashboard/settings"
          className={`sidebar-link ${location.pathname.includes('/settings') ? 'active' : ''}`}
        >
          <FaCog /> Ayarlar
        </Link>

        <div className="mt-auto mb-3">
          <div
            className="sidebar-link text-warning fw-bold mx-2 rounded-3"
            style={{ cursor: 'pointer', backgroundColor: 'rgba(255, 193, 7, 0.1)' }}
          >
            <FaLightbulb className="me-2 text-warning" /> Öneri & Hata Bildir
          </div>
        </div>
      </div>
    </div>
  )
}

const MainLayout = () => {
  const location = useLocation()
  const { user, logout } = useAuth()
  const [now, setNow] = useState(new Date())

  const today = now.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const currentTime = now.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="app-layout">
      <Sidebar brandName="Servis Yönetimi" />

      <div className="main-content">
        <Navbar className="custom-navbar" expand="lg" variant="dark">
          <Container fluid className="px-4">
            <Navbar.Toggle aria-controls="top-nav" />
            <Navbar.Collapse id="top-nav">
              <Nav className="me-auto">
                <Nav.Link
                  as={Link}
                  to="/dashboard/services"
                  className={location.pathname.includes('/services') ? 'active' : ''}
                >
                  Servis
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/dashboard/reporting"
                  className={location.pathname.includes('/reporting') ? 'active' : ''}
                >
                  Raporlar
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/dashboard/accounting"
                  className={location.pathname.includes('/accounting') ? 'active' : ''}
                >
                  <FaMoneyCheckAlt /> Finans & Muhasebe
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/dashboard/payroll"
                  className={location.pathname.includes('/payroll') ? 'active' : ''}
                >
                  <FaMoneyCheckAlt /> Maaş Bordrosu
                </Nav.Link>
                <Nav.Link as={Link} to="/dashboard/planner">
                  <FaClock /> Bakım Zamanı Gelenler
                </Nav.Link>
              </Nav>
              <Nav>
                <Navbar.Text className="text-white d-flex flex-column align-items-start lh-sm">
                  <span className="fw-bold fs-6">{today}</span>
                  <span className="small text-white-50">{currentTime}</span>
                </Navbar.Text>
                <Navbar.Text className="text-white ms-3">
                  {user?.full_name || user?.email || 'Kullanıcı'}
                </Navbar.Text>
                <Button variant="outline-light" size="sm" className="ms-3" onClick={logout}>
                  <FaSignOutAlt className="me-1" />
                   Çıkış
                </Button>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <div className="sub-navbar">
          <Container fluid className="px-4 d-flex flex-wrap gap-3 align-items-center">
            <div className="flex-grow-1" style={{ maxWidth: '400px' }}>
              <Form className="d-flex">
                <FormControl
                  type="search"
                  placeholder="Global ara... (Ctrl+K)"
                  className="search-input"
                  aria-label="Search"
                />
              </Form>
            </div>

            <div className="d-flex flex-wrap gap-2 ms-auto">
              <Button variant="outline-light" className="action-btn">
                <FaBoxes /> Stok Yönetimi
              </Button>
              <Button variant="outline-light" className="action-btn">
                <FaShoppingCart /> Satış İşlemi
              </Button>
              <Button variant="outline-light" className="action-btn">
                <FaUsers /> Müşteri Listesi
              </Button>
              <Button variant="outline-light" className="action-btn">
                <FaPlus /> Yeni Servis
              </Button>
              <Link
                to="/dashboard/accounting"
                className="btn btn-outline-light action-btn d-flex align-items-center justify-content-center"
              >
                <FaWallet className="me-2" /> Gider Yönetimi
              </Link>
            </div>
          </Container>
        </div>

        <Container fluid className="p-4">
          <Outlet />
        </Container>
      </div>
    </div>
  )
}

export default MainLayout

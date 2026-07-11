import { Link } from 'react-router-dom'
import {
  FaArrowRight,
  FaBell,
  FaChartLine,
  FaClock,
  FaCog,
  FaFileInvoiceDollar,
  FaMapMarkerAlt,
  FaMoneyCheckAlt,
  FaUserCheck,
  FaUserClock,
  FaUserCog,
  FaUserShield,
  FaUsers,
} from 'react-icons/fa'
import PageHeader from '../../components/PageHeader'
import './Dashboard.css'

const MAIN_LINKS = [
  {
    to: '/dashboard/pending-users',
    icon: FaUserClock,
    title: 'Onay Bekleyen Kullanıcılar',
    description: 'Yeni hesap başvurularını incele, onayla veya reddet.',
    color: '#f59e0b',
    badge: 'Kullanıcı Yönetimi',
  },
  {
    to: '/dashboard/technicians',
    icon: FaUserCog,
    title: 'Teknisyenler',
    description: 'Teknisyen listesi, yetkiler, performans ve saha operasyonları.',
    color: '#2563eb',
    badge: 'Saha Ekibi',
  },
  {
    to: '/dashboard/customers',
    icon: FaUsers,
    title: 'Müşteri Listesi',
    description: 'Müşteri kayıtları, iletişim bilgileri ve geçmiş işlemler.',
    color: '#8b5cf6',
    badge: 'CRM',
  },
  {
    to: '/dashboard/payroll',
    icon: FaFileInvoiceDollar,
    title: 'Maaş ve Bordro',
    description: 'Prim, avans, bordro kalemleri ve maaş operasyonları.',
    color: '#0f766e',
    badge: 'İK',
  },
  {
    to: '/dashboard/accounting',
    icon: FaMoneyCheckAlt,
    title: 'Finans ve Muhasebe',
    description: 'Gelir gider, tahsilat, kasa ve finansal kayıt yönetimi.',
    color: '#dc2626',
    badge: 'Finans',
  },
  {
    to: '/dashboard/settings',
    icon: FaCog,
    title: 'Firma Ayarları',
    description: 'Şirket yapılandırması, çalışma saatleri ve genel sistem ayarları.',
    color: '#475569',
    badge: 'Sistem',
  },
]

const TECHNICIAN_LINKS = [
  {
    to: '/dashboard/technicians',
    icon: FaUserCheck,
    title: 'Teknisyen Profilleri',
    description: 'Yetki, iletişim ve günlük operasyon yönetimi.',
    color: '#2563eb',
  },
  {
    to: '/dashboard/working-hours',
    icon: FaClock,
    title: 'Mesailer',
    description: 'Mesai kayıtları ve çalışma saatleri özeti.',
    color: '#0891b2',
  },
  {
    to: '/dashboard/technician-locations',
    icon: FaMapMarkerAlt,
    title: 'Konumlar',
    description: 'Teknisyen lokasyon geçmişi ve ziyaret kayıtları.',
    color: '#16a34a',
  },
  {
    to: '/dashboard/technician-leaves',
    icon: FaBell,
    title: 'İzinler',
    description: 'İzin ve devamsızlık takibi için ayrılmış alan.',
    color: '#f97316',
  },
]

const REPORT_LINKS = [
  {
    to: '/dashboard/reporting',
    icon: FaChartLine,
    title: 'Raporlar',
    description: 'Operasyon, teknisyen ve finans raporlarını analiz et.',
    color: '#1d4ed8',
  },
]

function Dashboard() {
  return (
    <div className="admin-dashboard">
      <PageHeader
        eyebrow="Admin Panel"
        title="Yönetim Bağlantıları"
        description="Kullanıcı, teknisyen, müşteri, finans ve şirket ayarları alanlarına buradan hızlıca geçiş yapabilirsin."
      />

      <section className="admin-section">
        <div className="admin-section-head">
          <div>
            <div className="admin-section-eyebrow">Hızlı Erişim</div>
            <h2 className="admin-section-title">Ana Yönetim Modülleri</h2>
          </div>
        </div>
        <div className="admin-link-grid">
          {MAIN_LINKS.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.to} to={item.to} className="admin-link-card" style={{ '--accent': item.color }}>
                <div className="admin-link-badge">{item.badge}</div>
                <div className="admin-link-icon">
                  <Icon />
                </div>
                <div className="admin-link-body">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <div className="admin-link-arrow">
                  <FaArrowRight />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <div>
            <div className="admin-section-eyebrow">Saha Yönetimi</div>
            <h2 className="admin-section-title">Teknisyen Alt Başlıkları</h2>
          </div>
        </div>
        <div className="admin-link-grid admin-link-grid--compact">
          {TECHNICIAN_LINKS.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.to} to={item.to} className="admin-link-card admin-link-card--compact" style={{ '--accent': item.color }}>
                <div className="admin-link-icon admin-link-icon--compact">
                  <Icon />
                </div>
                <div className="admin-link-body">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <div className="admin-link-arrow">
                  <FaArrowRight />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <div>
            <div className="admin-section-eyebrow">Analiz</div>
            <h2 className="admin-section-title">Raporlama</h2>
          </div>
        </div>
        <div className="admin-link-grid admin-link-grid--single">
          {REPORT_LINKS.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.to} to={item.to} className="admin-link-card" style={{ '--accent': item.color }}>
                <div className="admin-link-icon">
                  <Icon />
                </div>
                <div className="admin-link-body">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <div className="admin-link-arrow">
                  <FaArrowRight />
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default Dashboard

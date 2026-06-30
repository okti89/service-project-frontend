import { Link } from 'react-router-dom'
import {
  FaUserShield,
  FaWrench,
  FaBoxes,
  FaUsers,
  FaUserCog,
  FaClock,
  FaMoneyCheckAlt,
  FaFileInvoiceDollar,
  FaChartLine,
  FaBell,
  FaInbox,
  FaPaperPlane,
  FaCog,
} from 'react-icons/fa'
import './Dashboard.css'

const PAGE_CARDS = [
  {
    to: '/dashboard/users',
    icon: FaUserShield,
    title: 'Kullanıcılar',
    description: 'Sistem kullanıcıları ve yetki yönetimi',
    color: '#475569',
  },
  {
    to: '/dashboard/services',
    icon: FaWrench,
    title: 'Servisler',
    description: 'Açık/kapanan servis kayıtları ve iş akışı',
    color: '#2f80ed',
  },
  {
    to: '/dashboard/inventory',
    icon: FaBoxes,
    title: 'Stok & Envanter',
    description: 'Yedek parça, ürün ve depo yönetimi',
    color: '#27ae60',
  },
  {
    to: '/dashboard/customers',
    icon: FaUsers,
    title: 'Müşteriler',
    description: 'Müşteri kartları ve iletişim geçmişi',
    color: '#9b51e0',
  },
  {
    to: '/dashboard/technicians',
    icon: FaUserCog,
    title: 'Teknisyenler',
    description: 'Teknisyen listesi, beceri ve performans',
    color: '#f2994a',
  },
  {
    to: '/dashboard/working-hours',
    icon: FaClock,
    title: 'Mesai Saatleri',
    description: 'Çalışma takvimi ve vardiya planlama',
    color: '#0f766e',
  },
  {
    to: '/dashboard/accounting',
    icon: FaMoneyCheckAlt,
    title: 'Muhasebe',
    description: 'Gelir, gider, fatura ve tahsilat',
    color: '#eb5757',
  },
  {
    to: '/dashboard/payroll',
    icon: FaFileInvoiceDollar,
    title: 'Maaş Bordrosu',
    description: 'Personel maaş ve bordro kayıtları',
    color: '#5a67d8',
  },
  {
    to: '/dashboard/reporting',
    icon: FaChartLine,
    title: 'Raporlar',
    description: 'Operasyonel ve finansal raporlar',
    color: '#3182ce',
  },
  {
    to: '/dashboard/feed',
    icon: FaBell,
    title: 'Haber Akışı',
    description: 'Şube içi duyuru ve güncellemeler',
    color: '#56ccf2',
  },
  {
    to: '/dashboard/inbox',
    icon: FaInbox,
    title: 'Bildirimlerim',
    description: 'Bana atanan bildirimler',
    color: '#dd6b20',
  },
  {
    to: '/dashboard/notifications',
    icon: FaPaperPlane,
    title: 'Kampanya & Duyuru',
    description: 'Müşteri kampanyası ve toplu duyuru',
    color: '#f2c94c',
  },
  {
    to: '/dashboard/settings',
    icon: FaCog,
    title: 'Ayarlar',
    description: 'Sistem ve şube yapılandırması',
    color: '#7048e8',
  },
]

function Dashboard() {
  return (
    <div className="page-cards-grid">
      {PAGE_CARDS.map((page) => {
        const Icon = page.icon
        return (
          <Link
            key={page.to}
            to={page.to}
            className="page-card"
            style={{ '--accent': page.color }}
          >
            <div className="page-card-icon" style={{ backgroundColor: page.color }}>
              <Icon />
            </div>
            <div className="page-card-body">
              <h6 className="page-card-title">{page.title}</h6>
              <p className="page-card-description">{page.description}</p>
            </div>
            <div className="page-card-accent" />
          </Link>
        )
      })}
    </div>
  )
}

export default Dashboard

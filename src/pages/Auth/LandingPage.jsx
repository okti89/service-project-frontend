import { Link } from 'react-router-dom'
import {
  FaWrench,
  FaUsers,
  FaBoxes,
  FaMoneyCheckAlt,
  FaChartLine,
  FaBell,
  FaUserCog,
  FaClock,
  FaArrowRight,
  FaCheckCircle,
  FaShieldAlt,
  FaMobileAlt,
  FaCloud,
  FaSearch,
  FaSignInAlt,
} from 'react-icons/fa'

const navLinkStyle = {
  color: '#d1dde8',
  textDecoration: 'none',
  fontSize: '0.92rem',
  fontWeight: 500,
  padding: '0.4rem 0.85rem',
  borderRadius: '6px',
  transition: 'background-color 0.15s',
}

const features = [
  {
    icon: <FaWrench />,
    title: 'Servis Yönetimi',
    description: 'Tüm servis kayıtlarınızı tek ekrandan takip edin, durum güncellemelerini anlık yönetin.',
    color: '#2196F3',
  },
  {
    icon: <FaUsers />,
    title: 'Müşteri Takibi',
    description: 'Müşteri iletişim bilgileri, geçmiş servisler ve sadakat programı bir arada.',
    color: '#4CAF50',
  },
  {
    icon: <FaBoxes />,
    title: 'Stok & Envanter',
    description: 'Stok seviyeleri, kritik stok uyarıları ve tedarikçi yönetimi otomatik olarak.',
    color: '#FF9800',
  },
  {
    icon: <FaMoneyCheckAlt />,
    title: 'Finans & Muhasebe',
    description: 'Gelir-gider, KDV ve dönemsel raporlar ile mali durumunuzu izleyin.',
    color: '#9C27B0',
  },
  {
    icon: <FaUserCog />,
    title: 'Teknisyen Yönetimi',
    description: 'Teknisyen atamaları, performans takibi ve mesai saatleri yönetimi.',
    color: '#E91E63',
  },
  {
    icon: <FaChartLine />,
    title: 'Detaylı Raporlar',
    description: 'Satış, performans ve finansal raporları grafikler ile inceleyin.',
    color: '#00BCD4',
  },
]

const stats = [
  { value: '7/24', label: 'Erişim' },
  { value: '%99.9', label: 'Çalışma Süresi' },
  { value: 'Anlık', label: 'Senkronizasyon' },
  { value: 'SSL', label: 'Güvenlik' },
]

const benefits = [
  'Tüm modüller tek bir panelde',
  'Mobil uyumlu, her yerden erişim',
  'Çok kullanıcılı ve rol bazlı',
  'Detaylı finansal raporlar',
  'Otomatik stok ve bakım hatırlatıcıları',
]

const LandingPage = () => {
  return (
    <div style={{ background: '#0d1e2d', minHeight: '100vh', color: '#e6edf5' }}>
      {/* TOP NAVBAR */}
      <nav
        style={{
          background: 'rgba(13, 30, 45, 0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '0.9rem 2rem',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Link
            to="/"
            style={{
              color: '#fff',
              fontWeight: 700,
              fontSize: '1.25rem',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2196F3, #1976D2)',
              }}
            >
              <FaWrench />
            </span>
            Servis Yönetimi
          </Link>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <a href="#features" style={navLinkStyle}>
              Özellikler
            </a>
            <a href="#benefits" style={navLinkStyle}>
              Avantajlar
            </a>
            <a href="#faq" style={navLinkStyle}>
              SSS
            </a>
            <Link
              to="/login"
              style={{
                ...navLinkStyle,
                background: '#2196F3',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <FaSignInAlt /> Giriş Yap
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <seçtion
        style={{
          padding: '5rem 2rem 4rem',
          background:
            'radial-gradient(ellipse at top, rgba(33, 150, 243, 0.15) 0%, transparent 60%), linear-gradient(180deg, #0d1e2d 0%, #0b1a28 100%)',
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: '3rem',
            alignItems: 'center',
          }}
        >
          <div>
            <span
              style={{
                display: 'inline-block',
                padding: '0.4rem 0.9rem',
                background: 'rgba(33, 150, 243, 0.15)',
                color: '#64b5f6',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                marginBottom: '1.25rem',
              }}
            >
              Teknik Servis Yönetim Platformu
            </span>
            <h1
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.25rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                margin: '0 0 1rem',
                color: '#fff',
              }}
            >
              Servis operasyonlarınızı{' '}
              <span style={{ color: '#2196F3' }}>tek panelden</span> yönetin.
            </h1>
            <p
              style={{
                fontSize: '1.05rem',
                lineHeight: 1.65,
                color: '#a0b2c3',
                margin: '0 0 1.75rem',
                maxWidth: '32rem',
              }}
            >
              Servis kayıtları, müşteri takibi, stok yönetimi, finansal raporlar ve teknisyen
              planlaması - bütün iş süreçleriniz tek bir bulut tabanlı platformda.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.85rem 1.6rem',
                  background: '#2196F3',
                  color: '#fff',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  boxShadow: '0 8px 20px rgba(33, 150, 243, 0.35)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
              >
                Sisteme Giriş <FaArrowRight />
              </Link>
              <a
                href="#features"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.85rem 1.6rem',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#e6edf5',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                Özellikleri İncele
              </a>
            </div>

            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '2rem 0 0',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.55rem',
                maxWidth: '30rem',
              }}
            >
              {benefits.slice(0, 4).map((b) => (
                <li
                  key={b}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#cfd8e3',
                    fontSize: '0.9rem',
                  }}
                >
                  <FaCheckCircle style={{ color: '#4CAF50', flexShrink: 0 }} /> {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Hero side panel */}
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '1.5rem',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
                  Canlı Panel
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#8fa3b8' }}>
                  Bugün durum özeti
                </p>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.75rem',
                  color: '#4CAF50',
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#4CAF50',
                  }}
                />
                Canlı
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {[
                { label: 'Tamirde', value: '12', color: '#2196F3' },
                { label: 'Hazır', value: '8', color: '#4CAF50' },
                { label: 'Bekleyen', value: '5', color: '#9C27B0' },
                { label: 'Bugün Gelen', value: '3', color: '#FF9800' },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    padding: '0.85rem',
                  }}
                >
                  <div
                    style={{
                      fontSize: '1.6rem',
                      fontWeight: 700,
                      color: s.color,
                      lineHeight: 1,
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#8fa3b8', marginTop: '0.3rem' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'rgba(33, 150, 243, 0.08)',
                border: '1px solid rgba(33, 150, 243, 0.2)',
                borderRadius: '8px',
                display: 'flex',
                gap: '0.6rem',
                alignItems: 'center',
                fontSize: '0.82rem',
                color: '#cfd8e3',
              }}
            >
              <FaBell style={{ color: '#2196F3' }} />
              <span>3 yeni bildirim · 1 onay bekleyen kayıt</span>
            </div>
          </div>
        </div>
      </seçtion>

      {/* STATS */}
      <seçtion
        style={{
          padding: '2rem',
          background: 'rgba(255,255,255,0.02)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
          }}
        >
          {stats.map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: '#2196F3',
                  letterSpacing: '-0.02em',
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#8fa3b8', marginTop: '0.2rem' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </seçtion>

      {/* FEATURES */}
      <seçtion id="features" style={{ padding: '4rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '0.35rem 0.8rem',
                background: 'rgba(33, 150, 243, 0.12)',
                color: '#64b5f6',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                marginBottom: '0.75rem',
              }}
            >
              MODÜLLER
            </span>
            <h2
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: '#fff',
                margin: '0 0 0.6rem',
              }}
            >
              İşinize özel bütün modüller
            </h2>
            <p
              style={{
                color: '#a0b2c3',
                fontSize: '1rem',
                maxWidth: '38rem',
                margin: '0 auto',
              }}
            >
              Servis yönetiminin her adımı için tasarlanmış araçlar ile zaman kazanın ve
              operasyonel verimliliğinizi arttırın.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {features.map((f) => (
              <div
                key={f.title}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  transition: 'transform 0.2s, border-color 0.2s',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: `${f.color}22`,
                    color: f.color,
                    fontSize: '1.4rem',
                    marginBottom: '1rem',
                  }}
                >
                  {f.icon}
                </div>
                <h3
                  style={{
                    margin: '0 0 0.5rem',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: '#fff',
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: '#a0b2c3',
                    fontSize: '0.9rem',
                    lineHeight: 1.55,
                  }}
                >
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </seçtion>

      {/* BENEFITS */}
      <seçtion
        id="benefits"
        style={{
          padding: '4rem 2rem',
          background: 'rgba(255,255,255,0.02)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '3rem',
            alignItems: 'center',
          }}
        >
          <div>
            <span
              style={{
                display: 'inline-block',
                padding: '0.35rem 0.8rem',
                background: 'rgba(76, 175, 80, 0.12)',
                color: '#81c784',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                marginBottom: '0.75rem',
              }}
            >
              AVANTAJLAR
            </span>
            <h2
              style={{
                fontSize: '1.85rem',
                fontWeight: 700,
                color: '#fff',
                margin: '0 0 1rem',
              }}
            >
              Neden Servis Yönetimi?
            </h2>
            <p style={{ color: '#a0b2c3', lineHeight: 1.65, margin: '0 0 1.5rem' }}>
              Bulut tabanlı altyapımız, gelişmiş güvenlik standartlarımız ve kullanışlı
              arayüzümüz ile işinizi profesyonel şekilde yönetin.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {benefits.map((b) => (
                <li
                  key={b}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.7rem',
                    padding: '0.55rem 0',
                    color: '#cfd8e3',
                  }}
                >
                  <FaCheckCircle style={{ color: '#4CAF50' }} /> {b}
                </li>
              ))}
            </ul>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1rem',
            }}
          >
            {[
              { icon: <FaCloud />, title: 'Bulut Tabanlı', text: 'Sunucu kurulumu yok' },
              { icon: <FaShieldAlt />, title: 'Güvenli', text: 'SSL & şifreli veri' },
              { icon: <FaMobileAlt />, title: 'Mobil Uyumlu', text: 'Her cihazdan erişim' },
              { icon: <FaSearch />, title: 'Global Arama', text: 'Hızlı kayıt bulma' },
              { icon: <FaUserCog />, title: 'Rol Bazlı', text: 'Yetki yönetimi' },
              { icon: <FaClock />, title: 'Zamanında', text: 'Anlık bildirimler' },
            ].map((b) => (
              <div
                key={b.title}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px',
                  padding: '1.1rem',
                }}
              >
                <div
                  style={{
                    color: '#2196F3',
                    fontSize: '1.5rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  {b.icon}
                </div>
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.2rem' }}>
                  {b.title}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#8fa3b8' }}>{b.text}</div>
              </div>
            ))}
          </div>
        </div>
      </seçtion>

      {/* FAQ */}
      <seçtion id="faq" style={{ padding: '4rem 2rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2
              style={{
                fontSize: '1.85rem',
                fontWeight: 700,
                color: '#fff',
                margin: '0 0 0.6rem',
              }}
            >
              Sıkça Sorulan Sorular
            </h2>
            <p style={{ color: '#a0b2c3', margin: 0 }}>
              Merak ettiklerinize hızlı yanıtlar.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {[
              {
                q: 'Hangi cihazlardan erişebilirim?',
                a: 'Sistemimiz tamamen web tabanlıdır; masaüstü, tablet ve mobil tarayıcılardan sorunsuz çalışır.',
              },
              {
                q: 'Verilerim güvende mi?',
                a: 'Tüm veriler SSL ile şifrelenmiş sunucularda, yedekli olarak saklanır ve uluslararası güvenlik standartlarına uygundur.',
              },
              {
                q: 'Kullanıcı sayısı sınırlı mı?',
                a: 'Firmanızın ihtiyacına göre tanımlanan kullanıcı limiti belirlenir; limit artışı yönetim panelinden yapılabilir.',
              },
              {
                q: 'Mevcut verilerimi nasıl aktarırım?',
                a: 'Eski sisteminizden Excel ile veri aktarımı desteklenir. Aktarım sürecinde teknik ekibimiz size yardımcı olur.',
              },
            ].map((item, idx) => (
              <details
                key={item.q}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontWeight: 600,
                    color: '#fff',
                    fontSize: '1rem',
                    listStyle: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>
                    <span style={{ color: '#2196F3', marginRight: '0.6rem' }}>
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    {item.q}
                  </span>
                  <span style={{ color: '#8fa3b8' }}>+</span>
                </summary>
                <p style={{ color: '#a0b2c3', margin: '0.75rem 0 0', lineHeight: 1.6 }}>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </seçtion>

      {/* CTA */}
      <seçtion
        style={{
          padding: '4rem 2rem',
          background:
            'linear-gradient(135deg, rgba(33, 150, 243, 0.12), rgba(13, 30, 45, 1))',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '1.85rem',
              fontWeight: 700,
              color: '#fff',
              margin: '0 0 0.75rem',
            }}
          >
            Hemen başlayın
          </h2>
          <p
            style={{
              color: '#a0b2c3',
              fontSize: '1rem',
              lineHeight: 1.6,
              margin: '0 0 1.5rem',
            }}
          >
            Servislerinizi profesyonelce yönetmek için tek yapmanız gereken giriş yapmak.
            Hesabınız yoksa yöneticinizle iletişime geçin.
          </p>
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.95rem 1.8rem',
              background: '#2196F3',
              color: '#fff',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '1.05rem',
              boxShadow: '0 10px 25px rgba(33, 150, 243, 0.4)',
            }}
          >
            <FaSignInAlt /> Giriş Yap
          </Link>
        </div>
      </seçtion>

      {/* FOOTER */}
      <footer
        style={{
          padding: '1.5rem 2rem',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          textAlign: 'center',
          color: '#8fa3b8',
          fontSize: '0.85rem',
        }}
      >
        © {new Date().getFullYear()} Servis Yönetimi · Tüm hakları saklıdır.
      </footer>
    </div>
  )
}

export default LandingPage

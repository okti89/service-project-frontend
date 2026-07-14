import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useConfig } from '../../context/ConfigContext'
import { toast } from 'react-hot-toast'
import {
  FaEnvelope,
  FaLock,
  FaSignInAlt,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaCloud,
  FaMobileAlt,
  FaWrench,
  FaCheckCircle,
  FaClock,
  FaChartLine,
} from 'react-icons/fa'

const LAST_LOGIN_EMAIL_KEY = 'last-login-email'

const featureHighlights = [
  { icon: <FaWrench />, text: 'Servis kayıtlarını ve iş emirlerini yönetin' },
  { icon: <FaCheckCircle />, text: 'Servis formu ve PDF belgelerini paylaşın' },
  { icon: <FaChartLine />, text: 'Tahsilat ve finansal takibi tek ekranda yapın' },
]

const Login = () => {
  const { login, isAuthenticated, isLoading } = useAuth()
  const { config } = useConfig()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState(localStorage.getItem(LAST_LOGIN_EMAIL_KEY) || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [emailFocus, setEmailFocus] = useState(false)
  const [passwordFocus, setPasswordFocus] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate, location.state])

  const inputBaseStyle = {
    width: '100%',
    padding: '0.7rem 0.95rem 0.7rem 2.6rem',
    border: '1.5px solid #d6dde6',
    borderRadius: '10px',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 140ms ease, box-shadow 140ms ease',
    background: '#fff',
    color: '#12263a',
  }
  const inputFocusStyle = {
    borderColor: '#2d7ff9',
    boxShadow: '0 0 0 4px rgba(45, 127, 249, 0.12)',
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    const res = await login(email, password)

    if (res.ok) {
      localStorage.setItem(LAST_LOGIN_EMAIL_KEY, email)
      toast.success('Başarıyla giriş yapıldı!')
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } else {
      setError(res.message || 'Giriş yapılamadı, bilgilerinizi kontrol edin.')
      toast.error('Giriş başarısız.')
    }
    setIsSubmitting(false)
  }

  return (
    <div
      className="login-split"
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1.05fr 1fr',
        background: '#0d1e2d',
        color: '#e6edf5',
      }}
    >
      {/* SOL TARAF — MARKA & ÖZELLİKLER */}
      <aside
        className="login-aside"
        style={{
          position: 'relative',
          padding: '3rem 3.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'radial-gradient(circle at 20% 20%, rgba(33,150,243,0.25), transparent 50%), radial-gradient(circle at 80% 80%, rgba(76,175,80,0.15), transparent 50%), linear-gradient(160deg, #0d1e2d 0%, #142838 60%, #0b1a28 100%)',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at top right, rgba(45,127,249,0.18), transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Link
            to="/"
            style={{
              color: '#fff',
              fontWeight: 700,
              fontSize: '1.25rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2196F3, #1976D2)',
                boxShadow: '0 6px 16px rgba(33,150,243,0.4)',
              }}
            >
              <FaWrench />
            </span>
            Servis Yönetimi
          </Link>
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '34rem' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '0.35rem 0.85rem',
              background: 'rgba(33,150,243,0.15)',
              color: '#64b5f6',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              marginBottom: '1rem',
            }}
          >
            Teknik Servis Yönetim Platformu
          </span>

          <h1
            style={{
              fontSize: 'clamp(1.85rem, 3.4vw, 2.6rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              color: '#fff',
              margin: '0 0 0.85rem',
            }}
          >
            Tek panelden tüm servis operasyonlarınız.
          </h1>
          <p
            style={{
              color: '#a0b2c3',
              fontSize: '1rem',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Servis kayıtları, müşteri takibi, stok ve finansal raporlar — işinizin her adımı
            tek bir bulut tabanlı platformda.
          </p>

          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: '2rem 0 0',
              display: 'grid',
              gap: '0.65rem',
            }}
          >
            {featureHighlights.map((h) => (
              <li
                key={h.text}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.7rem',
                  color: '#cfd8e3',
                  fontSize: '0.92rem',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(33,150,243,0.12)',
                    color: '#64b5f6',
                  }}
                >
                  {h.icon}
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            color: '#7d8fa3',
            fontSize: '0.8rem',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <span>
            <FaChartLine style={{ marginRight: '0.4rem' }} /> Gerçek zamanlı raporlar
          </span>
          <span>
            <FaClock style={{ marginRight: '0.4rem' }} /> Anlık bildirimler
          </span>
          <span>
            <FaCheckCircle style={{ marginRight: '0.4rem' }} /> %99.9 çalışma süresi
          </span>
        </div>
      </aside>

      {/* SAĞ TARAF — FORM */}
      <main
        style={{
          background: '#f5f7fb',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            background: '#ffffff',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            boxShadow: '0 20px 60px rgba(13, 30, 45, 0.18)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#12263a', margin: 0 }}>
              {config?.name || 'Servis Yönetimi'}
            </h2>
            <p style={{ color: '#6c757d', margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
              Devam etmek için hesabınızla giriş yapın
            </p>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                padding: '0.7rem 0.95rem',
                borderRadius: '10px',
                background: '#fde8e8',
                color: '#b42318',
                marginBottom: '1.1rem',
                fontSize: '0.88rem',
                border: '1px solid #f8c4c4',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="on" noValidate>
            <div style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="login-email"
                style={{
                  display: 'block',
                  fontWeight: 600,
                  marginBottom: '0.45rem',
                  fontSize: '0.88rem',
                  color: '#12263a',
                }}
              >
                E-posta
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#6c757d',
                    pointerEvents: 'none',
                  }}
                >
                  <FaEnvelope />
                </span>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="username"
                  inputMode="email"
                  placeholder="ornek@firma.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocus(true)}
                  onBlur={() => setEmailFocus(false)}
                  required
                  style={{
                    ...inputBaseStyle,
                    ...(emailFocus ? inputFocusStyle : {}),
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <label
                htmlFor="login-password"
                style={{
                  display: 'block',
                  fontWeight: 600,
                  marginBottom: '0.45rem',
                  fontSize: '0.88rem',
                  color: '#12263a',
                }}
              >
                Parola
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#6c757d',
                    pointerEvents: 'none',
                  }}
                >
                  <FaLock />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocus(true)}
                  onBlur={() => setPasswordFocus(false)}
                  required
                  style={{
                    ...inputBaseStyle,
                    paddingRight: '5.5rem',
                    ...(passwordFocus ? inputFocusStyle : {}),
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
                  aria-pressed={showPassword}
                  title={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
                  style={{
                    position: 'absolute',
                    right: '0.4rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    padding: '0.4rem 0.65rem',
                    cursor: 'pointer',
                    color: '#5c7087',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                  <span>{showPassword ? 'Gizle' : 'Göster'}</span>
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '1.4rem' }}>
              <Link
                to="/forgot-password"
                style={{
                  fontSize: '0.85rem',
                  color: '#2d7ff9',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Şifremi Unuttum?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.85rem',
                border: 'none',
                borderRadius: '10px',
                background: isSubmitting ? '#9bb6e6' : '#2d7ff9',
                color: '#fff',
                fontSize: '0.98rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.55rem',
                boxShadow: isSubmitting ? 'none' : '0 8px 20px rgba(45,127,249,0.35)',
                transition: 'background 140ms ease, box-shadow 140ms ease',
              }}
            >
              <FaSignInAlt /> {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <p
            style={{
              textAlign: 'center',
              color: '#6c757d',
              fontSize: '0.8rem',
              margin: '1.5rem 0 0',
            }}
          >
            © {new Date().getFullYear()} Servis Yönetimi · Tüm hakları saklıdır.
          </p>
        </div>
      </main>
    </div>
  )
}

export default Login

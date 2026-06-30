import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const LAST_LOGIN_IDENTIFIER_KEY = 'last-login-identifier'

const inputStyle = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  border: '1px solid #d0d7de',
  borderRadius: '8px',
  fontSize: '0.95rem',
  outline: 'none',
  transition: 'border-color 120ms ease, box-shadow 120ms ease',
  background: '#fff',
  color: '#12263a',
}

const inputFocusStyle = {
  borderColor: '#2d7ff9',
  boxShadow: '0 0 0 3px rgba(45, 127, 249, 0.15)',
}

const buttonStyle = {
  width: '100%',
  padding: '0.75rem',
  border: 'none',
  borderRadius: '8px',
  background: '#2d7ff9',
  color: '#fff',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: '0.5rem',
}

const buttonDisabledStyle = {
  opacity: 0.7,
  cursor: 'not-allowed',
}

const LoginPage = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [emailOrPhone, setEmailOrPhone] = useState(localStorage.getItem(LAST_LOGIN_IDENTIFIER_KEY) || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailFocus, setEmailFocus] = useState(false)
  const [passwordFocus, setPasswordFocus] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const res = await login(emailOrPhone, password)

    if (res.ok) {
      localStorage.setItem(LAST_LOGIN_IDENTIFIER_KEY, emailOrPhone)
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } else {
      setError(res.message || 'Giriş yapılamadı, bilgilerinizi kontrol edin.')
    }
    setIsLoading(false)
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontWeight: 700, color: '#2d7ff9', margin: 0 }}>Servis Yönetimi</h3>
        <p style={{ color: '#6c757d', margin: '0.4rem 0 0 0', fontSize: '0.9rem' }}>
          Sisteme erişmek için giriş yapın
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '0.7rem 0.9rem',
            borderRadius: '8px',
            background: '#fde8e8',
            color: '#b42318',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} autoComplete="on">
        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="login-identifier"
            style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem', color: '#12263a' }}
          >
            E-posta veya Telefon
          </label>
          <input
            id="login-identifier"
            type="text"
            name="login_identifier"
            autoComplete="username"
            placeholder="Kullanıcı adı"
            value={emailOrPhone}
            onChange={(e) => setEmailOrPhone(e.target.value)}
            onFocus={() => setEmailFocus(true)}
            onBlur={() => setEmailFocus(false)}
            required
            style={{ ...inputStyle, ...(emailFocus ? inputFocusStyle : {}) }}
          />
        </div>

        <div style={{ marginBottom: '0.5rem' }}>
          <label
            htmlFor="login-password"
            style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem', color: '#12263a' }}
          >
            Parola
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              name="login_password"
              autoComplete="current-password"
              placeholder="Parolanız"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocus(true)}
              onBlur={() => setPasswordFocus(false)}
              required
              style={{ ...inputStyle, paddingRight: '2.75rem', ...(passwordFocus ? inputFocusStyle : {}) }}
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
                padding: '0.35rem 0.55rem',
                cursor: 'pointer',
                color: '#5c7087',
                fontSize: '0.85rem',
                fontWeight: 500,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <span aria-hidden="true">{showPassword ? '🙈' : '👁'}</span>
              <span>{showPassword ? 'Gizle' : 'Göster'}</span>
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'right', marginBottom: '1.25rem' }}>
          <Link
            to="/forgot-password"
            style={{ fontSize: '0.85rem', color: '#2d7ff9', textDecoration: 'none', fontWeight: 500 }}
          >
            Şifremi Unuttum?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{ ...buttonStyle, ...(isLoading ? buttonDisabledStyle : {}) }}
        >
          {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  )
}

export default LoginPage

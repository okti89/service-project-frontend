import { useMemo, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

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
  marginTop: '0.25rem',
}

const successButtonStyle = { ...buttonStyle, background: '#2f9e44' }

const buttonDisabledStyle = {
  opacity: 0.7,
  cursor: 'not-allowed',
}

const ResetPasswordPage = () => {
  const { verifyResetCode, confirmResetPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const accountStr = useMemo(() => {
    const fromState = location.state?.accountStr
    if (fromState) {
      try { localStorage.setItem('password-reset-account', fromState) } catch {}
      return fromState
    }
    try {
      return localStorage.getItem('password-reset-account') || ''
    } catch {
      return ''
    }
  }, [location.state])

  const [step, setStep] = useState(1)
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [codeFocus, setCodeFocus] = useState(false)
  const [passwordFocus, setPasswordFocus] = useState(false)

  if (!accountStr) {
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#b42318' }}>Güvenlik adımı atlandı. Lütfen baştan başlayın.</p>
        <Link
          to="/forgot-password"
          style={{
            display: 'inline-block',
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#2d7ff9',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
          }}
        >
          Geri Dön
        </Link>
      </div>
    )
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const res = await verifyResetCode(accountStr, code)

    if (res.ok) {
      setStep(2)
    } else {
      setError(res.message || 'Geçersiz veya süresi dolmuş kod.')
    }
    setIsLoading(false)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const res = await confirmResetPassword(accountStr, code, newPassword)

    if (res.ok) {
      try { localStorage.removeItem('password-reset-account') } catch {}
      navigate('/login')
    } else {
      setError(res.message || 'Şifre güncellenemedi.')
    }
    setIsLoading(false)
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h4 style={{ fontWeight: 700, margin: 0, color: '#12263a' }}>Şifre Sıfırlama</h4>
        <p style={{ color: '#6c757d', margin: '0.4rem 0 0 0', fontSize: '0.85rem' }}>
          {step === 1
            ? `${accountStr} için gelen 4 haneli kodu girin.`
            : 'Lütfen güvenli yeni bir şifre belirleyin (en az 8 karakter).'}
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

      {step === 1 ? (
        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="reset-code"
              style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem', color: '#12263a' }}
            >
              Doğrulama Kodu
            </label>
            <input
              id="reset-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{4}"
              placeholder="Örn: 1234"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onFocus={() => setCodeFocus(true)}
              onBlur={() => setCodeFocus(false)}
              maxLength={4}
              required
              style={{
                ...inputStyle,
                ...(codeFocus
                  ? { borderColor: '#2d7ff9', boxShadow: '0 0 0 3px rgba(45, 127, 249, 0.15)' }
                  : {}),
                letterSpacing: '0.5rem',
                textAlign: 'center',
                fontSize: '1.1rem',
                fontWeight: 600,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || code.length !== 4}
            style={{ ...buttonStyle, ...(isLoading || code.length !== 4 ? buttonDisabledStyle : {}) }}
          >
            {isLoading ? 'Doğrulanıyor...' : 'İleri'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="reset-new-password"
              style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem', color: '#12263a' }}
            >
              Yeni Şifre
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="reset-new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Yeni şifrenizi girin"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={() => setPasswordFocus(true)}
                onBlur={() => setPasswordFocus(false)}
                minLength={8}
                required
                style={{
                  ...inputStyle,
                  paddingRight: '2.75rem',
                  ...(passwordFocus
                    ? { borderColor: '#2d7ff9', boxShadow: '0 0 0 3px rgba(45, 127, 249, 0.15)' }
                    : {}),
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                aria-pressed={showPassword}
                title={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
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

          <button
            type="submit"
            disabled={isLoading}
            style={{ ...successButtonStyle, ...(isLoading ? buttonDisabledStyle : {}) }}
          >
            {isLoading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
          </button>
        </form>
      )}

      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <Link to="/login" style={{ fontSize: '0.85rem', color: '#6c757d', textDecoration: 'none' }}>
          İptal Et ve Girişe Dön
        </Link>
      </div>
    </div>
  )
}

export default ResetPasswordPage

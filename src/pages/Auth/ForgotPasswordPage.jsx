import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

const buttonDisabledStyle = {
  opacity: 0.7,
  cursor: 'not-allowed',
}

const ForgotPasswordPage = () => {
  const { requestPasswordReset } = useAuth()
  const navigate = useNavigate()

  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [focus, setFocus] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const res = await requestPasswordReset(emailOrPhone)

    if (res.ok) {
      try { localStorage.setItem('password-reset-account', emailOrPhone) } catch {}
      navigate('/reset-password', { state: { accountStr: emailOrPhone } })
    } else {
      setError(res.message || 'Kod gönderilirken bir hata oluştu.')
    }
    setIsLoading(false)
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h4 style={{ fontWeight: 700, margin: 0, color: '#12263a' }}>Şifremi Unuttum</h4>
        <p style={{ color: '#6c757d', margin: '0.4rem 0 0 0', fontSize: '0.85rem' }}>
          Sistemde kayıtlı e-posta veya telefon numaranızı girin. Size bir sıfırlama kodu göndereceğiz.
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

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="forgot-email"
            style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem', color: '#12263a' }}
          >
            E-posta veya Telefon
          </label>
          <input
            id="forgot-email"
            type="text"
            placeholder="Örn: 05xxxxxxxxx veya ornek@serfix.com"
            value={emailOrPhone}
            onChange={(e) => setEmailOrPhone(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            required
            style={{
              ...inputStyle,
              ...(focus
                ? { borderColor: '#2d7ff9', boxShadow: '0 0 0 3px rgba(45, 127, 249, 0.15)' }
                : {}),
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{ ...buttonStyle, ...(isLoading ? buttonDisabledStyle : {}) }}
        >
          {isLoading ? 'Gönderiliyor...' : 'Sıfırlama Kodu Gönder'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/login" style={{ fontSize: '0.85rem', color: '#6c757d', textDecoration: 'none' }}>
            Giriş ekranına dön
          </Link>
        </div>
      </form>
    </div>
  )
}

export default ForgotPasswordPage

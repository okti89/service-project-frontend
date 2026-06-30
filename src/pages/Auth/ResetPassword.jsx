import React, { useMemo, useState } from 'react'
import { Form, Button, Alert, InputGroup } from 'react-bootstrap'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'react-hot-toast'
import { FaEye, FaEyeSlash } from 'react-icons/fa'

const ResetPassword = () => {
  const { verifyResetCode, confirmResetPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const accountStr = useMemo(() => {
    const fromState = location.state?.accountStr || location.state?.email
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

  if (!accountStr) {
    return (
      <div className="text-center">
        <p className="text-danger">Güvenlik adımı atlandı. Lütfen baştan başlayın.</p>
        <Link to="/forgot-password" className="btn btn-primary mt-3">Geri Dön</Link>
      </div>
    )
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const res = await verifyResetCode(accountStr, code)

    if (res.ok) {
      toast.success('Kod doğrulandı, yeni şifrenizi belirleyebilirsiniz.')
      setStep(2)
    } else {
      setError(res.message || 'Geçersiz veya süresi dolmuş kod.')
      toast.error('Kod hatalı.')
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
      toast.success('Şifreniz başarıyla değiştirildi. Giriş yapabilirsiniz.')
      navigate('/login')
    } else {
      setError(res.message || 'Şifre güncellenemedi.')
      toast.error('İşlem başarısız.')
    }
    setIsLoading(false)
  }

  return (
    <div>
      <div className="text-center mb-4">
        <h4 className="fw-bold">Şifre Sıfırlama</h4>
        <p className="text-muted small">
          {step === 1
            ? `${accountStr} için gelen 4 haneli kodu girin.`
            : 'Lütfen güvenli yeni bir şifre belirleyin (en az 8 karakter).'}
        </p>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {step === 1 ? (
        <Form onSubmit={handleVerify}>
          <Form.Group className="mb-4" controlId="formBasicCode">
            <Form.Label>Doğrulama Kodu</Form.Label>
            <Form.Control
              type="text"
              inputMode="numeric"
              pattern="[0-9]{4}"
              placeholder="Örn: 1234"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              required
            />
          </Form.Group>

          <Button variant="primary" type="submit" className="w-100 py-2 fw-bold mb-3" disabled={isLoading || code.length !== 4}>
            {isLoading ? 'Doğrulanıyor...' : 'İleri'}
          </Button>
        </Form>
      ) : (
        <Form onSubmit={handleReset}>
          <Form.Group className="mb-4" controlId="formBasicPassword">
            <Form.Label>Yeni Şifre</Form.Label>
            <InputGroup>
              <Form.Control
                type={showPassword ? 'text' : 'password'}
                placeholder="Yeni şifrenizi girin"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                title={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
                <span className="d-none d-sm-inline">{showPassword ? 'Gizle' : 'Göster'}</span>
              </Button>
            </InputGroup>
          </Form.Group>

          <Button variant="success" type="submit" className="w-100 py-2 fw-bold mb-3" disabled={isLoading}>
            {isLoading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
          </Button>
        </Form>
      )}

      <div className="text-center">
        <Link to="/login" className="text-decoration-none text-muted small">
          İptal Et ve Girişe Dön
        </Link>
      </div>
    </div>
  )
}

export default ResetPassword

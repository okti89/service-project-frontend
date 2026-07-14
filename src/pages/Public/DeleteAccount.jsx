import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaArrowLeft, FaCheckCircle, FaShieldAlt, FaTrashAlt } from 'react-icons/fa'
import api from '../../api/api'

const deletionEndpoint = `${api.defaults.baseURL.replace(/\/api\/?$/, '')}/api/account-deletion-requests/`

export default function DeleteAccount() {
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const submitRequest = async (event) => {
    event.preventDefault()
    setStatus('submitting')
    setError('')

    try {
      await api.post(deletionEndpoint, { email, note })
      setStatus('submitted')
    } catch (requestError) {
      setStatus('idle')
      setError(requestError.response?.data?.detail || 'Talep gönderilemedi. Lütfen tekrar deneyin.')
    }
  }

  return (
    <main className="min-vh-100 py-5" style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #f8fafc 48%, #eff6ff 100%)' }}>
      <div className="container" style={{ maxWidth: 760 }}>
        <Link to="/" className="text-decoration-none fw-semibold d-inline-flex align-items-center gap-2 mb-4" style={{ color: '#2563eb' }}>
          <FaArrowLeft /> Ana sayfaya dön
        </Link>
        <article className="bg-white border rounded-4 shadow-sm p-4 p-md-5">
          <div className="d-flex align-items-center gap-3 mb-4">
            <div className="d-flex align-items-center justify-content-center rounded-4" style={{ width: 58, height: 58, background: '#ffedd5', color: '#c2410c' }}>
              <FaTrashAlt size={22} />
            </div>
            <div>
              <h1 className="h2 fw-bold mb-1">Hesap Silme Talebi</h1>
              <p className="text-muted mb-0">Servis Yönetimi</p>
            </div>
          </div>

          {status === 'submitted' ? (
            <div className="text-center py-4">
              <FaCheckCircle size={48} style={{ color: '#16a34a' }} className="mb-3" />
              <h2 className="h4 fw-bold">Talebiniz alındı</h2>
              <p className="text-secondary mb-0">Hesap silme işlemi tamamlandığında kayıtlı e-posta adresiniz üzerinden bilgilendirileceksiniz.</p>
            </div>
          ) : (
            <>
              <p className="text-secondary" style={{ lineHeight: 1.7 }}>Uygulamaya erişemiyorsanız, hesabınıza bağlı e-posta adresini yazarak silme talebi oluşturabilirsiniz. Talep, yetkili ekip tarafından doğrulanarak işleme alınır.</p>
              <form onSubmit={submitRequest} noValidate>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label fw-semibold">Hesap e-posta adresi</label>
                  <input id="email" className="form-control form-control-lg" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
                </div>
                <div className="mb-4">
                  <label htmlFor="note" className="form-label fw-semibold">Açıklama <span className="text-muted fw-normal">(isteğe bağlı)</span></label>
                  <textarea id="note" className="form-control" rows="3" value={note} onChange={(event) => setNote(event.target.value)} maxLength="1000" />
                </div>
                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                <button className="btn btn-danger btn-lg w-100" type="submit" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Talep gönderiliyor...' : 'Hesap silme talebi oluştur'}
                </button>
              </form>
            </>
          )}

          <hr className="my-4" />
          <section className="d-flex gap-3">
            <FaShieldAlt className="mt-1 flex-shrink-0" style={{ color: '#2563eb' }} />
            <div className="text-secondary" style={{ lineHeight: 1.65 }}>
              <strong className="text-body">Silme ve saklama bilgisi:</strong> Hesap silindiğinde oturum, cihaz, konum ve profil verileri kaldırılır. Yasal veya muhasebesel saklama yükümlülüğü bulunan kurumsal servis kayıtları, kullanıcı kimliğiyle bağlantısı kaldırılarak saklanabilir. Ayrıntılar için <Link to="/privacy-policy/">Gizlilik Politikası</Link>'nı inceleyin.
            </div>
          </section>
        </article>
      </div>
    </main>
  )
}
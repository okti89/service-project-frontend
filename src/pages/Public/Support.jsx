import { Link } from 'react-router-dom'
import { FaArrowLeft, FaHeadset, FaWhatsapp } from 'react-icons/fa'

export default function Support() {
  return <main className="min-vh-100 py-5" style={{ background: 'linear-gradient(135deg, #eff6ff, #f8fafc)' }}>
    <div className="container" style={{ maxWidth: 800 }}>
      <Link to="/" className="text-decoration-none fw-semibold d-inline-flex align-items-center gap-2 mb-4"><FaArrowLeft /> Ana sayfaya dön</Link>
      <article className="bg-white border rounded-4 shadow-sm p-4 p-md-5">
        <div className="d-flex align-items-center gap-3 mb-4"><FaHeadset size={32} color="#2563eb" /><div><h1 className="h2 fw-bold mb-1">Servis Asistanı Destek</h1><p className="text-muted mb-0">Uygulama kullanımı ve hesap işlemleri için yardım</p></div></div>
        <p className="text-secondary">Giriş, servis kayıtları, bildirimler veya teknik bir sorunla ilgili bize WhatsApp üzerinden yazabilirsiniz. Sorununuzu anlatırken müşteri bilgisi ya da şifre paylaşmayın.</p>
        <a className="btn btn-success btn-lg d-inline-flex align-items-center gap-2 my-3" href="https://wa.me/905426907712?text=Servis%20Asistan%C4%B1%20destek%20talebi" target="_blank" rel="noopener noreferrer"><FaWhatsapp /> WhatsApp destek</a>
        <hr className="my-4" />
        <h2 className="h5 fw-bold">Hesap ve gizlilik</h2>
        <p className="text-secondary">Hesabınızı uygulamadaki Profil &gt; Hesabımı Sil bölümünden silebilirsiniz. Uygulamaya erişemiyorsanız aşağıdaki hesap silme talebi sayfasını kullanın.</p>
        <div className="d-flex flex-wrap gap-3"><Link to="/delete-account/">Hesap silme talebi</Link><Link to="/privacy-policy/">Gizlilik Politikası</Link><Link to="/terms/">Kullanım koşulları</Link></div>
      </article>
    </div>
  </main>
}

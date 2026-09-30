import { Link } from 'react-router-dom'
import { FaArrowLeft, FaFileContract } from 'react-icons/fa'

const sections = [
  ['Hizmet', 'Servis Asistanı, işletmelerin müşteri, servis, stok ve saha işlerini yönetmesine yardımcı olur. Özelliklere erişim, işletmenin hesabına ve kullanıcı yetkisine bağlıdır.'],
  ['Hesap ve yetki', 'Kullanıcılar hesap bilgilerini korumalı ve yalnızca yetkili oldukları işletme verilerini işlemelidir. İşletme yöneticisi, çalışan erişimlerini ve uygulamaya girilen kayıtların doğruluğunu yönetir.'],
  ['Servis kayıtları', 'Uygulamada oluşturulan servis formu, teklif ve benzeri belgelerdeki bilgilerin doğruluğu ve müşteriye sunulması ilgili işletmenin sorumluluğundadır.'],
  ['Destek ve hesap silme', 'Uygulamayla ilgili yardım ve hesap silme talepleri destek sayfasından iletilebilir. Kişisel verilerin işlenmesine ilişkin ayrıntılar Gizlilik Politikası’nda açıklanır.'],
]

export default function Terms() {
  return <main className="min-vh-100 py-5" style={{ background: 'linear-gradient(135deg, #f1f5f9, #eff6ff)' }}><div className="container" style={{ maxWidth: 840 }}>
    <Link to="/" className="text-decoration-none fw-semibold d-inline-flex align-items-center gap-2 mb-4"><FaArrowLeft /> Ana sayfaya dön</Link>
    <article className="bg-white border rounded-4 shadow-sm p-4 p-md-5"><div className="d-flex align-items-center gap-3 mb-4"><FaFileContract size={30} color="#2563eb" /><div><h1 className="h2 fw-bold mb-1">Kullanım Koşulları</h1><p className="text-muted mb-0">Son güncelleme: 1 Ekim 2026</p></div></div>
      {sections.map(([title, body]) => <section key={title} className="mt-4"><h2 className="h5 fw-bold">{title}</h2><p className="text-secondary mb-0" style={{ lineHeight: 1.75 }}>{body}</p></section>)}
      <div className="d-flex flex-wrap gap-3 mt-5"><Link to="/support/">Destek</Link><Link to="/privacy-policy/">Gizlilik Politikası</Link><Link to="/delete-account/">Hesap silme</Link></div>
    </article>
  </div></main>
}

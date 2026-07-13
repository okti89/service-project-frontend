import { Link } from 'react-router-dom'
import { FaArrowLeft, FaShieldAlt } from 'react-icons/fa'

const sections = [
  ['Toplanan veriler', 'Hesap bilgileri, müşteri ve servis kayıtları, adres, servis fotoğrafları, imza, tahsilat kayıtları, cihaz ve bildirim kimlikleri ile aktif vardiyada teknisyen konumu işlenebilir.'],
  ['İşleme amaçları', 'Veriler; kullanıcı hesabını, servis iş emirlerini, müşteri iletişimini, servis belgelerini, saha görevlerini ve bildirimleri yönetmek için kullanılır. Veriler reklam amacıyla satılmaz veya izleme profili oluşturmak için kullanılmaz.'],
  ['Konum verisi', 'Arka plan konumu yalnızca teknisyen aktif vardiya takibini başlattığında ve açık rıza ile işlenir. Konum, görev yönetimi ve yetkili yöneticilerin canlı takip ekranı için sunucuya aktarılır.'],
  ['Saklama ve silme', 'Kullanıcı hesabı mobil uygulamadaki Profil > Hesabımı Sil adımından silinebilir. Hesap silindiğinde kullanıcıya bağlı oturum, cihaz, konum ve profil verileri kaldırılır. Yasal veya muhasebesel saklama yükümlülüğü bulunan kurumsal servis kayıtları, kullanıcı kimliğinden ayrıştırılarak saklanabilir.'],
  ['İletişim', 'Gizlilik talepleriniz için uygulamadaki Ayarlar > E-posta ile Geri Bildirim alanından destek ekibiyle iletişime geçebilirsiniz.'],
]

export default function PrivacyPolicy() {
  return <main className="min-vh-100 py-5" style={{ background: 'linear-gradient(135deg, #eef6ff 0%, #f8fafc 52%, #f1f5f9 100%)' }}><div className="container" style={{ maxWidth: 840 }}><Link to="/" className="text-decoration-none fw-semibold d-inline-flex align-items-center gap-2 mb-4" style={{ color: '#2563eb' }}><FaArrowLeft /> Ana sayfaya dön</Link><article className="bg-white border rounded-4 shadow-sm p-4 p-md-5"><div className="d-flex align-items-center gap-3 mb-4"><div className="d-flex align-items-center justify-content-center rounded-4" style={{ width: 58, height: 58, background: '#dbeafe', color: '#2563eb' }}><FaShieldAlt size={25} /></div><div><h1 className="h2 fw-bold mb-1">Gizlilik Politikası</h1><p className="text-muted mb-0">Son güncelleme: 13 Temmuz 2026</p></div></div><p className="lead text-secondary">Servis Asistanı, işletmelerin servis, müşteri ve saha operasyonlarını yönetmesi için sunulan kurumsal bir uygulamadır.</p>{sections.map(([title, text]) => <section key={title} className="mt-4"><h2 className="h5 fw-bold">{title}</h2><p className="text-secondary mb-0" style={{ lineHeight: 1.75 }}>{text}</p></section>)}</article></div></main>
}
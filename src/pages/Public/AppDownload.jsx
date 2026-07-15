import { Link } from 'react-router-dom'
import {
  FaAndroid,
  FaArrowRight,
  FaCheckCircle,
  FaCloudDownloadAlt,
  FaShieldAlt,
  FaWrench,
} from 'react-icons/fa'

const downloadUrl = 'https://pub-8309817c367046ac85612c98a82038cb.r2.dev/servis%20y%C3%B6netim.apk'

const steps = [
  ['1', 'APK dosyasını indirin', 'İndirme başladığında dosyanın tamamlanmasını bekleyin.'],
  ['2', 'Dosyayı açın', 'İndirilen APK dosyasına dokunarak kurulumu başlatın.'],
  ['3', 'Uygulamayı kullanın', 'Giriş yapın ve servis operasyonlarınızı mobilde yönetin.'],
]

export default function AppDownload() {
  return (
    <main className="min-vh-100 overflow-hidden" style={{ background: '#09202f', color: '#edf6f8' }}>
      <div style={{ position: 'fixed', width: 460, height: 460, borderRadius: '50%', background: 'rgba(36, 191, 170, 0.16)', filter: 'blur(4px)', top: -210, right: -160, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', width: 380, height: 380, borderRadius: '50%', background: 'rgba(68, 145, 229, 0.14)', filter: 'blur(3px)', bottom: -190, left: -170, pointerEvents: 'none' }} />

      <div className="container position-relative py-4 py-md-5" style={{ maxWidth: 1080 }}>
        <header className="d-flex align-items-center justify-content-between mb-5">
          <Link to="/" className="d-inline-flex align-items-center gap-2 text-decoration-none" style={{ color: '#e8f7f5', fontWeight: 800, letterSpacing: '-0.02em' }}>
            <span className="d-inline-flex align-items-center justify-content-center" style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, #25b9a5, #2777c7)' }}><FaWrench /></span>
            Servis Yönetimi
          </Link>
          <Link to="/login" className="text-decoration-none d-none d-sm-inline-flex align-items-center gap-2" style={{ color: '#b9d9d7', fontWeight: 650 }}>
            Web panele giriş <FaArrowRight size={13} />
          </Link>
        </header>

        <section className="row align-items-center g-4 g-lg-5 pb-5">
          <div className="col-lg-7">
            <div className="d-inline-flex align-items-center gap-2 mb-4 px-3 py-2 rounded-pill" style={{ background: 'rgba(67, 203, 178, 0.12)', border: '1px solid rgba(85, 227, 200, 0.24)', color: '#8be8d6', fontSize: 13, fontWeight: 750 }}>
              <FaAndroid /> Android uygulaması
            </div>
            <h1 className="mb-3" style={{ maxWidth: 650, fontSize: 'clamp(2.45rem, 5.4vw, 4.75rem)', lineHeight: 0.98, letterSpacing: '-0.055em', fontWeight: 850 }}>
              Servis ekibiniz<br />sahada da <span style={{ color: '#58d9c5' }}>senkron.</span>
            </h1>
            <p className="mb-4" style={{ maxWidth: 575, color: '#b5ced3', fontSize: '1.08rem', lineHeight: 1.72 }}>
              Servis Yönetimi ile servis kayıtlarını, müşteri bilgilerini, saha görevlerini ve finansal takibi tek mobil uygulamada yönetin.
            </p>
            <div className="d-flex flex-column flex-sm-row gap-3 align-items-sm-center">
              <a href={downloadUrl} className="btn d-inline-flex align-items-center justify-content-center gap-3 px-4 py-3" style={{ borderRadius: 14, border: 0, background: '#51d2bd', color: '#07252d', fontWeight: 850, fontSize: '1.02rem', boxShadow: '0 15px 32px rgba(16, 176, 151, 0.24)' }}>
                <FaCloudDownloadAlt size={21} /> Android için indir
              </a>
              <span className="d-inline-flex align-items-center gap-2" style={{ color: '#86a8ad', fontSize: 13 }}><FaShieldAlt color="#77d8c7" /> Güvenli APK kurulumu</span>
            </div>
            <p className="mt-3 mb-0" style={{ color: '#78999f', fontSize: 12.5 }}>İndirme bağlantısı Google Drive üzerinden sunulur. Kurulum, yalnızca Android cihazlarda desteklenir.</p>
          </div>

          <div className="col-lg-5">
            <div className="p-4 p-md-5" style={{ background: 'linear-gradient(145deg, rgba(24, 62, 75, 0.96), rgba(11, 39, 54, 0.92))', border: '1px solid rgba(174, 237, 227, 0.15)', borderRadius: 28, boxShadow: '0 30px 65px rgba(0, 0, 0, 0.24)' }}>
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div><p className="mb-1" style={{ color: '#8eb4ba', fontSize: 13, fontWeight: 700 }}>MOBİL ÇALIŞMA ALANI</p><h2 className="h4 mb-0 fw-bold">Her şey yanınızda</h2></div>
                <div className="d-flex align-items-center justify-content-center" style={{ width: 54, height: 54, borderRadius: 18, background: 'rgba(76, 211, 188, 0.13)', color: '#62dcc7' }}><FaAndroid size={27} /></div>
              </div>
              {['Servis kaydı ve form gönderimi', 'Müşteri ve servis geçmişi', 'Tahsilat, gider ve bordro takibi', 'Aktif vardiyada saha konumu'].map((item) => <div key={item} className="d-flex align-items-center gap-3 py-3" style={{ borderTop: '1px solid rgba(214, 246, 240, 0.09)', color: '#d5e8e9' }}><FaCheckCircle style={{ color: '#59d5bf', flexShrink: 0 }} /><span style={{ fontWeight: 650 }}>{item}</span></div>)}
            </div>
          </div>
        </section>

        <section className="pb-4">
          <div className="d-flex align-items-center gap-3 mb-4"><span style={{ width: 34, height: 1, background: '#5bd8c4' }} /><p className="mb-0 text-uppercase" style={{ color: '#86a8ad', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em' }}>3 adımda kurulum</p></div>
          <div className="row g-3">
            {steps.map(([number, title, text]) => <div key={number} className="col-md-4"><div className="h-100 p-4" style={{ background: 'rgba(255, 255, 255, 0.055)', border: '1px solid rgba(214, 246, 240, 0.1)', borderRadius: 18 }}><span className="d-inline-flex align-items-center justify-content-center mb-4" style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(82, 210, 189, 0.13)', color: '#66dbc7', fontWeight: 850 }}>{number}</span><h2 className="h5 fw-bold">{title}</h2><p className="mb-0" style={{ color: '#9ebbc0', lineHeight: 1.65, fontSize: 14 }}>{text}</p></div></div>)}
          </div>
        </section>

        <footer className="d-flex flex-column flex-sm-row justify-content-between gap-2 pt-4 mt-3" style={{ borderTop: '1px solid rgba(214, 246, 240, 0.1)', color: '#78999f', fontSize: 13 }}>
          <span>Servis Yönetimi mobil uygulaması</span>
          <Link to="/privacy-policy/" className="text-decoration-none" style={{ color: '#93c8c1' }}>Gizlilik Politikası</Link>
        </footer>
      </div>
    </main>
  )
}
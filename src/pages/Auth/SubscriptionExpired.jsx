import { FaCalendarTimes, FaSignOutAlt } from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'

const formatEndDate = (value) => {
  if (!value) return null
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

export default function SubscriptionExpired() {
  const { user, logout } = useAuth()
  const endDate = formatEndDate(user?.subscription?.ends_at)

  return (
    <main className="subscription-expired-page">
      <section className="subscription-expired-card">
        <div className="subscription-expired-icon">
          <FaCalendarTimes aria-hidden="true" />
        </div>
        <p className="subscription-expired-eyebrow">FİRMA ÜYELİĞİ</p>
        <h1>Üyelik süresi doldu</h1>
        <p className="subscription-expired-description">
          Bu firmaya ait deneme veya premium üyelik sona erdi. Verileriniz korunur, ancak üyelik aktifleşene kadar uygulama özellikleri kullanılamaz.
        </p>
        {endDate && <p className="subscription-expired-date">Bitiş tarihi: {endDate}</p>}
        <button type="button" className="subscription-expired-logout" onClick={logout}>
          <FaSignOutAlt aria-hidden="true" />
          Çıkış yap
        </button>
      </section>
    </main>
  )
}

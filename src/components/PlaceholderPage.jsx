import React from 'react'
import { Link } from 'react-router-dom'
import { FaArrowRight, FaClock } from 'react-icons/fa'
import PageHeader from './PageHeader'

const PlaceholderPage = ({ title, description, links = [] }) => (
  <div className="admin-placeholder">
    <PageHeader
      eyebrow="Admin Panel"
      title={title}
      description={description || 'Bu alan için temel yönlendirme yapısı hazır. Detay ekranı bir sonraki adımda genişletilebilir.'}
    />

    <div className="bg-white p-4 shadow-sm rounded-4 border">
      <div className="d-flex align-items-center gap-3 mb-3">
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-3"
          style={{ width: 48, height: 48, background: '#e8f1fb', color: '#1f5fc4' }}
        >
          <FaClock />
        </div>
        <div>
          <h5 className="fw-bold mb-1 text-dark">Modül hazırlığı tamamlandı</h5>
          <p className="text-muted mb-0">Bu sayfa için erişim bağlantıları aktif edildi. İçerik ekranı gerektiğinde aynı yapı içinde genişletilebilir.</p>
        </div>
      </div>

      {links.length > 0 ? (
        <div className="d-flex flex-wrap gap-2 mt-4">
          {links.map((item) => (
            <Link key={item.to} to={item.to} className="btn btn-outline-primary d-inline-flex align-items-center gap-2">
              <span>{item.label}</span>
              <FaArrowRight size={12} />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  </div>
)

export default PlaceholderPage

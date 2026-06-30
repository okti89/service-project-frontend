import { Outlet } from 'react-router-dom'

const AuthLayout = () => (
  <div
    className="min-vh-100 d-flex justify-content-center align-items-center"
    style={{ background: 'linear-gradient(135deg, #182b3a 0%, #203a43 50%, #2c5364 100%)' }}
  >
    <div className="p-4 bg-white rounded-3 shadow" style={{ width: '400px' }}>
      <Outlet />
    </div>
  </div>
)

export default AuthLayout

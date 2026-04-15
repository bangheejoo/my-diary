import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function GuestRoute() {
  const { user, loading } = useAuth()

  if (loading) return <div className="app-container"><div className="loading-screen"><div className="spinner" /></div></div>
  if (user) return <Navigate to="/main" replace />
  return <Outlet />
}

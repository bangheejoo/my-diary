import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PrivateRoute() {
  const { user, loading } = useAuth()

  if (loading) return <div className="app-container"><div className="loading-screen"><div className="spinner" /></div></div>
  if (!user) return <Navigate to="/" replace />
  return <Outlet />
}

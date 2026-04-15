import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import GuestRoute from './components/GuestRoute'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import MainPage from './pages/main/MainPage'
import WritePage from './pages/write/WritePage'
import FriendsPage from './pages/friends/FriendsPage'
import MyPage from './pages/mypage/MyPage'
import SettingsPage from './pages/settings/SettingsPage'

export default function App() {
  return (
    <BrowserRouter basename="/my-diary">
      <AuthProvider>
        <Routes>
          {/* 비로그인 전용 */}
          <Route element={<GuestRoute />}>
            <Route path="/" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* 로그인 필요 */}
          <Route element={<PrivateRoute />}>
            <Route path="/main" element={<MainPage />} />
            <Route path="/write" element={<WritePage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logIn } from '../../services/authService'
import { isValidEmail } from '../../utils/validation'
import { showToast } from '../../utils/toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)

  function validate() {
    const errs: typeof errors = {}
    if (!isValidEmail(email)) errs.email = '올바른 이메일을 입력해 주세요'
    if (!password) errs.password = '비밀번호를 입력해 주세요'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      await logIn(email, password)
      navigate('/main')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      const msg =
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
          ? '이메일 또는 비밀번호가 올바르지 않아요'
          : code === 'auth/too-many-requests'
          ? '로그인 시도가 너무 많아요 잠시 후 다시 시도해 주세요'
          : '로그인에 실패했어요 다시 시도해 주세요'
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>나만의 일기장</h1>
          <p>나만의 소중한 하루를 기록해 보세요</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">이메일 (아이디)</label>
            <input
              className={`form-input${errors.email ? ' input-error' : ''}`}
              type="email"
              id="email"
              placeholder="이메일을 입력해 주세요"
              autoComplete="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: undefined })) }}
            />
            {errors.email && <p className="err-msg">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">비밀번호</label>
            <div style={{ position: 'relative' }}>
              <input
                className={`form-input${errors.password ? ' input-error' : ''}`}
                type={showPw ? 'text' : 'password'}
                id="password"
                placeholder="비밀번호를 입력해 주세요"
                autoComplete="current-password"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: undefined })) }}
              />
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: '0.4rem', top: '50%', transform: 'translateY(-50%)' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {showPw ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </>
                  )}
                </svg>
              </button>
            </div>
            {errors.password && <p className="err-msg">{errors.password}</p>}
          </div>

          <div style={{ textAlign: 'right' }}>
            <Link to="/reset-password" className="text-sm text-muted" style={{ textDecoration: 'none' }}>
              비밀번호를 잊으셨나요?
            </Link>
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
            {loading ? <><span className="spinner" /> 로그인 중...</> : '로그인'}
          </button>

          <p className="text-center text-sm text-muted">
            아직 계정이 없으신가요?{' '}
            <Link to="/signup" className="text-pink font-medium" style={{ textDecoration: 'none' }}>
              가입하기
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

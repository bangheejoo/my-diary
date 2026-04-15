import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordReset } from '../../services/authService'
import { isValidEmail } from '../../utils/validation'
import { showToast } from '../../utils/toast'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setEmailError('올바른 이메일을 입력해 주세요')
      return
    }
    setEmailError('')
    setLoading(true)
    try {
      await sendPasswordReset(email)
      setSent(true)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/user-not-found') {
        setEmailError('가입되지 않은 이메일이예요')
      } else {
        showToast('이메일 전송에 실패했어요', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>비밀번호 찾기</h1>
          <p>가입한 이메일로 재설정 링크를 보내드려요</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'var(--color-mint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#2d7a64" style={{ width: '1.75rem', height: '1.75rem' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="font-bold" style={{ fontSize: '1rem' }}>이메일을 전송했어요</p>
            <p className="text-muted text-sm">{email}</p>
            <p className="text-sm text-muted">메일함을 확인하고 링크를 클릭해 비밀번호를 재설정하세요.<br />메일이 도착하지 않았다면 스팸함도 확인해 보세요.</p>
            <Link to="/" className="btn btn-primary btn-full" style={{ marginTop: '0.5rem' }}>로그인하러가기</Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="email">이메일 (아이디)</label>
              <input
                className={`form-input${emailError ? ' input-error' : ''}`}
                type="email" id="email"
                placeholder="가입한 이메일을 입력해 주세요"
                autoComplete="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError('') }}
              />
              {emailError && <p className="err-msg">{emailError}</p>}
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? <><span className="spinner" /> 전송 중...</> : '재설정 링크 보내기'}
            </button>

            <p className="text-center text-sm text-muted">
              <Link to="/" className="text-pink font-medium" style={{ textDecoration: 'none' }}>
                로그인하러가기
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

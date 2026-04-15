import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUp, isNicknameTaken } from '../../services/authService'
import {
  isValidEmail, isValidPassword, isValidNickname, isValidPhone, isValidBirthdate,
} from '../../utils/validation'
import { showToast } from '../../utils/toast'

type Errors = Partial<Record<'email' | 'nickname' | 'password' | 'pwConfirm' | 'phone' | 'birthdate', string>>

export default function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '', nickname: '', password: '', pwConfirm: '', phone: '', birthdate: '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [nickStatus, setNickStatus] = useState<'idle' | 'ok' | 'fail'>('idle')
  const [nickChecking, setNickChecking] = useState(false)
  const [loading, setLoading] = useState(false)

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(v => ({ ...v, [key]: e.target.value }))
      if (key === 'nickname') setNickStatus('idle')
      setErrors(v => ({ ...v, [key]: undefined }))
    }
  }

  async function handleNickCheck() {
    const nick = form.nickname.trim()
    if (!isValidNickname(nick)) {
      setErrors(v => ({ ...v, nickname: '닉네임은 2~12자로 입력해 주세요' }))
      return
    }
    setNickChecking(true)
    try {
      const taken = await isNicknameTaken(nick)
      if (taken) {
        setNickStatus('fail')
        setErrors(v => ({ ...v, nickname: '이미 사용 중인 닉네임이예요' }))
      } else {
        setNickStatus('ok')
        setErrors(v => ({ ...v, nickname: undefined }))
      }
    } catch {
      showToast('닉네임 확인 중 오류가 발생했어요', 'error')
    } finally {
      setNickChecking(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Errors = {}
    const { email, nickname, password, pwConfirm, phone, birthdate } = form

    if (!isValidEmail(email)) errs.email = '올바른 이메일 형식으로 입력해 주세요'
    if (!isValidNickname(nickname.trim())) errs.nickname = '닉네임은 2~12자로 입력해 주세요'
    else if (nickStatus !== 'ok') errs.nickname = '닉네임 중복확인을 해주세요'
    if (!isValidPassword(password)) errs.password = '비밀번호는 영문+숫자 포함 8자 이상이어야 해요'
    if (password !== pwConfirm) errs.pwConfirm = '비밀번호가 일치하지 않아요'
    if (!isValidPhone(phone)) errs.phone = '올바른 휴대폰번호를 입력해 주세요 (예: 01012345678)'
    if (!isValidBirthdate(birthdate)) errs.birthdate = '생년월일을 입력해 주세요'

    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      await signUp({ email, password, nickname: nickname.trim(), phone: phone.replace(/-/g, ''), birthdate })
      showToast('가입이 완료되었어요!', 'success')
      setTimeout(() => navigate('/main'), 800)
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string }
      if (e.code === 'auth/email-already-in-use') {
        setErrors(v => ({ ...v, email: '이미 사용 중인 이메일이예요' }))
      } else {
        showToast(e.message || '가입에 실패했어요', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>회원가입</h1>
          <p>나만의 일기장에 오신 걸 환영해요</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* 이메일 */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">이메일 (아이디)</label>
            <input
              className={`form-input${errors.email ? ' input-error' : ''}`}
              type="email" id="email" placeholder="이메일을 입력해 주세요"
              autoComplete="email" value={form.email} onChange={set('email')}
            />
            {errors.email && <p className="err-msg">{errors.email}</p>}
          </div>

          {/* 닉네임 */}
          <div className="form-group">
            <label className="form-label" htmlFor="nickname">닉네임</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className={`form-input${errors.nickname ? ' input-error' : ''}`}
                type="text" id="nickname" placeholder="2~12자로 입력해 주세요"
                value={form.nickname}
                onChange={set('nickname')}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className={`btn btn-sm${nickStatus === 'ok' ? ' btn-secondary' : ' btn-outline'}`}
                onClick={handleNickCheck}
                disabled={nickChecking}
                style={{ whiteSpace: 'nowrap' }}
              >
                {nickChecking ? '확인 중...' : nickStatus === 'ok' ? '확인완료' : '중복확인'}
              </button>
            </div>
            {errors.nickname && <p className="err-msg" style={{ color: '#ef4444' }}>{errors.nickname}</p>}
            {!errors.nickname && nickStatus === 'ok' && (
              <p className="err-msg" style={{ color: '#16a34a' }}>사용 가능한 닉네임이예요</p>
            )}
          </div>

          {/* 비밀번호 */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">비밀번호</label>
            <input
              className={`form-input${errors.password ? ' input-error' : ''}`}
              type="password" id="password" placeholder="영문+숫자 포함 8자 이상으로 입력해 주세요"
              autoComplete="new-password" value={form.password} onChange={set('password')}
            />
            {errors.password && <p className="err-msg">{errors.password}</p>}
          </div>

          {/* 비밀번호 확인 */}
          <div className="form-group">
            <label className="form-label" htmlFor="pwConfirm">비밀번호 확인</label>
            <input
              className={`form-input${errors.pwConfirm ? ' input-error' : ''}`}
              type="password" id="pwConfirm" placeholder="비밀번호를 다시 입력해 주세요"
              autoComplete="new-password" value={form.pwConfirm} onChange={set('pwConfirm')}
            />
            {errors.pwConfirm && <p className="err-msg">{errors.pwConfirm}</p>}
          </div>

          {/* 휴대폰 */}
          <div className="form-group">
            <label className="form-label" htmlFor="phone">휴대폰번호</label>
            <input
              className={`form-input${errors.phone ? ' input-error' : ''}`}
              type="tel" id="phone" placeholder="-없이 입력해 주세요"
              value={form.phone} onChange={set('phone')}
            />
            {errors.phone && <p className="err-msg">{errors.phone}</p>}
          </div>

          {/* 생년월일 */}
          <div className="form-group">
            <label className="form-label" htmlFor="birthdate">생년월일</label>
            <input
              className={`form-input${errors.birthdate ? ' input-error' : ''}`}
              type="date" id="birthdate"
              value={form.birthdate} onChange={set('birthdate')}
            />
            {errors.birthdate && <p className="err-msg">{errors.birthdate}</p>}
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
            {loading ? <><span className="spinner" /> 가입 중...</> : '가입하기'}
          </button>

          <p className="text-center text-sm text-muted">
            이미 계정이 있으신가요?{' '}
            <Link to="/" className="text-pink font-medium" style={{ textDecoration: 'none' }}>
              로그인하기
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

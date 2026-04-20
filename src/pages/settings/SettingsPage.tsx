import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteAccount } from '../../services/authService'
import BottomNav from '../../components/BottomNav'

type FontScale = 'sm' | 'md' | 'lg'
type Theme = 'light' | 'dark'
type ColorTheme = 'pink' | 'blue' | 'green' | 'yellow' | 'purple'
type DefaultVisibility = 'private' | 'friends' | 'us'
type DeleteStep = 'confirm' | 'password'

const VISIBILITY_OPTIONS: { value: DefaultVisibility; label: string; desc: string }[] = [
  { value: 'private', label: '나만보기',   desc: '나만 볼 수 있어요' },
  { value: 'friends', label: '친구랑보기', desc: '친구 모두가 볼 수 있어요' },
  { value: 'us',      label: '우리만보기', desc: '특정 친구 1명만 볼 수 있어요' },
]

const FONT_OPTIONS: { value: FontScale; label: string; previewSize: string }[] = [
  { value: 'sm', label: '작게', previewSize: '1.1rem' },
  { value: 'md', label: '보통', previewSize: '1.4rem' },
  { value: 'lg', label: '크게', previewSize: '1.75rem' },
]

const THEME_OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: '라이트', icon: '☀️' },
  { value: 'dark',  label: '다크',   icon: '🌙' },
]

const COLOR_OPTIONS: { value: ColorTheme; label: string; colors: [string, string, string] }[] = [
  { value: 'pink',   label: '핑크',  colors: ['#F29199', '#F2BDC1', '#CEF2E8'] },
  { value: 'blue',   label: '블루',  colors: ['#7DAFFF', '#BFD9FF', '#FFE2BD'] },
  { value: 'green',  label: '그린',  colors: ['#7ED9B5', '#BFF2DE', '#7FC7BD'] },
  { value: 'yellow', label: '옐로우', colors: ['#FFD97D', '#FFF0B3', '#AAF683'] },
  { value: 'purple', label: '퍼플',  colors: ['#B39DDB', '#D6C8F2', '#F7CAC9'] },
]

function applyFontScale(scale: FontScale) {
  document.documentElement.setAttribute('data-font', scale)
  localStorage.setItem('fontScale', scale)
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

function applyColorTheme(color: ColorTheme) {
  document.documentElement.setAttribute('data-color', color)
  localStorage.setItem('colorTheme', color)
}

export default function SettingsPage() {
  const navigate = useNavigate()

  const [fontScale, setFontScale] = useState<FontScale>(
    (localStorage.getItem('fontScale') as FontScale) || 'md'
  )
  const [theme, setTheme] = useState<Theme>(
    (localStorage.getItem('theme') as Theme) || 'light'
  )
  const [colorTheme, setColorTheme] = useState<ColorTheme>(
    (localStorage.getItem('colorTheme') as ColorTheme) || 'pink'
  )
  const [defaultVisibility, setDefaultVisibility] = useState<DefaultVisibility>(
    (localStorage.getItem('defaultVisibility') as DefaultVisibility) || 'private'
  )

  // 계정 삭제 모달
  const [deleteStep, setDeleteStep] = useState<DeleteStep | null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  function handleFontChange(scale: FontScale) {
    setFontScale(scale)
    applyFontScale(scale)
  }

  function handleThemeChange(t: Theme) {
    setTheme(t)
    applyTheme(t)
  }

  function handleColorThemeChange(c: ColorTheme) {
    setColorTheme(c)
    applyColorTheme(c)
  }

  function handleDefaultVisibilityChange(v: DefaultVisibility) {
    setDefaultVisibility(v)
    localStorage.setItem('defaultVisibility', v)
  }

  function openDeleteModal() {
    setDeleteStep('confirm')
    setDeletePassword('')
    setDeleteError('')
  }

  function closeDeleteModal() {
    setDeleteStep(null)
    setDeletePassword('')
    setDeleteError('')
  }

  async function handleDeleteConfirm() {
    if (!deletePassword.trim()) {
      setDeleteError('비밀번호를 입력해 주세요')
      return
    }
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteAccount(deletePassword)
      localStorage.removeItem('theme')
      localStorage.removeItem('fontScale')
      localStorage.removeItem('colorTheme')
      localStorage.removeItem('defaultVisibility')
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setDeleteError('비밀번호가 올바르지 않아요')
      } else {
        setDeleteError((err as Error).message || '계정 삭제에 실패했어요')
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <button className="btn-icon" onClick={() => navigate(-1)}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="page-title">설정</span>
        <div style={{ width: '2.25rem' }} />
      </header>

      <main className="main-content" style={{ padding: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* 테마 */}
        <div className="setting-section">
          <h3 className="setting-title">테마</h3>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {THEME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`theme-btn${theme === opt.value ? ' selected' : ''}`}
                onClick={() => handleThemeChange(opt.value)}
              >
                <span className="theme-btn-icon">{opt.icon}</span>
                <span className="theme-btn-label">{opt.label}</span>
              </button>
            ))}
          </div>
          <p className="text-sm" style={{ color: 'var(--gray-400)', marginTop: '0.25rem' }}>
            선택한 테마는 앱 전체에 바로 적용돼요
          </p>
        </div>

        {/* 색상 테마 */}
        <div className="setting-section">
          <h3 className="setting-title">색상 테마</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {COLOR_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`color-theme-btn${colorTheme === opt.value ? ' selected' : ''}`}
                onClick={() => handleColorThemeChange(opt.value)}
              >
                <span className="color-theme-swatch">
                  {/* 3분할 원형 스와치 */}
                  <svg viewBox="0 0 36 36" width="36" height="36">
                    <path d="M18 18 L18 2 A16 16 0 0 1 31.86 26 Z" fill={opt.colors[0]} />
                    <path d="M18 18 L31.86 26 A16 16 0 0 1 4.14 26 Z" fill={opt.colors[1]} />
                    <path d="M18 18 L4.14 26 A16 16 0 0 1 18 2 Z" fill={opt.colors[2]} />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="var(--gray-200)" strokeWidth="1" />
                  </svg>
                </span>
                <span className="color-theme-label">{opt.label}</span>
              </button>
            ))}
          </div>
          <p className="text-sm" style={{ color: 'var(--gray-400)', marginTop: '0.25rem' }}>
            선택한 색상은 앱 전체에 바로 적용돼요
          </p>
        </div>

        {/* 기본 공개 범위 */}
        <div className="setting-section">
          <h3 className="setting-title">기본 공개 범위</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {VISIBILITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`visibility-default-btn${defaultVisibility === opt.value ? ' selected' : ''}`}
                onClick={() => handleDefaultVisibilityChange(opt.value)}
              >
                <span className="visibility-default-label">{opt.label}</span>
                <span className="visibility-default-desc">{opt.desc}</span>
              </button>
            ))}
          </div>
          <p className="text-sm" style={{ color: 'var(--gray-400)', marginTop: '0.25rem' }}>
            기록을 새로 쓸 때 기본으로 선택돼요
          </p>
        </div>

        {/* 글자 크기 */}
        <div className="setting-section">
          <h3 className="setting-title">글자 크기</h3>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {FONT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`font-scale-btn${fontScale === opt.value ? ' selected' : ''}`}
                onClick={() => handleFontChange(opt.value)}
              >
                <span style={{ fontSize: opt.previewSize, lineHeight: 1, fontFamily: 'var(--font-title)' }}>가</span>
                <span className="font-scale-label">{opt.label}</span>
              </button>
            ))}
          </div>
          <p className="text-sm" style={{ color: 'var(--gray-400)', marginTop: '0.25rem' }}>
            선택한 크기는 앱 전체에 바로 적용돼요
          </p>
        </div>

        {/* 계정 */}
        <div className="setting-section">
          <h3 className="setting-title">계정</h3>
          <p className="text-sm" style={{ color: 'var(--gray-400)', lineHeight: 1.6 }}>
            계정을 삭제하면 모든 기록, 사진, 친구 관계가 영구 삭제되며 복구할 수 없어요
          </p>
          <button
            className="btn btn-danger btn-full"
            onClick={openDeleteModal}
          >
            계정 삭제
          </button>
        </div>

      </main>

      <BottomNav />

      {/* 계정 삭제 모달 — 1단계: 경고 */}
      {deleteStep === 'confirm' && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#ef4444" style={{ width: '2.5rem', height: '2.5rem' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="modal-title">계정을 삭제하시겠어요?</p>
            </div>
            <p className="modal-desc" style={{ textAlign: 'center', lineHeight: 1.6 }}>
              모든 기록, 사진, 댓글, 친구 관계가<br />
              <strong style={{ color: '#ef4444' }}>영구 삭제</strong>되며 복구할 수 없어요
            </p>
            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={closeDeleteModal}>취소</button>
              <button className="btn btn-danger" onClick={() => setDeleteStep('password')}>계속하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 계정 삭제 모달 — 2단계: 비밀번호 확인 */}
      {deleteStep === 'password' && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <p className="modal-title">비밀번호 확인</p>
            <p className="modal-desc" style={{ marginBottom: '1rem' }}>
              본인 확인을 위해 현재 비밀번호를 입력해 주세요
            </p>
            <div className="form-group">
              <input
                className={`form-input${deleteError ? ' input-error' : ''}`}
                type="password"
                placeholder="현재 비밀번호"
                value={deletePassword}
                onChange={e => { setDeletePassword(e.target.value); setDeleteError('') }}
                onKeyDown={e => e.key === 'Enter' && handleDeleteConfirm()}
                autoFocus
              />
              {deleteError && <p className="err-msg">{deleteError}</p>}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={closeDeleteModal} disabled={deleting}>취소</button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm} disabled={deleting}>
                {deleting ? <><span className="spinner" /> 삭제 중...</> : '삭제하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

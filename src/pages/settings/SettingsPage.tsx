import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'

type FontScale = 'sm' | 'md' | 'lg'

const FONT_OPTIONS: { value: FontScale; label: string; previewSize: string }[] = [
  { value: 'sm', label: '작게', previewSize: '1.1rem' },
  { value: 'md', label: '보통', previewSize: '1.4rem' },
  { value: 'lg', label: '크게', previewSize: '1.75rem' },
]

function applyFontScale(scale: FontScale) {
  document.documentElement.setAttribute('data-font', scale)
  localStorage.setItem('fontScale', scale)
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const [fontScale, setFontScale] = useState<FontScale>(
    (localStorage.getItem('fontScale') as FontScale) || 'md'
  )

  function handleFontChange(scale: FontScale) {
    setFontScale(scale)
    applyFontScale(scale)
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

      <main className="main-content" style={{ padding: '1.5rem 0' }}>
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
      </main>

      <BottomNav />
    </div>
  )
}

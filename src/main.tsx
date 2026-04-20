import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../assets/index.css'
import App from './App'

// 저장된 폰트 크기 즉시 적용 (렌더링 전)
const savedFont = localStorage.getItem('fontScale') || 'md'
document.documentElement.setAttribute('data-font', savedFont)

// 저장된 테마 즉시 적용 (렌더링 전 — 깜빡임 방지)
const savedTheme = localStorage.getItem('theme') || 'light'
document.documentElement.setAttribute('data-theme', savedTheme)

// 저장된 색상 테마 즉시 적용
const savedColorTheme = localStorage.getItem('colorTheme') || 'pink'
document.documentElement.setAttribute('data-color', savedColorTheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

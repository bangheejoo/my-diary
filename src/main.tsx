import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../assets/index.css'
import App from './App'

// 저장된 폰트 크기 즉시 적용 (렌더링 전)
const savedFont = localStorage.getItem('fontScale') || 'md'
document.documentElement.setAttribute('data-font', savedFont)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

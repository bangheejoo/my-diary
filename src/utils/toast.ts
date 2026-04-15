type ToastType = 'default' | 'success' | 'error'

export function showToast(msg: string, type: ToastType = 'default') {
  let container = document.getElementById('toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    document.body.appendChild(container)
  }

  const toast = document.createElement('div')
  toast.className = `toast${type === 'success' ? ' toast-success' : type === 'error' ? ' toast-error' : ''}`
  toast.textContent = msg
  container.appendChild(toast)

  setTimeout(() => toast.remove(), 2800)
}

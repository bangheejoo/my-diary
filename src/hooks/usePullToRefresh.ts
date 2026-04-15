import { useRef, useEffect, useCallback } from 'react'

const THRESHOLD = 70  // 새로고침 발동 최소 당김 거리 (px)
const MAX_PULL  = 100 // 최대 당김 거리 (px)

interface Options {
  onRefresh: () => Promise<void>
  scrollRef: React.RefObject<HTMLElement | null>
}

export function usePullToRefresh({ onRefresh, scrollRef }: Options) {
  const indicatorRef = useRef<HTMLDivElement | null>(null)
  const startYRef    = useRef(0)
  const pullingRef   = useRef(false)
  const refreshingRef = useRef(false)

  const setIndicator = useCallback((pull: number, refreshing: boolean) => {
    const el = indicatorRef.current
    if (!el) return
    if (refreshing) {
      el.style.height = `${THRESHOLD}px`
      el.style.opacity = '1'
      el.querySelector<HTMLElement>('.ptr-spinner')!.style.display = 'block'
      el.querySelector<HTMLElement>('.ptr-arrow')!.style.display = 'none'
    } else if (pull <= 0) {
      el.style.height = '0'
      el.style.opacity = '0'
    } else {
      const ratio = Math.min(pull / THRESHOLD, 1)
      el.style.height = `${pull}px`
      el.style.opacity = `${ratio}`
      const arrow = el.querySelector<HTMLElement>('.ptr-arrow')!
      const spinner = el.querySelector<HTMLElement>('.ptr-spinner')!
      spinner.style.display = 'none'
      arrow.style.display = 'block'
      arrow.style.transform = `rotate(${ratio * 180}deg)`
    }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop > 0) return
      startYRef.current = e.touches[0].clientY
      pullingRef.current = true
    }

    function onTouchMove(e: TouchEvent) {
      if (!pullingRef.current || refreshingRef.current) return
      const delta = e.touches[0].clientY - startYRef.current
      if (delta <= 0) { setIndicator(0, false); return }
      // 스크롤 방지 (위로 당길 때만)
      if (el!.scrollTop === 0 && delta > 0) e.preventDefault()
      const pull = Math.min(delta, MAX_PULL)
      setIndicator(pull, false)
    }

    async function onTouchEnd() {
      if (!pullingRef.current) return
      pullingRef.current = false
      const indicatorHeight = indicatorRef.current
        ? parseInt(indicatorRef.current.style.height || '0')
        : 0
      if (indicatorHeight >= THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true
        setIndicator(0, true)
        try {
          await onRefresh()
        } finally {
          refreshingRef.current = false
          setIndicator(0, false)
        }
      } else {
        setIndicator(0, false)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })
    el.addEventListener('touchend',   onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onTouchEnd)
    }
  }, [onRefresh, scrollRef, setIndicator])

  return indicatorRef
}

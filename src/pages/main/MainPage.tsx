import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMyPostsPaged, getMyPostsByDate } from '../../services/postService'
import type { Post } from '../../services/postService'
import type { DocumentSnapshot } from 'firebase/firestore'
import { getMyNotifications } from '../../services/friendService'
import BottomNav from '../../components/BottomNav'
import PostCard from '../../components/PostCard'
import CalendarView from '../../components/CalendarView'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'

type Tab = 'list' | 'calendar'

function SkeletonCard() {
  return (
    <div className="post-card skeleton-card">
      <div className="post-card-header">
        <div className="skeleton" style={{ width: '6rem', height: '1rem', borderRadius: '0.375rem' }} />
        <div className="skeleton" style={{ width: '4rem', height: '1.25rem', borderRadius: '1rem' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
        <div className="skeleton" style={{ width: '100%', height: '0.875rem', borderRadius: '0.375rem' }} />
        <div className="skeleton" style={{ width: '85%', height: '0.875rem', borderRadius: '0.375rem' }} />
        <div className="skeleton" style={{ width: '60%', height: '0.875rem', borderRadius: '0.375rem' }} />
      </div>
    </div>
  )
}

export default function MainPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [tab, setTab] = useState<Tab>('list')

  // 무한스크롤 상태
  const [posts, setPosts] = useState<Post[]>([])
  const [cursor, setCursor] = useState<DocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // 캘린더용 전체 게시글 (날짜 표시)
  const [allPosts, setAllPosts] = useState<Post[]>([])

  const [unreadNotifCount, setUnreadNotifCount] = useState(0)

  const scrollRef = useRef<HTMLElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadInitial = useCallback(async () => {
    if (!user) return
    setInitialLoading(true)
    setPosts([])
    setCursor(null)
    setHasMore(true)
    try {
      const page = await getMyPostsPaged(user.uid, null)
      setPosts(page.posts)
      setCursor(page.lastDoc)
      setHasMore(page.hasMore)
    } finally {
      setInitialLoading(false)
    }
  }, [user])

  const loadMore = useCallback(async () => {
    if (!user || !hasMore || loadingMore || initialLoading) return
    setLoadingMore(true)
    try {
      const page = await getMyPostsPaged(user.uid, cursor)
      setPosts(prev => [...prev, ...page.posts])
      setCursor(page.lastDoc)
      setHasMore(page.hasMore)
    } finally {
      setLoadingMore(false)
    }
  }, [user, hasMore, loadingMore, initialLoading, cursor])

  // 초기 로드
  useEffect(() => { loadInitial() }, [loadInitial])

  // 알림 미읽음 수 - location.key로 매 화면 진입마다 갱신
  useEffect(() => {
    if (!user) return
    getMyNotifications(user.uid)
      .then(ns => setUnreadNotifCount(ns.filter(n => !n.read).length))
      .catch(() => {})
  }, [user, location.key])

  // 캘린더용 전체 포스트 로드
  useEffect(() => {
    if (!user) return
    getMyPostsPaged(user.uid, null).then(page => setAllPosts(page.posts)).catch(() => {})
  }, [user])

  // IntersectionObserver - sentinel이 보이면 loadMore
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  const indicatorRef = usePullToRefresh({
    onRefresh: loadInitial,
    scrollRef,
  })

  async function handleDateSelect(dateStr: string) {
    if (!user) return []
    return getMyPostsByDate(user.uid, dateStr)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <span className="logo">나만의 일기장</span>
        <div className="header-actions">
          <button
            className="btn-icon"
            title="알림함"
            style={{ position: 'relative' }}
            onClick={() => navigate('/mypage', { state: { tab: 'notifications' } })}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unreadNotifCount > 0 && (
              <span className="notif-badge">{unreadNotifCount > 99 ? '99+' : unreadNotifCount}</span>
            )}
          </button>
        </div>
      </header>

      <div className="tab-bar">
        <button className={`tab-btn${tab === 'list' ? ' active' : ''}`} onClick={() => setTab('list')}>
          <span>최근 하루</span>
        </button>
        <button className={`tab-btn${tab === 'calendar' ? ' active' : ''}`} onClick={() => setTab('calendar')}>
          <span>달력 보기</span>
        </button>
      </div>

      <main className="main-content" ref={scrollRef}>
        {/* pull-to-refresh 인디케이터 */}
        <div className="ptr-indicator" ref={indicatorRef}>
          <div className="ptr-arrow">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div className="ptr-spinner"><div className="spinner" /></div>
        </div>

        {tab === 'list' && (
          <>
            {initialLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : posts.length === 0 ? (
              <div className="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
                <p>아직 기록이 없어요<br />나만의 하루를 기록해 보세요</p>
              </div>
            ) : (
              <>
                {posts.map(p => (
                  <PostCard key={p.id} post={p} currentUserUid={user?.uid} />
                ))}

                {/* 무한스크롤 sentinel */}
                <div ref={sentinelRef} style={{ height: '1px' }} />

                {loadingMore && (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                )}

                {!hasMore && posts.length > 0 && (
                  <p className="text-center text-sm text-muted" style={{ padding: '1.5rem 0' }}>
                    모든 기록을 불러왔어요
                  </p>
                )}
              </>
            )}
          </>
        )}

        {tab === 'calendar' && (
          <CalendarView posts={allPosts} onDateSelect={handleDateSelect} />
        )}
      </main>

      <button className="fab" title="기록 남기기" onClick={() => navigate('/write')}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      <BottomNav />
    </div>
  )
}

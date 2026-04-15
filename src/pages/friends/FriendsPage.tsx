import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  getMyFriends, sendFriendRequest, getFriendshipStatus,
} from '../../services/friendService'
import type { Friendship } from '../../services/friendService'
import { getUserProfile, searchUser } from '../../services/authService'
import type { UserProfile } from '../../services/authService'
import {
  getFriendsPosts, getFriendPostsByUid, getFriendPostsByDate,
} from '../../services/postService'
import type { Post } from '../../services/postService'
import { showToast } from '../../utils/toast'
import { toKoreanDate, today, firstDayOfMonth, lastDateOfMonth } from '../../utils/formatDate'
import BottomNav from '../../components/BottomNav'
import ReactionBar from '../../components/ReactionBar'
import CommentSection from '../../components/CommentSection'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

interface FriendWithProfile extends Friendship {
  nickname: string
}

type Tab = 'feed' | 'calendar'

export default function FriendsPage() {
  const { user } = useAuth()
  const todayStr = today()
  const now = new Date()

  const [tab, setTab] = useState<Tab>('feed')
  const [friends, setFriends] = useState<FriendWithProfile[]>([])
  const [selectedUid, setSelectedUid] = useState<string>('all')
  const [feedPosts, setFeedPosts] = useState<Post[]>([])
  const [feedLoading, setFeedLoading] = useState(true)

  // 캘린더 상태
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [calPostDates, setCalPostDates] = useState<Set<string>>(new Set())
  const [calSelected, setCalSelected] = useState<string | null>(null)
  const [calDatePosts, setCalDatePosts] = useState<Post[]>([])
  const [calDateLoading, setCalDateLoading] = useState(false)

  // 친구 추가 모달
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ user: UserProfile; status: ReturnType<typeof getFriendshipStatus> extends Promise<infer T> ? T : never }[]>([])
  const [searching, setSearching] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const friendUids = friends.map(f => f.friendUid)

  useEffect(() => {
    loadFriends()
  }, [user])

  useEffect(() => {
    if (tab === 'feed') loadFeed()
    else loadCalendarDates()
  }, [tab, selectedUid, friends])

  async function loadFriends() {
    if (!user) return
    try {
      const raw = await getMyFriends(user.uid)
      const profiles = await Promise.all(raw.map(f => getUserProfile(f.friendUid)))
      setFriends(raw.map((f, i) => ({ ...f, nickname: profiles[i]?.nickname || '알 수 없음' })))
    } catch {
      showToast('친구 목록을 불러오지 못했어요', 'error')
    }
  }

  async function loadFeed() {
    if (!user) return
    setFeedLoading(true)
    try {
      const uids = selectedUid === 'all' ? friendUids : [selectedUid]
      const posts = selectedUid === 'all'
        ? await getFriendsPosts(uids)
        : await getFriendPostsByUid(selectedUid)
      setFeedPosts(posts)
    } catch {
      setFeedPosts([])
    } finally {
      setFeedLoading(false)
    }
  }

  async function loadCalendarDates() {
    if (!friendUids.length) { setCalPostDates(new Set()); return }
    const uids = selectedUid === 'all' ? friendUids : [selectedUid]
    const posts = await getFriendsPosts(uids)
    setCalPostDates(new Set(posts.map(p => p.recordDate)))
  }

  async function handleCalDateClick(dateStr: string) {
    if (dateStr > todayStr) return
    setCalSelected(dateStr)
    setCalDateLoading(true)
    const uids = selectedUid === 'all' ? friendUids : [selectedUid]
    const posts = await getFriendPostsByDate(uids, dateStr)
    setCalDatePosts(posts)
    setCalDateLoading(false)
  }

  function prevCalMonth() {
    setCalMonth(m => { if (m === 0) { setCalYear(y => y - 1); return 11 } return m - 1 })
    setCalSelected(null); setCalDatePosts([])
  }
  function nextCalMonth() {
    if (calYear > now.getFullYear() || (calYear === now.getFullYear() && calMonth >= now.getMonth())) return
    setCalMonth(m => { if (m === 11) { setCalYear(y => y + 1); return 0 } return m + 1 })
    setCalSelected(null); setCalDatePosts([])
  }

  async function handleSearch() {
    const q = searchQuery.trim()
    if (!q || !user) return
    setSearching(true)
    setSearchResults([])
    try {
      const users = await searchUser(q)
      const filtered = users.filter(u => u.uid !== user.uid)
      const statuses = await Promise.all(filtered.map(u => getFriendshipStatus(user.uid, u.uid)))
      setSearchResults(filtered.map((u, i) => ({ user: u, status: statuses[i] as never })))
    } catch {
      showToast('검색 중 오류가 발생했어요', 'error')
    } finally {
      setSearching(false)
    }
  }

  async function handleRequest(toUid: string) {
    if (!user) return
    try {
      await sendFriendRequest(user.uid, toUid)
      showToast('친구 요청을 보냈어요', 'success')
      setSearchResults(prev => prev.map(r =>
        r.user.uid === toUid ? { ...r, status: { status: 'pending', requesterId: user.uid } as never } : r
      ))
    } catch (err: unknown) {
      showToast((err as Error).message || '요청에 실패했어요', 'error')
    }
  }

  // 캘린더 렌더
  const firstDay = firstDayOfMonth(calYear, calMonth)
  const lastDate = lastDateOfMonth(calYear, calMonth)

  return (
    <div className="app-container">
      <header className="app-header">
        <span className="logo">친구의 하루</span>
        <button className="btn-icon" title="친구추가" onClick={() => { setShowAddModal(true); setTimeout(() => searchInputRef.current?.focus(), 100) }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
          </svg>
        </button>
      </header>

      {/* 친구 필터 */}
      <div className="friend-filter">
        {[{ uid: 'all', nickname: '전체 친구' }, ...friends.map(f => ({ uid: f.friendUid, nickname: f.nickname }))].map(f => (
          <button
            key={f.uid}
            className={`badge${selectedUid === f.uid ? ' badge-pink' : ' badge-gray'}`}
            style={{ cursor: 'pointer', padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
            onClick={() => setSelectedUid(f.uid)}
          >
            {f.nickname}
          </button>
        ))}
      </div>

      <div className="tab-bar">
        <button className={`tab-btn${tab === 'feed' ? ' active' : ''}`} onClick={() => setTab('feed')}>
          <span>최근 하루</span>
        </button>
        <button className={`tab-btn${tab === 'calendar' ? ' active' : ''}`} onClick={() => setTab('calendar')}>
          <span>달력 보기</span>
        </button>
      </div>

      <main className="main-content">
        {tab === 'feed' && (
          feedLoading ? <div className="loading-screen"><div className="spinner" /></div> :
          !friendUids.length ? (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <p>친구가 되면 친구의 기록을 볼 수 있어요</p>
            </div>
          ) : feedPosts.length === 0 ? (
            <div className="empty-state"><p>친구의 기록이 없어요</p></div>
          ) : (
            feedPosts.map(p => {
              const friend = friends.find(f => f.friendUid === p.uid)
              const name = friend?.nickname || '알 수 없음'
              return (
                <div key={p.id} className="post-card">
                  <div className="post-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="user-avatar" style={{ width: '1.75rem', height: '1.75rem', fontSize: '0.75rem' }}>{name[0]}</div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{name}</span>
                    </div>
                    <span className="post-date">{toKoreanDate(p.recordDate)}</span>
                  </div>
                  <p className="post-content">{p.content}</p>
                  {p.imageUrl && <div className="post-image"><img src={p.imageUrl} alt="기록 이미지" loading="lazy" /></div>}
                  {user && (
                    <>
                      <ReactionBar postId={p.id} currentUserUid={user.uid} postOwnerUid={p.uid} />
                      <CommentSection postId={p.id} postUid={p.uid} currentUserUid={user.uid} />
                    </>
                  )}
                </div>
              )
            })
          )
        )}

        {tab === 'calendar' && (
          <>
            <div className="calendar-container">
              <div className="calendar-header">
                <button className="btn-icon" onClick={prevCalMonth}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <span className="calendar-title">{calYear}년 {calMonth + 1}월</span>
                <button className="btn-icon" onClick={nextCalMonth}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
              <div className="calendar-grid">
                {DAY_NAMES.map(n => <div key={n} className="calendar-day-name">{n}</div>)}
                {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} className="calendar-day empty" />)}
                {Array.from({ length: lastDate }, (_, i) => {
                  const d = i + 1
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                  const isFuture = dateStr > todayStr
                  let cls = 'calendar-day'
                  if (dateStr === todayStr) cls += ' today'
                  if (dateStr === calSelected) cls += ' selected'
                  if (calPostDates.has(dateStr)) cls += ' has-post'
                  if (isFuture) cls += ' empty'
                  return (
                    <div key={dateStr} className={cls} role={isFuture ? undefined : 'button'}
                      onClick={() => !isFuture && handleCalDateClick(dateStr)}>
                      {d}
                    </div>
                  )
                })}
              </div>
            </div>
            {calSelected && (
              <div>
                <div className="section-header">{toKoreanDate(calSelected)}의 친구 기록</div>
                {calDateLoading ? (
                  <div className="loading-screen" style={{ minHeight: '6rem' }}><div className="spinner" /></div>
                ) : calDatePosts.length === 0 ? (
                  <div className="empty-state"><p>이 날의 친구 기록이 없어요</p></div>
                ) : calDatePosts.map(p => {
                  const friend = friends.find(f => f.friendUid === p.uid)
                  const name = friend?.nickname || '알 수 없음'
                  return (
                    <div key={p.id} className="post-card">
                      <div className="post-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="user-avatar" style={{ width: '1.75rem', height: '1.75rem', fontSize: '0.75rem' }}>{name[0]}</div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{name}</span>
                        </div>
                        <span className="post-date">{toKoreanDate(p.recordDate)}</span>
                      </div>
                      <p className="post-content">{p.content}</p>
                      {p.imageUrl && <div className="post-image"><img src={p.imageUrl} alt="기록 이미지" loading="lazy" /></div>}
                      {user && (
                        <>
                          <ReactionBar postId={p.id} currentUserUid={user.uid} postOwnerUid={p.uid} />
                          <CommentSection postId={p.id} postUid={p.uid} currentUserUid={user.uid} />
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />

      {/* 친구 추가 모달 */}
      {showAddModal && (
        <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '4rem' }} onClick={() => { setShowAddModal(false); setSearchQuery(''); setSearchResults([]) }}>
          <div className="modal" style={{ maxWidth: '28rem', maxHeight: '75dvh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <p className="modal-title" style={{ margin: 0 }}>친구찾기</p>
              <button
                className="btn-icon"
                onClick={() => { setShowAddModal(false); setSearchQuery(''); setSearchResults([]) }}
                title="닫기"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                ref={searchInputRef}
                className="form-input"
                type="text"
                placeholder="이메일 또는 닉네임으로 검색해 보세요"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary btn-sm" onClick={handleSearch} disabled={searching}>
                {searching ? <span className="spinner" /> : '찾기'}
              </button>
            </div>
            <div>
              {searchResults.length === 0 && !searching && searchQuery && (
                <p className="text-center text-sm text-muted" style={{ padding: '1rem' }}>검색 결과가 없어요</p>
              )}
              {searchResults.map(({ user: u, status }) => {
                const s = status as { status?: string; requesterId?: string; id?: string } | null
                return (
                  <div key={u.uid} className="user-item" style={{padding: '0 0 1rem'}}>
                    <div className="user-avatar">{u.nickname[0]}</div>
                    <div className="user-info">
                      <p className="user-name">{u.nickname}</p>
                      <p className="user-email">{u.email}</p>
                    </div>
                    {!s ? (
                      <button className="btn btn-sm btn-danger" onClick={() => handleRequest(u.uid)}>요청</button>
                    ) : s.status === 'pending' ? (
                      s.requesterId === user?.uid
                        ? <button className="btn btn-sm btn-outline" disabled>요청됨</button>
                        : <button className="btn btn-sm btn-primary" onClick={() => handleRequest(u.uid)}>수락</button>
                    ) : (
                      <button className="btn btn-sm btn-outline" disabled>친구</button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

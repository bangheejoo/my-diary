import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  updateNickname, changePassword, isNicknameTaken, logOut, updateProfilePhoto,
} from '../../services/authService'
import {
  getMyFriends, getMyNotifications, acceptFriendRequest, rejectFriendRequest,
  removeFriend, markNotificationRead, markAllNotificationsRead, getFriendshipStatus,
} from '../../services/friendService'
import type { Notification, Friendship } from '../../services/friendService'
import { getUserProfile } from '../../services/authService'
import { getPost } from '../../services/postService'
import type { Post } from '../../services/postService'
import { uploadProfilePhoto } from '../../services/storageService'
import { isValidNickname, isValidPassword } from '../../utils/validation'
import { showToast } from '../../utils/toast'
import BottomNav from '../../components/BottomNav'
import PostCard from '../../components/PostCard'

type Tab = 'profile' | 'notifications' | 'friends'

function SkeletonNotifItem() {
  return (
    <div className="notif-item skeleton-card">
      <div className="skeleton" style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div className="skeleton" style={{ width: '80%', height: '0.875rem', borderRadius: '0.375rem' }} />
        <div className="skeleton" style={{ width: '35%', height: '0.75rem', borderRadius: '0.375rem' }} />
      </div>
    </div>
  )
}

interface FriendWithProfile extends Friendship {
  nickname: string
  email: string
}

function formatTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

export default function MyPage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const initialTab = (location.state as { tab?: Tab } | null)?.tab ?? 'profile'
  const [tab, setTab] = useState<Tab>(initialTab)

  // 프로필 사진
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoSaving, setPhotoSaving] = useState(false)

  // 닉네임 변경
  const [newNick, setNewNick] = useState('')
  const [nickStatus, setNickStatus] = useState<'idle' | 'ok' | 'fail'>('idle')
  const [nickChecking, setNickChecking] = useState(false)
  const [nickMsg, setNickMsg] = useState('')
  const [nickSaving, setNickSaving] = useState(false)

  // 비밀번호 변경
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [pwSaving, setPwSaving] = useState(false)

  // 알림
  const [notifs, setNotifs] = useState<(Notification & { fromNickname: string })[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingFriendshipIds, setPendingFriendshipIds] = useState<Set<string>>(new Set())

  // 친구 목록
  const [friends, setFriends] = useState<FriendWithProfile[]>([])
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [removingUid, setRemovingUid] = useState<string | null>(null)
  const [showRemoveModal, setShowRemoveModal] = useState<FriendWithProfile | null>(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)

  // 게시글 모달 (알림 클릭 시)
  const [postModal, setPostModal] = useState<Post | null>(null)
  const [postModalLoading, setPostModalLoading] = useState(false)

  useEffect(() => {
    loadUnreadCount()
  }, [user])

  useEffect(() => {
    if (tab === 'notifications') loadNotifications()
    if (tab === 'friends') loadFriends()
  }, [tab])

  async function loadUnreadCount() {
    if (!user) return
    try {
      const ns = await getMyNotifications(user.uid)
      setUnreadCount(ns.filter(n => !n.read).length)
    } catch { /* silent */ }
  }

  async function loadNotifications() {
    if (!user) return
    setNotifLoading(true)
    try {
      const ns = await getMyNotifications(user.uid)
      const profiles = await Promise.all(ns.map(n => getUserProfile(n.fromUid)))
      const mapped = ns.map((n, i) => ({ ...n, fromNickname: profiles[i]?.nickname || '알 수 없음' }))
      setNotifs(mapped)
      setUnreadCount(mapped.filter(n => !n.read).length)

      // 친구 요청 알림 중 실제로 pending 상태인 것만 수락/거절 버튼 표시
      const friendReqNotifs = ns.filter(n => n.type === 'friendRequest')
      const statuses = await Promise.all(
        friendReqNotifs.map(n => getFriendshipStatus(n.fromUid, user.uid).catch(() => null))
      )
      const pendingIds = new Set(
        friendReqNotifs
          .filter((_, i) => (statuses[i] as { status?: string } | null)?.status === 'pending')
          .map(n => n.friendshipId ?? '')
      )
      setPendingFriendshipIds(pendingIds)
    } catch {
      showToast('알림을 불러오지 못했어요', 'error')
    } finally {
      setNotifLoading(false)
    }
  }

  async function loadFriends() {
    if (!user) return
    setFriendsLoading(true)
    try {
      const raw = await getMyFriends(user.uid)
      const profiles = await Promise.all(raw.map(f => getUserProfile(f.friendUid)))
      setFriends(raw.map((f, i) => ({
        ...f,
        nickname: profiles[i]?.nickname || '알 수 없음',
        email: profiles[i]?.email || '',
      })))
    } catch {
      showToast('친구 목록을 불러오지 못했어요', 'error')
    } finally {
      setFriendsLoading(false)
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handlePhotoSave() {
    if (!photoFile || !user) return
    setPhotoSaving(true)
    try {
      const { url } = await uploadProfilePhoto(photoFile, user.uid)
      await updateProfilePhoto(user.uid, url)
      showToast('프로필 사진이 변경되었어요', 'success')
      if (photoPreview) URL.revokeObjectURL(photoPreview)
      setPhotoFile(null)
      setPhotoPreview(null)
      if (photoInputRef.current) photoInputRef.current.value = ''
      await refreshProfile()
    } catch (err: unknown) {
      showToast((err as Error).message || '사진 업로드에 실패했어요', 'error')
    } finally {
      setPhotoSaving(false)
    }
  }

  async function handleNickCheck() {
    const nick = newNick.trim()
    if (!isValidNickname(nick)) { setNickMsg('닉네임은 2~12자로 입력해 주세요'); setNickStatus('fail'); return }
    setNickChecking(true)
    try {
      const taken = await isNicknameTaken(nick, user!.uid)
      if (taken) { setNickStatus('fail'); setNickMsg('이미 사용 중인 닉네임이예요') }
      else { setNickStatus('ok'); setNickMsg('사용 가능한 닉네임이예요') }
    } catch { showToast('닉네임 확인 중 오류가 발생했어요', 'error') }
    finally { setNickChecking(false) }
  }

  async function handleNickSave() {
    if (!isValidNickname(newNick.trim())) { setNickMsg('닉네임은 2~12자로 입력해 주세요'); setNickStatus('fail'); return }
    if (nickStatus !== 'ok') { setNickMsg('닉네임 중복확인을 해주세요'); return }
    setNickSaving(true)
    try {
      await updateNickname(user!.uid, newNick.trim())
      showToast('닉네임이 변경되었어요', 'success')
      setNewNick(''); setNickStatus('idle'); setNickMsg('')
      refreshProfile()
    } catch (err: unknown) {
      setNickMsg((err as Error).message || '닉네임 변경에 실패했어요')
      setNickStatus('fail')
    } finally {
      setNickSaving(false)
    }
  }

  async function handlePwSave() {
    const errs: typeof pwErrors = {}
    if (!pwForm.current) errs.current = '현재 비밀번호를 입력해 주세요'
    if (!isValidPassword(pwForm.next)) errs.next = '영문+숫자 포함 8자 이상이어야 해요'
    if (pwForm.next !== pwForm.confirm) errs.confirm = '비밀번호가 일치하지 않아요'
    setPwErrors(errs)
    if (Object.keys(errs).length > 0) return

    setPwSaving(true)
    try {
      await changePassword(pwForm.current, pwForm.next)
      showToast('비밀번호가 변경되었어요', 'success')
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setPwErrors(v => ({ ...v, current: '현재 비밀번호가 올바르지 않아요' }))
      } else {
        showToast((err as Error).message || '비밀번호 변경에 실패했어요', 'error')
      }
    } finally {
      setPwSaving(false)
    }
  }

  async function handleMarkRead(notifId: string) {
    try {
      await markNotificationRead(notifId)
      setNotifs(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      showToast('읽음 처리에 실패했어요', 'error')
      console.error('markNotificationRead error:', err)
    }
  }

  async function handleMarkAllRead() {
    if (!user) return
    try {
      await markAllNotificationsRead(user.uid)
      setNotifs(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {
      showToast('전체 읽음 처리에 실패했어요', 'error')
    }
  }

  async function handleAccept(fid: string, fromUid: string) {
    try {
      await acceptFriendRequest(fid, fromUid)
      showToast('친구 요청을 수락했어요', 'success')
      setPendingFriendshipIds(prev => { const next = new Set(prev); next.delete(fid); return next })
    } catch (err: unknown) {
      showToast((err as Error).message || '수락에 실패했어요', 'error')
    }
  }

  async function handleReject(fid: string) {
    try {
      await rejectFriendRequest(fid, user!.uid)
      showToast('친구 요청을 거절했어요')
      setPendingFriendshipIds(prev => { const next = new Set(prev); next.delete(fid); return next })
    } catch {
      showToast('거절에 실패했어요', 'error')
    }
  }

  async function handleRemoveFriend(f: FriendWithProfile) {
    setRemovingUid(f.friendUid)
    try {
      await removeFriend(user!.uid, f.friendUid)
      showToast('친구가 삭제되었어요', 'success')
      setFriends(prev => prev.filter(fr => fr.friendUid !== f.friendUid))
    } catch {
      showToast('친구 삭제에 실패했어요', 'error')
    } finally {
      setRemovingUid(null)
      setShowRemoveModal(null)
    }
  }

  async function handleNotifClick(n: Notification & { fromNickname: string }) {
    if (!n.read) await handleMarkRead(n.id)
    const navigable = (n.type === 'comment' || n.type === 'mention' || n.type === 'reaction') && n.postId
    if (!navigable) return
    setPostModalLoading(true)
    setPostModal(null)
    try {
      const post = await getPost(n.postId!)
      if (!post) { showToast('게시글을 찾을 수 없어요', 'error'); return }
      setPostModal(post)
    } catch {
      showToast('게시글을 불러오지 못했어요', 'error')
    } finally {
      setPostModalLoading(false)
    }
  }

  async function handleLogout() {
    await logOut()
    navigate('/')
  }

  const displayName = profile?.nickname || '사용자'

  return (
    <div className="app-container">
      <header className="app-header">
        <span className="logo">내정보</span>
        <button className="btn-icon" onClick={() => navigate('/settings')} title="설정">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>
      </header>

      {/* 프로필 요약 */}
      <div className="profile-summary" style={{ alignItems: 'flex-start', gap: '1rem' }}>
        {/* 아바타 + 카메라 배지 */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            className="user-avatar"
            style={{ width: '4.5rem', height: '4.5rem', fontSize: '1.5rem', cursor: (profile?.photoUrl && !photoPreview) ? 'pointer' : undefined }}
            onClick={() => { if (profile?.photoUrl && !photoPreview) setShowPhotoModal(true) }}
          >
            {photoPreview
              ? <img src={photoPreview} alt="미리보기" />
              : profile?.photoUrl
                ? <img src={profile.photoUrl} alt="프로필" />
                : displayName[0]}
          </div>
          <button type="button" className="photo-edit-badge" onClick={() => photoInputRef.current?.click()} title="사진 변경">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
        </div>

        {/* 유저 정보 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <p className="font-bold" style={{ fontSize: '1.05rem' }}>{displayName}</p>
            <button className="btn btn-sm btn-outline" onClick={handleLogout} style={{ flexShrink: 0 }}>로그아웃</button>
          </div>
          <p className="text-muted text-sm" style={{ marginTop: '0.2rem' }}>{profile?.email || user?.email || ''}</p>
          {/* 사진 변경 시 저장/취소 */}
          {photoFile && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
              <button type="button" className="btn-icon-action btn-icon-confirm" onClick={handlePhotoSave} disabled={photoSaving} title="저장">
                {photoSaving
                  ? <span className="spinner" style={{ width: '1.1rem', height: '1.1rem' }} />
                  : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
              </button>
              <button type="button" className="btn-icon-action btn-icon-cancel" onClick={() => { if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoFile(null); setPhotoPreview(null); if (photoInputRef.current) photoInputRef.current.value = '' }} title="취소">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className="tab-bar">
        <button className={`tab-btn${tab === 'profile' ? ' active' : ''}`} onClick={() => setTab('profile')}>프로필</button>
        <button className={`tab-btn${tab === 'notifications' ? ' active' : ''}`} onClick={() => setTab('notifications')} style={{ position: 'relative' }}>
          알림함
          {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
        </button>
        <button className={`tab-btn${tab === 'friends' ? ' active' : ''}`} onClick={() => setTab('friends')}>친구관리</button>
      </div>

      <main className="main-content">
        {/* 프로필 탭 */}
        {tab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', margin: '2.5rem 0 2.5rem' }}>
            {/* 기본 정보 */}
            <div className="setting-section">
              <h3 className="setting-title">기본 정보</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--gray-500)' }}>이메일</span>
                  <span style={{ fontWeight: 500 }}>{profile?.email || user?.email || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--gray-500)' }}>생년월일</span>
                  <span style={{ fontWeight: 500 }}>{profile?.birthdate ? profile.birthdate.replace(/-/g, '.') : '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--gray-500)' }}>휴대폰</span>
                  <span style={{ fontWeight: 500 }}>{profile?.phone || '-'}</span>
                </div>
              </div>
            </div>

            {/* 닉네임 변경 */}
            <div className="setting-section">
              <h3 className="setting-title">닉네임 변경</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  className="form-input"
                  type="text"
                  placeholder="새 닉네임을 (2~12자) 입력해 주세요"
                  value={newNick}
                  onChange={e => { setNewNick(e.target.value); setNickStatus('idle'); setNickMsg('') }}
                  style={{ flex: 1 }}
                />
                <button className={`btn btn-sm${nickStatus === 'ok' ? ' btn-secondary' : ' btn-outline'}`}
                  onClick={handleNickCheck} disabled={nickChecking} style={{ whiteSpace: 'nowrap' }}>
                  {nickChecking ? '확인 중...' : nickStatus === 'ok' ? '확인완료' : '중복확인'}
                </button>
              </div>
              {nickMsg && <p className="err-msg" style={{ color: nickStatus === 'ok' ? '#16a34a' : '#ef4444' }}>{nickMsg}</p>}
              <button className="btn btn-primary btn-full" onClick={handleNickSave} disabled={nickSaving}>
                {nickSaving ? <><span className="spinner" /> 변경 중...</> : '변경하기'}
              </button>
            </div>

            {/* 비밀번호 변경 */}
            <div className="setting-section">
              <h3 className="setting-title">비밀번호 변경</h3>
              <div className="form-group">
                <input className={`form-input${pwErrors.current ? ' input-error' : ''}`} type="password"
                  placeholder="현재 비밀번호를 입력해 주세요" value={pwForm.current}
                  onChange={e => { setPwForm(v => ({ ...v, current: e.target.value })); setPwErrors(v => ({ ...v, current: undefined })) }} />
                {pwErrors.current && <p className="err-msg">{pwErrors.current}</p>}
              </div>
              <div className="form-group">
                <input className={`form-input${pwErrors.next ? ' input-error' : ''}`} type="password"
                  placeholder="새 비밀번호를 (영문+숫자 8자 이상) 입력해 주세요" value={pwForm.next}
                  onChange={e => { setPwForm(v => ({ ...v, next: e.target.value })); setPwErrors(v => ({ ...v, next: undefined })) }} />
                {pwErrors.next && <p className="err-msg">{pwErrors.next}</p>}
              </div>
              <div className="form-group">
                <input className={`form-input${pwErrors.confirm ? ' input-error' : ''}`} type="password"
                  placeholder="새 비밀번호를 다시 한번 입력해 주세요" value={pwForm.confirm}
                  onChange={e => { setPwForm(v => ({ ...v, confirm: e.target.value })); setPwErrors(v => ({ ...v, confirm: undefined })) }} />
                {pwErrors.confirm && <p className="err-msg">{pwErrors.confirm}</p>}
              </div>
              <button className="btn btn-primary btn-full" onClick={handlePwSave} disabled={pwSaving}>
                {pwSaving ? <><span className="spinner" /> 변경 중...</> : '변경하기'}
              </button>
            </div>
          </div>
        )}

        {/* 알림 탭 */}
        {tab === 'notifications' && (
          notifLoading ? (
            <>
              <SkeletonNotifItem />
              <SkeletonNotifItem />
              <SkeletonNotifItem />
              <SkeletonNotifItem />
              <SkeletonNotifItem />
            </>
          ) :
          notifs.length === 0 ? (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <p>알림이 없어요</p>
            </div>
          ) : (
            <>
              {unreadCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem 0 0.25rem' }}>
                  <button
                    className="btn btn-sm btn-outline"
                    style={{ fontSize: '0.78rem' }}
                    onClick={handleMarkAllRead}
                  >
                    전체 읽음
                  </button>
                </div>
              )}
              {notifs.map(n => {
                const ts = n.createdAt as { toDate?: () => Date } | null
                const timeText = ts?.toDate ? formatTime(ts.toDate()) : ''
                return (
                  <div
                    key={n.id}
                    className={`notif-item${!n.read ? ' unread' : ''}`}
                    style={{ cursor: (n.type === 'comment' || n.type === 'mention' || n.type === 'reaction') ? 'pointer' : (!n.read ? 'pointer' : undefined) }}
                    onClick={() => handleNotifClick(n)}
                  >
                    <div className="user-avatar" style={{ width: '2.25rem', height: '2.25rem', fontSize: '0.85rem', flexShrink: 0 }}>
                      {n.fromNickname[0]}
                    </div>
                    <div className="notif-item-content">
                      {n.type === 'friendRequest' ? (
                        <>
                          <p className="notif-item-text"><strong>{n.fromNickname}</strong>님이 친구 요청을 보냈어요</p>
                          <p className="notif-item-time">{timeText}</p>
                          {n.friendshipId && pendingFriendshipIds.has(n.friendshipId) && (
                            <div className="notif-actions" onClick={e => e.stopPropagation()}>
                              <button className="btn btn-sm btn-primary" onClick={() => handleAccept(n.friendshipId!, n.fromUid)}>수락</button>
                              <button className="btn btn-sm btn-outline" onClick={() => handleReject(n.friendshipId!)}>거절</button>
                            </div>
                          )}
                        </>
                      ) : n.type === 'friendAccepted' ? (
                        <>
                          <p className="notif-item-text"><strong>{n.fromNickname}</strong>님이 친구 요청을 수락했어요</p>
                          <p className="notif-item-time">{timeText}</p>
                        </>
                      ) : n.type === 'comment' ? (
                        <>
                          <p className="notif-item-text"><strong>{n.fromNickname}</strong>님이 내 기록에 댓글을 달았어요</p>
                          <p className="notif-item-time">{timeText}</p>
                        </>
                      ) : n.type === 'mention' ? (
                        <>
                          <p className="notif-item-text"><strong>{n.fromNickname}</strong>님이 댓글에서 나를 언급했어요</p>
                          <p className="notif-item-time">{timeText}</p>
                        </>
                      ) : (
                        <>
                          <p className="notif-item-text">
                            <strong>{n.fromNickname}</strong>님이 내 기록에 공감을 남겼어요
                            {n.reactionType === 'heart' && ' ❤️'}
                            {n.reactionType === 'funny' && ' 😄'}
                            {n.reactionType === 'sad' && ' 😢'}
                            {n.reactionType === 'surprised' && ' 😮'}
                            {n.reactionType === 'cheer' && ' 👏'}
                          </p>
                          <p className="notif-item-time">{timeText}</p>
                        </>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem', flexShrink: 0, alignSelf: 'flex-start' }}>
                      {n.type === 'friendRequest' && !pendingFriendshipIds.has(n.friendshipId ?? '') && (
                        <span className="badge badge-gray">처리 완료</span>
                      )}
                      {!n.read && (
                        <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'var(--pink)', display: 'inline-block', marginTop: '0.2rem' }} title="읽지 않음" />
                      )}
                      {(n.type === 'comment' || n.type === 'mention' || n.type === 'reaction') && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '0.9rem', height: '0.9rem', color: 'var(--gray-400)' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )
        )}

        {/* 친구 관리 탭 */}
        {tab === 'friends' && (
          friendsLoading ? <div className="loading-screen"><div className="spinner" /></div> :
          friends.length === 0 ? (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <p>등록된 친구가 없어요</p>
            </div>
          ) : (
            friends.map(f => (
              <div key={f.friendUid} className="user-item">
                <div className="user-avatar">{f.nickname[0]}</div>
                <div className="user-info">
                  <p className="user-name">{f.nickname}</p>
                  <p className="user-email">{f.email}</p>
                </div>
                <button className="btn btn-sm btn-danger" onClick={() => setShowRemoveModal(f)}>정리</button>
              </div>
            ))
          )
        )}
      </main>

      <BottomNav />

      {/* 프로필 사진 확대 모달 */}
      {showPhotoModal && profile?.photoUrl && (
        <div className="modal-overlay" onClick={() => setShowPhotoModal(false)} style={{ zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={profile.photoUrl}
              alt="프로필 사진"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '0.75rem', display: 'block' }}
            />
            <button
              className="btn-icon"
              onClick={() => setShowPhotoModal(false)}
              style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: '50%' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 친구 삭제 확인 모달 */}
      {showRemoveModal && (
        <div className="modal-overlay" onClick={() => setShowRemoveModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <p className="modal-title">친구를 정리할까요?</p>
            <p className="modal-desc">상대방에게도 정리돼요</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowRemoveModal(null)}>취소</button>
              <button className="btn btn-danger" onClick={() => handleRemoveFriend(showRemoveModal)}
                disabled={removingUid === showRemoveModal.friendUid}>
                {removingUid === showRemoveModal.friendUid ? <><span className="spinner" /> 정리 중...</> : '정리하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 게시글 모달 (알림 클릭 시) */}
      {(postModalLoading || postModal) && (
        <div
          className="modal-overlay"
          onClick={() => { setPostModal(null); setPostModalLoading(false) }}
          style={{ zIndex: 200, alignItems: 'flex-start', overflowY: 'auto', padding: '1.5rem 1rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '480px', margin: '0 auto' }}
          >
            {/* 닫기 버튼 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
              <button
                onClick={() => { setPostModal(null); setPostModalLoading(false) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '2rem', height: '2rem', borderRadius: '50%', border: 'none',
                  background: 'rgba(255,255,255,0.9)', color: '#333', cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)', flexShrink: 0,
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '1rem', height: '1rem' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {postModalLoading ? (
              <div className="post-card skeleton-card">
                <div className="post-card-header">
                  <div className="skeleton" style={{ width: '6rem', height: '1rem', borderRadius: '0.375rem' }} />
                  <div className="skeleton" style={{ width: '4rem', height: '1.25rem', borderRadius: '1rem' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <div className="skeleton" style={{ width: '100%', height: '0.875rem', borderRadius: '0.375rem' }} />
                  <div className="skeleton" style={{ width: '80%', height: '0.875rem', borderRadius: '0.375rem' }} />
                </div>
              </div>
            ) : postModal ? (
              <PostCard post={postModal} readOnly currentUserUid={user?.uid} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

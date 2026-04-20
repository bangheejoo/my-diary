import { useState, useEffect, useRef } from 'react'
import type { Comment } from '../services/commentService'
import { getComments, getCommentCount, addComment, deleteComment } from '../services/commentService'
import { getUserProfile } from '../services/authService'
import { getMyFriends, getFriendshipStatus, sendFriendRequest } from '../services/friendService'
import { showToast } from '../utils/toast'

interface Props {
  postId: string
  postUid: string        // 게시글 작성자 uid (댓글 삭제 권한)
  currentUserUid: string
}

interface CommentWithNick extends Comment {
  nickname: string
  photoUrl?: string | null
  photoThumbUrl?: string | null
}

interface FriendSummary {
  uid: string
  nickname: string
  photoUrl?: string | null
  photoThumbUrl?: string | null
}

function timeAgo(ts: unknown): string {
  if (!ts || typeof (ts as { toDate?: unknown }).toDate !== 'function') return ''
  const date = (ts as { toDate: () => Date }).toDate()
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** @닉네임 패턴을 핑크 강조로 렌더링 */
function renderContent(content: string) {
  const parts = content.split(/(@[^\s@]+)/g)
  return parts.map((part, i) =>
    /^@[^\s@]+$/.test(part)
      ? <span key={i} className="mention">{part}</span>
      : <span key={i}>{part}</span>
  )
}

type ModalStatus = { status: string; requesterId?: string } | null | 'loading'

export default function CommentSection({ postId, postUid, currentUserUid }: Props) {
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState<CommentWithNick[]>([])
  const [commentCount, setCommentCount] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 멘션 관련
  const [friends, setFriends] = useState<FriendSummary[]>([])
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)

  // 유저 프로필 모달
  const [userModal, setUserModal] = useState<{ uid: string; nickname: string; photoUrl?: string | null; photoThumbUrl?: string | null } | null>(null)
  const [modalStatus, setModalStatus] = useState<ModalStatus>('loading')
  const [requesting, setRequesting] = useState(false)
  const [showFullPhoto, setShowFullPhoto] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLUListElement>(null)

  // 멘션 후보 (최대 5명)
  const mentionCandidates = mentionQuery !== null
    ? friends
        .filter(f => f.nickname.toLowerCase().startsWith(mentionQuery.toLowerCase()))
        .slice(0, 5)
    : []

  useEffect(() => {
    getCommentCount(postId).then(setCommentCount).catch(() => {})
  }, [postId])

  useEffect(() => {
    if (!open) return
    loadComments()
    loadFriends()
  }, [open])

  // 멘션 인덱스를 후보 범위 내로 보정
  useEffect(() => {
    if (mentionIndex >= mentionCandidates.length) setMentionIndex(0)
  }, [mentionCandidates.length])

  async function loadComments() {
    setLoading(true)
    try {
      const raw = await getComments(postId)
      const profiles = await Promise.all(raw.map(c => getUserProfile(c.uid)))
      setComments(raw.map((c, i) => ({
        ...c,
        nickname: profiles[i]?.nickname || '알 수 없음',
        photoUrl: profiles[i]?.photoUrl,
        photoThumbUrl: profiles[i]?.photoThumbUrl,
      })))
    } catch {
      showToast('댓글을 불러오지 못했어요', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadFriends() {
    try {
      const raw = await getMyFriends(currentUserUid)
      const profiles = await Promise.all(raw.map(f => getUserProfile(f.friendUid)))
      setFriends(raw.map((f, i) => ({
        uid: f.friendUid,
        nickname: profiles[i]?.nickname || '알 수 없음',
        photoUrl: profiles[i]?.photoUrl,
        photoThumbUrl: profiles[i]?.photoThumbUrl,
      })))
    } catch (err) {
      console.error('loadFriends error:', err)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInput(val)

    // 커서 앞의 텍스트에서 마지막 @word 감지
    const cursor = e.target.selectionStart ?? val.length
    const textUpToCursor = val.slice(0, cursor)
    const atMatch = textUpToCursor.match(/@([^\s@]*)$/)
    if (atMatch) {
      setMentionQuery(atMatch[1])
      setMentionIndex(0)
    } else {
      setMentionQuery(null)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (mentionCandidates.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setMentionIndex(i => Math.min(i + 1, mentionCandidates.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setMentionIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && mentionQuery !== null) {
      e.preventDefault()
      selectMention(mentionCandidates[mentionIndex])
    } else if (e.key === 'Escape') {
      setMentionQuery(null)
    }
  }

  function selectMention(friend: FriendSummary) {
    const cursor = inputRef.current?.selectionStart ?? input.length
    const before = input.slice(0, cursor)
    const after = input.slice(cursor)
    // @partial → @nickname (공백 포함)
    const replaced = before.replace(/@([^\s@]*)$/, `@${friend.nickname} `)
    setInput(replaced + after)
    setMentionQuery(null)
    setMentionIndex(0)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    const text = input.trim()
    if (!text) return
    setSubmitting(true)
    try {
      // 댓글 내용에서 실제로 멘션된 친구 UID 추출
      const mentionedUids = friends
        .filter(f => new RegExp(`@${escapeRegex(f.nickname)}(?:\\s|$)`).test(text))
        .map(f => f.uid)

      await addComment(postId, currentUserUid, text, mentionedUids)
      setInput('')
      setMentionQuery(null)
      await loadComments()
      setCommentCount(prev => prev + 1)
    } catch {
      showToast('댓글 남기기에 실패했어요', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await deleteComment(commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
      setCommentCount(prev => Math.max(0, prev - 1))
    } catch {
      showToast('댓글 지우기에 실패했어요', 'error')
    }
  }

  async function handleUserClick(uid: string, nickname: string, photoUrl?: string | null, photoThumbUrl?: string | null) {
    setUserModal({ uid, nickname, photoUrl, photoThumbUrl })
    setModalStatus('loading')
    try {
      const s = await getFriendshipStatus(currentUserUid, uid)
      setModalStatus(s as ModalStatus)
    } catch {
      setModalStatus(null)
    }
  }

  async function handleFriendRequest() {
    if (!userModal) return
    setRequesting(true)
    try {
      await sendFriendRequest(currentUserUid, userModal.uid)
      setModalStatus({ status: 'pending', requesterId: currentUserUid })
      showToast('친구 요청을 보냈어요', 'success')
    } catch (err) {
      showToast((err as Error).message || '요청에 실패했어요', 'error')
    } finally {
      setRequesting(false)
    }
  }

  function closeUserModal() {
    setUserModal(null)
    setModalStatus('loading')
    setRequesting(false)
    setShowFullPhoto(false)
  }

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(v => !v)
  }

  return (
    <div className="comment-section" onClick={e => e.stopPropagation()}>
      <button className="comment-toggle" onClick={handleToggle}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
        <span>댓글{(open ? comments.length : commentCount) > 0 ? ` ${open ? comments.length : commentCount}개` : ''}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
          strokeWidth={2} stroke="currentColor"
          style={{ width: '0.85rem', height: '0.85rem', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="comment-body">
          {loading ? (
            <div style={{ padding: '0.75rem', textAlign: 'center' }}><div className="spinner" /></div>
          ) : comments.length === 0 ? (
            <p className="comment-empty">아직 댓글이 없어요. 첫 댓글을 남겨보세요!</p>
          ) : (
            <ul className="comment-list">
              {comments.map(c => {
                return (
                <li key={c.id} className="comment-item">
                  <div
                    className="user-avatar"
                    style={{ width: '1.75rem', height: '1.75rem', fontSize: '0.72rem', flexShrink: 0, cursor: 'pointer' }}
                    onClick={() => handleUserClick(c.uid, c.nickname, c.photoUrl, c.photoThumbUrl)}
                  >
                    {(c.photoThumbUrl || c.photoUrl)
                      ? <img src={c.photoThumbUrl || c.photoUrl!} alt="프로필" loading="lazy" decoding="async" />
                      : c.nickname[0]}
                  </div>
                  <div className="comment-content">
                    <div className="comment-header">
                      <span
                        className={'comment-author comment-author-clickable'}
                        onClick={() => handleUserClick(c.uid, c.nickname, c.photoUrl, c.photoThumbUrl)}
                      >{c.nickname}</span>
                      <span className="comment-time">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="comment-text">{renderContent(c.content)}</p>
                  </div>
                  {(c.uid === currentUserUid || postUid === currentUserUid) && (
                    <button
                      className="comment-delete"
                      onClick={e => handleDelete(c.id, e)}
                      title="삭제"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </li>
              )
              })}
            </ul>
          )}

          {/* 댓글 입력폼 + 멘션 드롭다운 */}
          <form className="comment-form" onSubmit={handleSubmit} style={{ position: 'relative' }}>
            {/* 멘션 드롭다운 */}
            {mentionCandidates.length > 0 && (
              <ul className="mention-dropdown" ref={dropdownRef}>
                {mentionCandidates.map((f, i) => (
                  <li
                    key={f.uid}
                    className={`mention-item${i === mentionIndex ? ' active' : ''}`}
                    onMouseDown={e => { e.preventDefault(); selectMention(f) }}
                  >
                    <div className="user-avatar" style={{ width: '1.5rem', height: '1.5rem', fontSize: '0.65rem', flexShrink: 0 }}>
                      {(f.photoThumbUrl || f.photoUrl)
                        ? <img src={f.photoThumbUrl || f.photoUrl!} alt="" loading="lazy" decoding="async" />
                        : f.nickname[0]}
                    </div>
                    <span className="mention-item-nick">@{f.nickname}</span>
                  </li>
                ))}
              </ul>
            )}

            <input
              ref={inputRef}
              className="comment-input"
              type="text"
              placeholder="댓글을 입력해 주세요"
              value={input}
              maxLength={100}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={() => setTimeout(() => setMentionQuery(null), 150)}
              onClick={e => e.stopPropagation()}
            />
            <button
              type="submit"
              className="comment-submit"
              disabled={submitting || !input.trim()}
            >
              {submitting ? <div className="spinner" style={{ width: '1rem', height: '1rem' }} /> : '남기기'}
            </button>
          </form>
        </div>
      )}
      {/* 프로필 사진 확대 */}
      {userModal && showFullPhoto && userModal.photoUrl && (
        <div className="modal-overlay" onClick={() => setShowFullPhoto(false)} style={{ zIndex: 110 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
            <img
              src={userModal.photoUrl}
              alt="프로필 사진"
              loading="lazy"
              decoding="async"
              style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '0.75rem', display: 'block' }}
            />
            <button
              className="btn-icon"
              onClick={() => setShowFullPhoto(false)}
              style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'var(--white)', borderRadius: '50%' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 유저 프로필 모달 */}
      {userModal && (
        <div className="modal-overlay" onClick={closeUserModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', gap: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* 닫기 버튼 */}
            <button className="btn-icon" onClick={closeUserModal} style={{ alignSelf: 'flex-end', marginBottom: '-0.5rem' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 프로필 사진 (모달 아바타는 원본, 확대는 원본) */}
            <div
              className="user-avatar"
              style={{ width: '5rem', height: '5rem', fontSize: '1.75rem', cursor: userModal.photoUrl ? 'zoom-in' : 'default' }}
              onClick={userModal.photoUrl ? () => setShowFullPhoto(true) : undefined}
            >
              {(userModal.photoThumbUrl || userModal.photoUrl)
                ? <img src={userModal.photoThumbUrl || userModal.photoUrl!} alt="프로필" loading="lazy" decoding="async" />
                : userModal.nickname[0]
              }
            </div>

            {/* 닉네임 */}
            <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--black)' }}>{userModal.nickname}</p>

            {/* 상태 / 버튼 */}
            {userModal.uid !== currentUserUid ? (modalStatus === 'loading' ? (
              <div className="spinner" />
            ) : modalStatus === null ? (
              <button className="btn btn-primary btn-full" onClick={handleFriendRequest} disabled={requesting}>
                {requesting
                  ? <><span className="spinner" style={{ width: '1rem', height: '1rem' }} /> 요청 중...</>
                  : '친구 요청 보내기'
                }
              </button>
            ) : (modalStatus as { status: string }).status === 'accepted' ? (
              <span className="badge badge-mint" style={{ fontSize: '0.85rem', padding: '0.3rem 0.9rem' }}>이미 친구예요</span>
            ) : (modalStatus as { status: string; requesterId?: string }).requesterId === currentUserUid ? (
              <span className="badge badge-gray" style={{ fontSize: '0.85rem', padding: '0.3rem 0.9rem' }}>요청을 보냈어요</span>
            ) : (
              <span className="badge badge-pink" style={{ fontSize: '0.85rem', padding: '0.3rem 0.9rem' }}>나에게 친구 요청을 보냈어요</span>
            )):
            <span className="badge badge-pink" style={{ fontSize: '0.85rem', padding: '0.3rem 0.9rem' }}>나예요</span>
            }
          </div>
        </div>
      )}
    </div>
  )
}

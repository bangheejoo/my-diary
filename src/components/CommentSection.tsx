import { useState, useEffect, useRef } from 'react'
import type { Comment } from '../services/commentService'
import { getComments, addComment, deleteComment } from '../services/commentService'
import { getUserProfile } from '../services/authService'
import { showToast } from '../utils/toast'

interface Props {
  postId: string
  postUid: string        // 게시글 작성자 uid (댓글 삭제 권한)
  currentUserUid: string
}

interface CommentWithNick extends Comment {
  nickname: string
  photoUrl?: string | null
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

export default function CommentSection({ postId, postUid, currentUserUid }: Props) {
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState<CommentWithNick[]>([])
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    loadComments()
  }, [open])

  async function loadComments() {
    setLoading(true)
    try {
      const raw = await getComments(postId)
      const profiles = await Promise.all(raw.map(c => getUserProfile(c.uid)))
      setComments(raw.map((c, i) => ({
        ...c,
        nickname: profiles[i]?.nickname || '알 수 없음',
        photoUrl: profiles[i]?.photoUrl,
      })))
    } catch {
      showToast('댓글을 불러오지 못했어요', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    const text = input.trim()
    if (!text) return
    setSubmitting(true)
    try {
      await addComment(postId, currentUserUid, text)
      setInput('')
      await loadComments()
    } catch {
      showToast('댓글 등록에 실패했어요', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await deleteComment(commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch {
      showToast('댓글 삭제에 실패했어요', 'error')
    }
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
        <span>댓글 {comments.length > 0 ? comments.length : open ? '' : ''}</span>
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
              {comments.map(c => (
                <li key={c.id} className="comment-item">
                  <div className="user-avatar" style={{ width: '1.75rem', height: '1.75rem', fontSize: '0.72rem', flexShrink: 0 }}>
                    {c.photoUrl ? <img src={c.photoUrl} alt="프로필" /> : c.nickname[0]}
                  </div>
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-author">{c.nickname}</span>
                      <span className="comment-time">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="comment-text">{c.content}</p>
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
              ))}
            </ul>
          )}

          <form className="comment-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              className="comment-input"
              type="text"
              placeholder="댓글을 입력해 주세요"
              value={input}
              maxLength={100}
              onChange={e => setInput(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
            <button
              type="submit"
              className="comment-submit"
              disabled={submitting || !input.trim()}
            >
              {submitting ? <div className="spinner" style={{ width: '1rem', height: '1rem' }} /> : '등록'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import type { ReactionType, ReactionMap } from '../services/reactionService'
import { REACTION_LIST, getReactions, setReaction } from '../services/reactionService'
import { getUserProfile } from '../services/authService'
import { showToast } from '../utils/toast'

interface Props {
  postId: string
  currentUserUid: string
  postOwnerUid?: string
}

const EMPTY_MAP = (): ReactionMap => ({
  heart: [], funny: [], sad: [], surprised: [], cheer: [],
})

export default function ReactionBar({ postId, currentUserUid, postOwnerUid }: Props) {
  const [reactions, setReactions] = useState<ReactionMap>(EMPTY_MAP())
  const [submitting, setSubmitting] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [detailNicknames, setDetailNicknames] = useState<Record<string, string>>({})

  useEffect(() => {
    getReactions(postId).then(setReactions).catch(() => {})
  }, [postId])

  async function handleClick(type: ReactionType, e: React.MouseEvent) {
    e.stopPropagation()
    if (submitting) return

    const myCurrentType = (Object.keys(reactions) as ReactionType[])
      .find(t => reactions[t].includes(currentUserUid)) ?? null

    const newType: ReactionType | null = myCurrentType === type ? null : type

    // Optimistic update
    setReactions(prev => {
      const next: ReactionMap = {
        heart:     [...prev.heart],
        funny:     [...prev.funny],
        sad:       [...prev.sad],
        surprised: [...prev.surprised],
        cheer:     [...prev.cheer],
      }
      if (myCurrentType) {
        next[myCurrentType] = next[myCurrentType].filter(u => u !== currentUserUid)
      }
      if (newType) {
        next[newType] = [...next[newType], currentUserUid]
      }
      return next
    })

    setSubmitting(true)
    try {
      await setReaction(postId, currentUserUid, newType, postOwnerUid)
    } catch {
      // 실패 시 서버 상태로 복원
      getReactions(postId).then(setReactions).catch(() => {})
      showToast('공감 남기기에 실패했어요', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const totalCount = Object.values(reactions).reduce((s, uids) => s + uids.length, 0)

  async function openDetail(e: React.MouseEvent) {
    e.stopPropagation()
    setShowDetail(true)
    const allUids = [...new Set(Object.values(reactions).flat())]
    if (allUids.length === 0) return
    const profiles = await Promise.all(allUids.map(uid => getUserProfile(uid).catch(() => null)))
    const map: Record<string, string> = {}
    allUids.forEach((uid, i) => { map[uid] = profiles[i]?.nickname || '알 수 없음' })
    setDetailNicknames(map)
  }

  return (
    <div onClick={e => e.stopPropagation()}>
      <div className="reaction-bar">
        {REACTION_LIST.map(r => {
          const count = reactions[r.type].length
          const active = reactions[r.type].includes(currentUserUid)
          return (
            <button
              key={r.type}
              className={`reaction-btn${active ? ' active' : ''}${count === 0 && !active ? ' empty' : ''}`}
              onClick={e => handleClick(r.type, e)}
              disabled={submitting}
              title={r.label}
            >
              <span className="reaction-emoji">{r.emoji}</span>
              {count > 0 && <span className="reaction-count">{count}</span>}
            </button>
          )
        })}
        {totalCount > 0 && (
          <button className="reaction-who-btn" onClick={openDetail}>
            {totalCount}명 공감했어요
          </button>
        )}
      </div>

      {showDetail && (
        <div className="modal-overlay" style={{ zIndex: 200 }} onClick={e => { e.stopPropagation(); setShowDetail(false) }}>
          <div className="modal" style={{ maxWidth: '22rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <p className="modal-title" style={{ margin: 0 }}>공감한 사람</p>
              <button className="btn-icon" onClick={e => { e.stopPropagation(); setShowDetail(false) }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {REACTION_LIST.map(r => {
                const uids = reactions[r.type]
                if (uids.length === 0) return null
                return (
                  <div key={r.type}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: '0.35rem' }}>
                      {r.emoji} {r.label} {uids.length}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {uids.map(uid => (
                        <span key={uid} style={{
                          fontSize: '0.8rem', background: 'var(--gray-100)',
                          borderRadius: '1rem', padding: '0.2rem 0.6rem',
                        }}>
                          {detailNicknames[uid] || '…'}
                        </span>
                      ))}
                    </div>
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

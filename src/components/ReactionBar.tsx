import { useState, useEffect } from 'react'
import type { ReactionType, ReactionMap } from '../services/reactionService'
import { REACTION_LIST, getReactions, setReaction } from '../services/reactionService'
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
      showToast('반응 등록에 실패했어요', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const totalCount = Object.values(reactions).reduce((s, uids) => s + uids.length, 0)
  const hasAny = totalCount > 0

  return (
    <div className="reaction-bar" onClick={e => e.stopPropagation()}>
      {REACTION_LIST.map(r => {
        const count = reactions[r.type].length
        const active = reactions[r.type].includes(currentUserUid)
        if (!hasAny && !active) {
          // 반응이 아무것도 없을 때는 모든 버튼을 작게 표시
        }
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
    </div>
  )
}

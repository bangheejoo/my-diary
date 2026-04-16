import { useState } from 'react'
import type { Post } from '../services/postService'
import { today, firstDayOfMonth, lastDateOfMonth, toKoreanDate } from '../utils/formatDate'
import PostCard from './PostCard'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

interface Props {
  posts: Post[]
  onDateSelect: (dateStr: string) => Promise<Post[]>
  readOnly?: boolean
  currentUserUid?: string
}

function SkeletonCard() {
  return (
    <div className="post-card skeleton-card">
      <div className="post-card-header">
        <div className="skeleton" style={{ width: '6rem', height: '1rem', borderRadius: '0.375rem' }} />
        <div className="skeleton" style={{ width: '4rem', height: '1.25rem', borderRadius: '1rem' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
        <div className="skeleton" style={{ width: '100%', height: '0.875rem', borderRadius: '0.375rem' }} />
        <div className="skeleton" style={{ width: '80%', height: '0.875rem', borderRadius: '0.375rem' }} />
        <div className="skeleton" style={{ width: '55%', height: '0.875rem', borderRadius: '0.375rem' }} />
      </div>
    </div>
  )
}

export default function CalendarView({ posts, onDateSelect, readOnly = false, currentUserUid }: Props) {
  const todayStr = today()
  const now = new Date()

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<string | null>(null)
  const [datePosts, setDatePosts] = useState<Post[]>([])
  const [loadingDate, setLoadingDate] = useState(false)

  const postDates = new Set(posts.map(p => p.recordDate))

  async function handleDateClick(dateStr: string) {
    if (dateStr > todayStr) return
    setSelected(dateStr)
    setLoadingDate(true)
    const result = await onDateSelect(dateStr)
    setDatePosts(result)
    setLoadingDate(false)
  }

  function prevMonth() {
    setMonth(m => {
      if (m === 0) { setYear(y => y - 1); return 11 }
      return m - 1
    })
    setSelected(null)
    setDatePosts([])
  }

  function nextMonth() {
    if (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth())) return
    setMonth(m => {
      if (m === 11) { setYear(y => y + 1); return 0 }
      return m + 1
    })
    setSelected(null)
    setDatePosts([])
  }

  const firstDay = firstDayOfMonth(year, month)
  const lastDate = lastDateOfMonth(year, month)

  const days: Array<{ dateStr: string; d: number; isToday: boolean; isSelected: boolean; hasPost: boolean; isFuture: boolean }> = []
  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      dateStr,
      d,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selected,
      hasPost: postDates.has(dateStr),
      isFuture: dateStr > todayStr,
    })
  }

  return (
    <>
      <div className="calendar-container">
        <div className="calendar-header">
          <button className="btn-icon" onClick={prevMonth}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="calendar-title">{year}년 {month + 1}월</span>
          <button className="btn-icon" onClick={nextMonth}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        <div className="calendar-grid">
          {DAY_NAMES.map(n => <div key={n} className="calendar-day-name">{n}</div>)}
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} className="calendar-day empty" />
          ))}
          {days.map(({ dateStr, d, isToday, isSelected, hasPost, isFuture }) => {
            let cls = 'calendar-day'
            if (isToday) cls += ' today'
            if (isSelected) cls += ' selected'
            if (hasPost) cls += ' has-post'
            if (isFuture) cls += ' empty'
            return (
              <div
                key={dateStr}
                className={cls}
                role={isFuture ? undefined : 'button'}
                onClick={() => !isFuture && handleDateClick(dateStr)}
              >
                {d}
              </div>
            )
          })}
        </div>
      </div>

      {selected && (
        <div>
          <div className="section-header">{toKoreanDate(selected)}의 기록</div>
          {loadingDate ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : datePosts.length === 0 ? (
            <div className="empty-state"><p>이 날의 기록이 없어요</p></div>
          ) : (
            datePosts.map(p => (
              <PostCard key={p.id} post={p} readOnly={readOnly} currentUserUid={currentUserUid} />
            ))
          )}
        </div>
      )}
    </>
  )
}

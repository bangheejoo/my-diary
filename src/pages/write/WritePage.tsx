import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { createPost, updatePost, deletePost, getPost, getPostCountByDate } from '../../services/postService'
import { uploadImage } from '../../services/storageService'
import { showToast } from '../../utils/toast'
import { today, isPastOrToday } from '../../utils/formatDate'

const MAX_CHARS = 1000

type Visibility = 'private' | 'friends'

export default function WritePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')
  const isEdit = Boolean(editId)

  const [recordDate, setRecordDate] = useState(today())
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('private')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [existingStoragePath, setExistingStoragePath] = useState<string | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [imageError, setImageError] = useState('')
  const [dateError, setDateError] = useState('')
  const [contentError, setContentError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pageLoading, setPageLoading] = useState(isEdit)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isEdit || !editId || !user) return
    getPost(editId).then(post => {
      if (!post || post.uid !== user.uid) {
        showToast('기록을 찾을 수 없어요', 'error')
        setTimeout(goBack, 600)
        return
      }
      setRecordDate(post.recordDate)
      setContent(post.content)
      setVisibility(post.visibility)
      if (post.imageUrl) {
        setImagePreviewUrl(post.imageUrl)
        setExistingImageUrl(post.imageUrl)
        setExistingStoragePath(post.imageStoragePath)
      }
      setPageLoading(false)
    }).catch(() => {
      showToast('기록을 불러오지 못했어요', 'error')
      setTimeout(goBack, 600)
    })
  }, [editId, user])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageError('')
    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
    setImageRemoved(false)
  }

  function handleRemoveImage() {
    setImageFile(null)
    setImagePreviewUrl(null)
    setImageRemoved(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSave() {
    setImageError('')
    setDateError('')
    setContentError('')

    let valid = true
    if (!recordDate) { setDateError('날짜를 선택해 주세요'); valid = false }
    else if (!isPastOrToday(recordDate)) { setDateError('오늘 이전 날짜만 기록할 수 있어요'); valid = false }
    if (!content.trim()) { setContentError('내용을 입력해 주세요'); valid = false }
    if (!valid) return

    setSaving(true)
    try {
      if (!isEdit) {
        const count = await getPostCountByDate(user!.uid, recordDate)
        if (count >= 3) {
          setDateError('동일한 날짜에 최대 3개의 이야기만 기록할 수 있어요')
          setSaving(false)
          return
        }
      }

      let imageUrl = isEdit && !imageRemoved ? existingImageUrl : null
      let storagePath = isEdit && !imageRemoved ? existingStoragePath : null

      if (imageFile) {
        const result = await uploadImage(imageFile, user!.uid)
        imageUrl = result.url
        storagePath = result.storagePath
      }

      if (isEdit && editId) {
        await updatePost(editId, {
          content: content.trim(),
          recordDate,
          visibility,
          imageUrl,
          imageStoragePath: storagePath,
          oldImageStoragePath: imageRemoved || imageFile ? existingStoragePath : null,
        })
        showToast('기록을 다듬었어요', 'success')
      } else {
        await createPost({
          uid: user!.uid,
          content: content.trim(),
          recordDate,
          visibility,
          imageUrl,
          imageStoragePath: storagePath,
        })
        showToast('기록을 남겼어요', 'success')
      }
      setTimeout(goBack, 600)
    } catch (err: unknown) {
      const msg = (err as Error).message || '기록 남기기에 실패했어요'
      if (msg.includes('5MB')) setImageError(msg)
      else showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editId) return
    setDeleting(true)
    try {
      await deletePost(editId)
      showToast('기록이 지워졌어요', 'success')
      setTimeout(goBack, 600)
    } catch {
      showToast('기록 지우기에 실패했어요', 'error')
      setDeleting(false)
    }
  }

  function goBack() {
    if (window.history.length > 1) navigate(-1)
    else navigate('/main')
  }

  if (pageLoading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="app-container">
      <header className="app-header">
        <button className="btn-icon" onClick={goBack}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="page-title">{isEdit ? '기록 다듬기' : '기록 남기기'}</span>
        <button
          className="btn-icon"
          style={{ color: 'var(--pink)' }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving
            ? <span className="spinner" style={{ width: '1.25rem', height: '1.25rem' }} />
            : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )
          }
        </button>
      </header>

      <main className="main-content write-page">
        {/* 날짜 */}
        <div className="form-group">
          <label className="form-label">날짜</label>
          <input
            className={`form-input${dateError ? ' input-error' : ''}`}
            type="date"
            value={recordDate}
            max={today()}
            onChange={e => { setRecordDate(e.target.value); setDateError('') }}
          />
          {dateError && <p className="err-msg">{dateError}</p>}
        </div>

        {/* 공개 범위 */}
        <div className="form-group">
          <label className="form-label">공개 범위</label>
          <div className="visibility-group">
            {(['private', 'friends'] as Visibility[]).map(v => (
              <button
                key={v}
                type="button"
                className={`visibility-btn${visibility === v ? ' selected' : ''}`}
                onClick={() => setVisibility(v)}
              >
                {v === 'private' ? '나만보기' : '친구랑보기'}
              </button>
            ))}
          </div>
        </div>

        {/* 내용 */}
        <div className="form-group">
          <label className="form-label">내용</label>
          <textarea
            className={`form-input textarea${contentError ? ' input-error' : ''}`}
            placeholder="오늘 하루를 기록해 보세요"
            maxLength={MAX_CHARS}
            value={content}
            onChange={e => { setContent(e.target.value); setContentError('') }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {contentError ? <p className="err-msg">{contentError}</p> : <span />}
            <span
              className="char-count"
              style={{ color: content.length >= MAX_CHARS ? '#ef4444' : content.length >= MAX_CHARS * 0.9 ? '#f59e0b' : '' }}
            >
              {content.length} / {MAX_CHARS}
            </span>
          </div>
        </div>

        {/* 이미지 */}
        <div className="form-group">
          <label className="form-label">이미지 (선택)</label>
          {imagePreviewUrl ? (
            <div className="image-preview-wrap">
              <img src={imagePreviewUrl} alt="미리보기" className="image-preview" />
              <button type="button" className="btn-remove-image" onClick={handleRemoveImage}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <span>이미지 추가</span>
              <span className="text-muted text-sm">최대 5MB</span>
            </div>
          )}
          {imageError && <p className="err-msg">{imageError}</p>}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageChange}
          />
        </div>

        {/* 삭제 버튼 (수정 모드) */}
        {isEdit && (
          <button
            type="button"
            className="btn btn-danger btn-full"
            onClick={() => setShowDeleteModal(true)}
          >
            기록 지우기
          </button>
        )}
      </main>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <p className="modal-title">기록을 지울까요?</p>
            <p className="modal-desc">지워버린 기록은 복구할 수 없어요</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowDeleteModal(false)}>취소</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? <><span className="spinner" /> 지우는 중...</> : '지우기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

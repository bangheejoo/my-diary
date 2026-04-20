import { useNavigate } from 'react-router-dom'
import type { Post } from '../services/postService'
import { toKoreanDate } from '../utils/formatDate'
import ReactionBar from './ReactionBar'
import CommentSection from './CommentSection'

interface Props {
  post: Post
  readOnly?: boolean
  currentUserUid?: string
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

export default function PostCard({ post, readOnly = false, currentUserUid }: Props) {
  const navigate = useNavigate()

  function handleClick() {
    if (!readOnly) navigate(`/write?id=${post.id}`)
  }

  return (
    <div className="post-card" onClick={handleClick} style={!readOnly ? { cursor: 'pointer' } : undefined}>
      <div className="post-card-header">
        <span className="post-date">{toKoreanDate(post.recordDate)}</span>
        <span className={`badge ${
          post.visibility === 'private' ? 'badge-gray' :
          post.visibility === 'us'      ? 'badge-pink' :
          'badge-mint'
        }`}>
          {post.visibility === 'private' ? '나만보기' :
           post.visibility === 'us'      ? '우리만보기' :
           '친구랑보기'}
        </span>
      </div>
      <p
        className="post-content"
        dangerouslySetInnerHTML={{ __html: escapeHtml(post.content) }}
      />
      {post.imageUrl && (
        <div className="post-image">
          <img src={post.imageUrl} alt="기록 이미지" loading="lazy" />
        </div>
      )}
      {currentUserUid && (post.visibility !== 'private' || currentUserUid === post.uid) && (
        <>
          <ReactionBar postId={post.id} currentUserUid={currentUserUid} postOwnerUid={post.uid} />
          <CommentSection postId={post.id} postUid={post.uid} currentUserUid={currentUserUid} />
        </>
      )}
    </div>
  )
}

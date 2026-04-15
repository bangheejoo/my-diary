import { db } from './firebase'
import {
  collection,
  doc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'

export interface Comment {
  id: string
  postId: string
  uid: string
  content: string
  createdAt?: unknown
}

export async function getComments(postId: string): Promise<Comment[]> {
  const q = query(
    collection(db, 'comments'),
    where('postId', '==', postId),
    orderBy('createdAt', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Comment)
}

export async function addComment(postId: string, uid: string, content: string): Promise<string> {
  const postSnap = await getDoc(doc(db, 'posts', postId))
  const postOwnerUid = postSnap.exists() ? postSnap.data().uid as string : null

  const batch = writeBatch(db)
  const commentRef = doc(collection(db, 'comments'))
  batch.set(commentRef, {
    postId,
    uid,
    content,
    createdAt: serverTimestamp(),
  })

  if (postOwnerUid && postOwnerUid !== uid) {
    const notifRef = doc(collection(db, 'notifications'))
    batch.set(notifRef, {
      toUid: postOwnerUid,
      fromUid: uid,
      type: 'comment',
      postId,
      read: false,
      createdAt: serverTimestamp(),
    })
  }

  await batch.commit()
  return commentRef.id
}

export async function deleteComment(commentId: string): Promise<void> {
  await deleteDoc(doc(db, 'comments', commentId))
}

export async function deleteCommentsByPost(postId: string): Promise<void> {
  const q = query(collection(db, 'comments'), where('postId', '==', postId))
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
}

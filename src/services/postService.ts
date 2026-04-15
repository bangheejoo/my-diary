import { db } from './firebase'
import { deleteImage } from './storageService'
import { deleteCommentsByPost } from './commentService'
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type DocumentSnapshot,
  serverTimestamp,
} from 'firebase/firestore'

export const POSTS_PER_PAGE = 10

export interface PostPage {
  posts: Post[]
  lastDoc: DocumentSnapshot | null
  hasMore: boolean
}

export interface Post {
  id: string
  uid: string
  content: string
  recordDate: string
  visibility: 'private' | 'friends'
  imageUrl: string | null
  imageStoragePath: string | null
  createdAt?: unknown
  updatedAt?: unknown
}

export async function createPost({
  uid,
  content,
  recordDate,
  visibility,
  imageUrl = null,
  imageStoragePath = null,
}: {
  uid: string
  content: string
  recordDate: string
  visibility: 'private' | 'friends'
  imageUrl?: string | null
  imageStoragePath?: string | null
}): Promise<string> {
  const ref = await addDoc(collection(db, 'posts'), {
    uid,
    content,
    recordDate,
    visibility,
    imageUrl,
    imageStoragePath,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updatePost(
  postId: string,
  {
    content,
    recordDate,
    visibility,
    imageUrl,
    imageStoragePath,
    oldImageStoragePath,
  }: {
    content: string
    recordDate: string
    visibility: 'private' | 'friends'
    imageUrl?: string | null
    imageStoragePath?: string | null
    oldImageStoragePath?: string | null
  }
) {
  if (oldImageStoragePath && oldImageStoragePath !== imageStoragePath) {
    await deleteImage(oldImageStoragePath)
  }
  await updateDoc(doc(db, 'posts', postId), {
    content,
    recordDate,
    visibility,
    imageUrl: imageUrl ?? null,
    imageStoragePath: imageStoragePath ?? null,
    updatedAt: serverTimestamp(),
  })
}

export async function deletePost(postId: string) {
  const snap = await getDoc(doc(db, 'posts', postId))
  if (!snap.exists()) return
  const data = snap.data()
  if (data.imageStoragePath) await deleteImage(data.imageStoragePath)
  await deleteCommentsByPost(postId)
  await deleteDoc(doc(db, 'posts', postId))
}

export async function getPost(postId: string): Promise<Post | null> {
  const snap = await getDoc(doc(db, 'posts', postId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Post
}

export async function getMyPosts(uid: string): Promise<Post[]> {
  const q = query(collection(db, 'posts'), where('uid', '==', uid))
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as Post)
    .sort((a, b) => b.recordDate.localeCompare(a.recordDate))
}

export async function getMyPostsPaged(
  uid: string,
  cursor: DocumentSnapshot | null = null,
): Promise<PostPage> {
  const constraints = [
    where('uid', '==', uid),
    orderBy('recordDate', 'desc'),
    orderBy('createdAt', 'desc'),
    limit(POSTS_PER_PAGE + 1),
    ...(cursor ? [startAfter(cursor)] : []),
  ]
  const q = query(collection(db, 'posts'), ...constraints)
  const snap = await getDocs(q)
  const docs = snap.docs
  const hasMore = docs.length > POSTS_PER_PAGE
  const pageDocs = hasMore ? docs.slice(0, POSTS_PER_PAGE) : docs
  return {
    posts: pageDocs.map(d => ({ id: d.id, ...d.data() }) as Post),
    lastDoc: pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null,
    hasMore,
  }
}

export async function getPostCountByDate(uid: string, dateStr: string): Promise<number> {
  const q = query(
    collection(db, 'posts'),
    where('uid', '==', uid),
    where('recordDate', '==', dateStr),
  )
  const snap = await getDocs(q)
  return snap.size
}

export async function getMyPostsByDate(uid: string, dateStr: string): Promise<Post[]> {
  const q = query(
    collection(db, 'posts'),
    where('uid', '==', uid),
    where('recordDate', '==', dateStr)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Post)
}

export async function getFriendsPosts(friendUids: string[]): Promise<Post[]> {
  if (!friendUids.length) return []

  const chunks: string[][] = []
  for (let i = 0; i < friendUids.length; i += 30) {
    chunks.push(friendUids.slice(i, i + 30))
  }

  const results: Post[] = []
  for (const chunk of chunks) {
    const q = query(
      collection(db, 'posts'),
      where('uid', 'in', chunk),
      where('visibility', '==', 'friends')
    )
    const snap = await getDocs(q)
    snap.docs.forEach(d => results.push({ id: d.id, ...d.data() } as Post))
  }

  return results.sort((a, b) => b.recordDate.localeCompare(a.recordDate))
}

export async function getFriendPostsByUid(friendUid: string): Promise<Post[]> {
  const q = query(
    collection(db, 'posts'),
    where('uid', '==', friendUid),
    where('visibility', '==', 'friends')
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as Post)
    .sort((a, b) => b.recordDate.localeCompare(a.recordDate))
}

export async function getFriendPostsByDate(friendUids: string[], dateStr: string): Promise<Post[]> {
  if (!friendUids.length) return []

  const chunks: string[][] = []
  for (let i = 0; i < friendUids.length; i += 30) {
    chunks.push(friendUids.slice(i, i + 30))
  }

  const results: Post[] = []
  for (const chunk of chunks) {
    const q = query(
      collection(db, 'posts'),
      where('uid', 'in', chunk),
      where('visibility', '==', 'friends'),
      where('recordDate', '==', dateStr)
    )
    const snap = await getDocs(q)
    snap.docs.forEach(d => results.push({ id: d.id, ...d.data() } as Post))
  }
  return results
}

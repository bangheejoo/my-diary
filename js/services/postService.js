/**
 * 게시물(기록) 서비스
 * - orderBy는 Firestore에서 제거하고 클라이언트에서 정렬 (복합 인덱스 최소화)
 */
import { db } from './firebase.js';
import { deleteImage } from './storageService.js';
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
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/** 기록 생성 */
export async function createPost({ uid, content, recordDate, visibility, imageUrl = null, imageStoragePath = null }) {
  const ref = await addDoc(collection(db, 'posts'), {
    uid,
    content,
    recordDate,
    visibility,
    imageUrl,
    imageStoragePath,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** 기록 수정 */
export async function updatePost(postId, { content, recordDate, visibility, imageUrl, imageStoragePath, oldImageStoragePath }) {
  if (oldImageStoragePath && oldImageStoragePath !== imageStoragePath) {
    await deleteImage(oldImageStoragePath);
  }
  await updateDoc(doc(db, 'posts', postId), {
    content,
    recordDate,
    visibility,
    imageUrl: imageUrl ?? null,
    imageStoragePath: imageStoragePath ?? null,
    updatedAt: serverTimestamp(),
  });
}

/** 기록 삭제 */
export async function deletePost(postId) {
  const snap = await getDoc(doc(db, 'posts', postId));
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.imageStoragePath) await deleteImage(data.imageStoragePath);
  await deleteDoc(doc(db, 'posts', postId));
}

/** 기록 단건 조회 */
export async function getPost(postId) {
  const snap = await getDoc(doc(db, 'posts', postId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/** 내 기록 목록 (최신 날짜순) */
export async function getMyPosts(uid) {
  const q = query(
    collection(db, 'posts'),
    where('uid', '==', uid)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.recordDate.localeCompare(a.recordDate));
}

/** 내 특정 날짜 기록 */
export async function getMyPostsByDate(uid, dateStr) {
  const q = query(
    collection(db, 'posts'),
    where('uid', '==', uid),
    where('recordDate', '==', dateStr)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * 친구들의 기록 (친구공개만)
 * - Firestore 복합 인덱스 필요: posts(uid ASC, visibility ASC)
 */
export async function getFriendsPosts(friendUids) {
  if (!friendUids.length) return [];

  const chunks = [];
  for (let i = 0; i < friendUids.length; i += 30) {
    chunks.push(friendUids.slice(i, i + 30));
  }

  const results = [];
  for (const chunk of chunks) {
    const q = query(
      collection(db, 'posts'),
      where('uid', 'in', chunk),
      where('visibility', '==', 'friends')
    );
    const snap = await getDocs(q);
    snap.docs.forEach(d => results.push({ id: d.id, ...d.data() }));
  }

  return results.sort((a, b) => b.recordDate.localeCompare(a.recordDate));
}

/** 특정 친구의 기록 (친구공개만) */
export async function getFriendPostsByUid(friendUid) {
  const q = query(
    collection(db, 'posts'),
    where('uid', '==', friendUid),
    where('visibility', '==', 'friends')
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.recordDate.localeCompare(a.recordDate));
}

/** 특정 날짜의 친구 기록 (친구공개만) */
export async function getFriendPostsByDate(friendUids, dateStr) {
  if (!friendUids.length) return [];

  const chunks = [];
  for (let i = 0; i < friendUids.length; i += 30) {
    chunks.push(friendUids.slice(i, i + 30));
  }

  const results = [];
  for (const chunk of chunks) {
    const q = query(
      collection(db, 'posts'),
      where('uid', 'in', chunk),
      where('visibility', '==', 'friends'),
      where('recordDate', '==', dateStr)
    );
    const snap = await getDocs(q);
    snap.docs.forEach(d => results.push({ id: d.id, ...d.data() }));
  }
  return results;
}

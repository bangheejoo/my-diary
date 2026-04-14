/**
 * 친구 서비스 - 친구 요청/수락/삭제 + 알림
 */
import { db } from './firebase.js';
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
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/** 친구 관계 ID (두 uid 정렬 후 합산) */
function friendshipId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

/** 친구 요청 전송 */
export async function sendFriendRequest(fromUid, toUid) {
  const fid = friendshipId(fromUid, toUid);

  // 이미 관계가 있는지 확인
  const existingSnap = await getDoc(doc(db, 'friendships', fid));
  if (existingSnap.exists()) {
    const status = existingSnap.data().status;
    if (status === 'accepted') throw new Error('이미 친구예요');
    if (status === 'pending') throw new Error('이미 친구 요청을 보냈어요');
  }

  const batch = writeBatch(db);

  // 친구 관계 생성
  batch.set(doc(db, 'friendships', fid), {
    users: [fromUid, toUid].sort(),
    status: 'pending',
    requesterId: fromUid,
    receiverId: toUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 알림 생성
  const notifRef = doc(collection(db, 'notifications'));
  batch.set(notifRef, {
    toUid,
    fromUid,
    type: 'friendRequest',
    friendshipId: fid,
    read: false,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

/** 친구 요청 수락 */
export async function acceptFriendRequest(friendshipId_, fromUid) {
  const batch = writeBatch(db);
  const currentUid = (await import('../auth/authState.js')).getCurrentUser()?.uid;

  batch.update(doc(db, 'friendships', friendshipId_), {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });

  // 요청자에게 수락 알림
  const notifRef = doc(collection(db, 'notifications'));
  batch.set(notifRef, {
    toUid: fromUid,
    fromUid: currentUid,
    type: 'friendAccepted',
    friendshipId: friendshipId_,
    read: false,
    createdAt: serverTimestamp(),
  });

  // 기존 요청 알림 읽음 처리
  const notifsQ = query(
    collection(db, 'notifications'),
    where('friendshipId', '==', friendshipId_),
    where('type', '==', 'friendRequest'),
    where('toUid', '==', currentUid)
  );
  const notifSnap = await getDocs(notifsQ);
  notifSnap.docs.forEach(d => batch.update(d.ref, { read: true }));

  await batch.commit();
}

/** 친구 요청 거절 */
export async function rejectFriendRequest(friendshipId_, currentUid) {
  const batch = writeBatch(db);

  batch.delete(doc(db, 'friendships', friendshipId_));

  // 관련 알림 읽음 처리
  const notifsQ = query(
    collection(db, 'notifications'),
    where('friendshipId', '==', friendshipId_),
    where('toUid', '==', currentUid)
  );
  const notifSnap = await getDocs(notifsQ);
  notifSnap.docs.forEach(d => batch.update(d.ref, { read: true }));

  await batch.commit();
}

/** 친구 삭제 (양방향) */
export async function removeFriend(uid1, uid2) {
  const fid = friendshipId(uid1, uid2);
  await deleteDoc(doc(db, 'friendships', fid));
}

/** 내 친구 목록 (accepted) */
export async function getMyFriends(uid) {
  const q = query(
    collection(db, 'friendships'),
    where('users', 'array-contains', uid),
    where('status', '==', 'accepted')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    const friendUid = data.users.find(u => u !== uid);
    return { friendshipId: d.id, friendUid, ...data };
  });
}

/** 내 알림 목록 (최신순 - 클라이언트 정렬) */
export async function getMyNotifications(uid) {
  const q = query(
    collection(db, 'notifications'),
    where('toUid', '==', uid)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
}

/** 알림 읽음 처리 */
export async function markNotificationRead(notifId) {
  await updateDoc(doc(db, 'notifications', notifId), { read: true });
}

/** 두 유저 간 친구 상태 확인 */
export async function getFriendshipStatus(uid1, uid2) {
  const fid = friendshipId(uid1, uid2);
  const snap = await getDoc(doc(db, 'friendships', fid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

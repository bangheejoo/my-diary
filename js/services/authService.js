/**
 * 인증 서비스 - Firebase Authentication + Firestore 유저 프로필
 */
import { auth, db } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  collection,
  where,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/**
 * 닉네임 중복 체크
 * - nicknames/{nickname} 문서를 읽음 (비로그인 상태에서도 동작)
 * - excludeUid: 본인 닉네임은 중복으로 보지 않음 (닉네임 변경 시)
 */
export async function isNicknameTaken(nickname, excludeUid = null) {
  const snap = await getDoc(doc(db, 'nicknames', nickname));
  if (!snap.exists()) return false;
  if (excludeUid && snap.data().uid === excludeUid) return false;
  return true;
}

/** 회원가입 */
export async function signUp({ email, password, nickname, phone, birthdate }) {
  // 1. 닉네임 중복 체크 (비로그인 상태에서도 가능)
  const nickExists = await isNicknameTaken(nickname);
  if (nickExists) throw new Error('이미 사용 중인 닉네임이예요');

  // 2. Firebase Auth 계정 생성 (이 시점부터 인증됨)
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  // 3. users + nicknames 동시 저장
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', uid), {
    email,
    nickname,
    phone,
    birthdate,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, 'nicknames', nickname), { uid });
  await batch.commit();

  return cred.user;
}

/** 로그인 */
export async function logIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/** 로그아웃 */
export async function logOut() {
  await signOut(auth);
}

/** 비밀번호 재설정 이메일 */
export async function sendPasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}

/** 유저 프로필 조회 */
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() };
}

/**
 * 닉네임 변경
 * - 기존 nicknames/{oldNickname} 삭제 후 nicknames/{newNickname} 생성
 */
export async function updateNickname(uid, newNickname) {
  const taken = await isNicknameTaken(newNickname, uid);
  if (taken) throw new Error('이미 사용 중인 닉네임이예요');

  // 기존 닉네임 조회
  const userSnap = await getDoc(doc(db, 'users', uid));
  const oldNickname = userSnap.data()?.nickname;

  const batch = writeBatch(db);
  // 기존 닉네임 문서 삭제
  if (oldNickname) batch.delete(doc(db, 'nicknames', oldNickname));
  // 새 닉네임 문서 생성
  batch.set(doc(db, 'nicknames', newNickname), { uid });
  // users 문서 업데이트
  batch.update(doc(db, 'users', uid), { nickname: newNickname });
  await batch.commit();
}

/** 비밀번호 변경 (재인증 필요) */
export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
}

/** 이메일 또는 닉네임으로 사용자 검색 (친구 추가용, 로그인 상태에서만 호출) */
export async function searchUser(keyword) {
  const results = [];

  // 이메일 검색
  const emailQ = query(collection(db, 'users'), where('email', '==', keyword));
  const emailSnap = await getDocs(emailQ);
  emailSnap.forEach(d => results.push({ uid: d.id, ...d.data() }));

  // 닉네임 검색 (nicknames 컬렉션에서 uid 찾은 뒤 users 조회)
  const nickSnap = await getDoc(doc(db, 'nicknames', keyword));
  if (nickSnap.exists()) {
    const { uid } = nickSnap.data();
    if (!results.find(r => r.uid === uid)) {
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (userSnap.exists()) results.push({ uid, ...userSnap.data() });
    }
  }

  return results;
}

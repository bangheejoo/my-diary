import { auth, db } from './firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs,
  limit,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'

export interface UserProfile {
  uid: string
  email: string
  nickname: string
  phone: string
  birthdate: string
  photoUrl?: string | null
}

export async function isNicknameTaken(nickname: string, excludeUid: string | null = null): Promise<boolean> {
  const snap = await getDoc(doc(db, 'nicknames', nickname))
  if (!snap.exists()) return false
  if (excludeUid && snap.data().uid === excludeUid) return false
  return true
}

export async function signUp({
  email,
  password,
  nickname,
  phone,
  birthdate,
}: {
  email: string
  password: string
  nickname: string
  phone: string
  birthdate: string
}) {
  const nickExists = await isNicknameTaken(nickname)
  if (nickExists) throw new Error('이미 사용 중인 닉네임이예요')

  const cred = await createUserWithEmailAndPassword(auth, email, password)
  const uid = cred.user.uid

  const batch = writeBatch(db)
  batch.set(doc(db, 'users', uid), {
    email,
    nickname,
    phone,
    birthdate,
    createdAt: serverTimestamp(),
  })
  batch.set(doc(db, 'nicknames', nickname), { uid })
  await batch.commit()

  return cred.user
}

export async function logIn(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

export async function logOut() {
  await signOut(auth)
}

export async function sendPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email)
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return { uid, ...snap.data() } as UserProfile
}

export async function updateNickname(uid: string, newNickname: string) {
  const taken = await isNicknameTaken(newNickname, uid)
  if (taken) throw new Error('이미 사용 중인 닉네임이예요')

  const userSnap = await getDoc(doc(db, 'users', uid))
  const oldNickname = userSnap.data()?.nickname

  const batch = writeBatch(db)
  if (oldNickname) batch.delete(doc(db, 'nicknames', oldNickname))
  batch.set(doc(db, 'nicknames', newNickname), { uid })
  batch.update(doc(db, 'users', uid), { nickname: newNickname })
  await batch.commit()
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error('로그인이 필요해요')
  const cred = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, cred)
  await updatePassword(user, newPassword)
}

export async function updateProfilePhoto(uid: string, photoUrl: string) {
  await updateDoc(doc(db, 'users', uid), { photoUrl })
}

export async function searchUser(keyword: string): Promise<UserProfile[]> {
  if (!keyword.trim()) return []
  const end = keyword + '\uf8ff'
  const map = new Map<string, UserProfile>()

  const [emailSnap, nickSnap] = await Promise.all([
    getDocs(query(
      collection(db, 'users'),
      where('email', '>=', keyword),
      where('email', '<=', end),
      limit(20),
    )),
    getDocs(query(
      collection(db, 'users'),
      where('nickname', '>=', keyword),
      where('nickname', '<=', end),
      limit(20),
    )),
  ])

  emailSnap.forEach(d => map.set(d.id, { uid: d.id, ...d.data() } as UserProfile))
  nickSnap.forEach(d => { if (!map.has(d.id)) map.set(d.id, { uid: d.id, ...d.data() } as UserProfile) })

  return [...map.values()]
}

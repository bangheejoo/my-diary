import { storage } from './firebase'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

const MAX_SIZE = 5 * 1024 * 1024
const QUALITY_STEPS = [0.75, 0.6]

function compressImage(file: File, quality: number, maxWidth = 1920): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => {
          if (!blob) return reject(new Error('압축 실패'))
          resolve(new File([blob], file.name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => reject(new Error('이미지 로드 실패'))
    img.src = url
  })
}

export async function uploadImage(
  file: File,
  uid: string
): Promise<{ url: string; storagePath: string }> {
  if (!file) throw new Error('파일이 없어요')

  let target = file

  if (target.size > MAX_SIZE) {
    target = await compressImage(file, QUALITY_STEPS[0])
  }
  if (target.size > MAX_SIZE) {
    target = await compressImage(target, QUALITY_STEPS[1])
  }
  if (target.size > MAX_SIZE) {
    throw new Error('이미지 용량이 5MB를 초과해요 더 작은 이미지를 사용해 주세요')
  }

  const storagePath = `posts/${uid}/${Date.now()}_${file.name}`
  const storageRef = ref(storage, storagePath)
  await uploadBytes(storageRef, target)
  const url = await getDownloadURL(storageRef)

  return { url, storagePath }
}

export async function uploadProfilePhoto(
  file: File,
  uid: string
): Promise<{ url: string; storagePath: string }> {
  if (!file) throw new Error('파일이 없어요')

  // 프로필 사진은 512px / 최대 2MB 로 압축
  const MAX_PROFILE_SIZE = 2 * 1024 * 1024
  let target = await compressImage(file, 0.8, 512)
  if (target.size > MAX_PROFILE_SIZE) {
    target = await compressImage(target, 0.6, 512)
  }
  if (target.size > MAX_PROFILE_SIZE) {
    throw new Error('이미지 용량이 너무 커요 더 작은 이미지를 사용해 주세요')
  }

  const storagePath = `profiles/${uid}/avatar`
  const storageRef = ref(storage, storagePath)
  await uploadBytes(storageRef, target)
  const url = await getDownloadURL(storageRef)
  return { url, storagePath }
}

export async function deleteImage(storagePath: string) {
  if (!storagePath) return
  try {
    await deleteObject(ref(storage, storagePath))
  } catch (e: unknown) {
    if ((e as { code?: string }).code !== 'storage/object-not-found') throw e
  }
}

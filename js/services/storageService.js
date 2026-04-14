/**
 * Firebase Storage + 이미지 압축 서비스
 */
import { storage } from './firebase.js';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const QUALITY_STEPS = [0.75, 0.6]; // 1차 압축, 2차 압축 품질

/** Canvas를 이용한 이미지 압축 */
function compressImage(file, quality, maxWidth = 1920) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('압축 실패'));
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = url;
  });
}

/**
 * 이미지 업로드 (압축 포함)
 * @returns {{ url: string, storagePath: string }}
 */
export async function uploadImage(file, uid) {
  if (!file) throw new Error('파일이 없어요');

  let target = file;

  // 5MB 이하면 그대로, 초과면 순차 압축
  if (target.size > MAX_SIZE) {
    target = await compressImage(file, QUALITY_STEPS[0]);
  }
  if (target.size > MAX_SIZE) {
    target = await compressImage(target, QUALITY_STEPS[1]);
  }
  if (target.size > MAX_SIZE) {
    throw new Error('이미지 용량이 5MB를 초과해요 더 작은 이미지를 사용해 주세요');
  }

  const storagePath = `posts/${uid}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, target);
  const url = await getDownloadURL(storageRef);

  return { url, storagePath };
}

/** 이미지 삭제 */
export async function deleteImage(storagePath) {
  if (!storagePath) return;
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (e) {
    // 이미 삭제됐거나 없는 경우 무시
    if (e.code !== 'storage/object-not-found') throw e;
  }
}

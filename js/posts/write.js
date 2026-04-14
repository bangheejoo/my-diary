/**
 * 기록 쓰기 / 수정 / 삭제
 * URL: write.html        → 새 기록 작성
 * URL: write.html?id=xxx → 기존 기록 수정
 */
import { requireAuth } from '../auth/authState.js';
import { createPost, updatePost, deletePost, getPost } from '../services/postService.js';
import { uploadImage } from '../services/storageService.js';
import { showError, clearError } from '../utils/validation.js';
import { showToast } from '../utils/toast.js';
import { today, isPastOrToday } from '../utils/formatDate.js';

const user = await requireAuth();
const params  = new URLSearchParams(window.location.search);
const editId  = params.get('id');
const isEdit  = Boolean(editId);

// DOM
const pageTitle      = document.getElementById('pageTitle');
const backBtn        = document.getElementById('backBtn');
const saveBtn        = document.getElementById('saveBtn');
const recordDateEl   = document.getElementById('recordDate');
const contentEl      = document.getElementById('content');
const charCount      = document.getElementById('charCount');
const uploadArea     = document.getElementById('uploadArea');
const imageInput     = document.getElementById('imageInput');
const imagePreview   = document.getElementById('imagePreview');
const previewImg     = document.getElementById('previewImg');
const removeImageBtn = document.getElementById('removeImageBtn');
const imageErr       = document.getElementById('imageErr');
const deleteBtn      = document.getElementById('deleteBtn');
const deleteModal    = document.getElementById('deleteModal');
const confirmDeleteBtn= document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const visibilityBtns = document.querySelectorAll('.visibility-btn');

// 상태
let selectedVisibility = 'private';
let newImageFile       = null;  // 새로 선택한 파일
let existingImageUrl   = null;  // 기존 이미지 URL
let existingStoragePath= null;  // 기존 이미지 Storage 경로
let imageRemoved       = false; // 이미지 삭제 여부

// 저장 버튼 원래 텍스트 (모드에 따라 다름)
const saveBtnLabel = isEdit ? '수정하기' : '기록하기';
saveBtn.textContent = saveBtnLabel;

// 날짜 기본값: 오늘 / 최대값: 오늘
recordDateEl.max = today();
recordDateEl.value = today();

// ── 글자 수 카운터 ─────────────────────────────────────────
const MAX_CHARS = 1000;

function updateCharCount() {
  const len = contentEl.value.length;
  charCount.textContent = `${len} / ${MAX_CHARS}`;
  charCount.style.color = len >= MAX_CHARS ? '#ef4444' : len >= MAX_CHARS * 0.9 ? '#f59e0b' : '';
}

// ── 수정 모드: 기존 기록 로드 ──────────────────────────────
if (isEdit) {
  pageTitle.textContent = '기록 수정하기';
  deleteBtn.classList.remove('hidden');

  try {
    const post = await getPost(editId);
    if (!post || post.uid !== user.uid) {
      showToast('기록을 찾을 수 없어요', 'error');
      setTimeout(goBack, 600);
    } else {
      recordDateEl.value = post.recordDate;
      contentEl.value    = post.content;
      updateCharCount();
      selectedVisibility = post.visibility;

      // 공개범위 버튼 상태
      visibilityBtns.forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.value === selectedVisibility);
      });

      // 기존 이미지
      if (post.imageUrl) {
        existingImageUrl    = post.imageUrl;
        existingStoragePath = post.imageStoragePath;
        previewImg.src      = post.imageUrl;
        uploadArea.classList.add('hidden');
        imagePreview.classList.remove('hidden');
      }
    }
  } catch (err) {
    console.error('[write.js] getPost 실패:', err);
    showToast('기록을 불러오지 못했어요', 'error');
    setTimeout(goBack, 600);
  }
}

contentEl.addEventListener('input', updateCharCount);

// ── 공개범위 선택 ───────────────────────────────────────────
visibilityBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedVisibility = btn.dataset.value;
    visibilityBtns.forEach(b => b.classList.toggle('selected', b === btn));
  });
});

// ── 이미지 업로드 ───────────────────────────────────────────
uploadArea.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  imageErr.textContent = '';
  newImageFile = file;

  const objUrl = URL.createObjectURL(file);
  previewImg.src = objUrl;
  uploadArea.classList.add('hidden');
  imagePreview.classList.remove('hidden');
  imageRemoved = false;
});

removeImageBtn.addEventListener('click', () => {
  newImageFile   = null;
  imageRemoved   = true;
  previewImg.src = '';
  imageInput.value = '';
  imagePreview.classList.add('hidden');
  uploadArea.classList.remove('hidden');
});

// ── 저장 ───────────────────────────────────────────────────
saveBtn.addEventListener('click', async () => {
  imageErr.textContent = '';

  const recordDate = recordDateEl.value;
  const content    = contentEl.value.trim();
  let valid = true;

  if (!recordDate) {
    showError(recordDateEl, '날짜를 선택해 주세요');
    valid = false;
  } else if (!isPastOrToday(recordDate)) {
    showError(recordDateEl, '오늘 이전 날짜만 선택할 수 있어요');
    valid = false;
  }
  if (!content) {
    showError(contentEl, '내용을 입력해 주세요');
    valid = false;
  }
  if (!valid) return;

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner"></span>';

  try {
    let imageUrl      = isEdit && !imageRemoved ? existingImageUrl : null;
    let storagePath   = isEdit && !imageRemoved ? existingStoragePath : null;

    // 새 이미지 업로드
    if (newImageFile) {
      const result = await uploadImage(newImageFile, user.uid);
      imageUrl    = result.url;
      storagePath = result.storagePath;
    }

    if (isEdit) {
      await updatePost(editId, {
        content,
        recordDate,
        visibility: selectedVisibility,
        imageUrl,
        imageStoragePath: storagePath,
        oldImageStoragePath: imageRemoved || newImageFile ? existingStoragePath : null,
      });
      showToast('기록이 수정되었어요', 'success');
    } else {
      await createPost({
        uid: user.uid,
        content,
        recordDate,
        visibility: selectedVisibility,
        imageUrl,
        imageStoragePath: storagePath,
      });
      showToast('기록이 저장되었어요', 'success');
    }

    setTimeout(goBack, 600);
  } catch (err) {
    saveBtn.disabled = false;
    saveBtn.textContent = saveBtnLabel;
    if (err.message?.includes('5MB')) {
      imageErr.textContent = err.message;
    } else {
      showToast(err.message || '저장에 실패했어요', 'error');
    }
  }
});

// ── 삭제 ───────────────────────────────────────────────────
deleteBtn.addEventListener('click', () => {
  deleteModal.classList.remove('hidden');
});

cancelDeleteBtn.addEventListener('click', () => {
  deleteModal.classList.add('hidden');
});

deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) deleteModal.classList.add('hidden');
});

confirmDeleteBtn.addEventListener('click', async () => {
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.innerHTML = '<span class="spinner"></span> 삭제 중...';

  try {
    await deletePost(editId);
    showToast('기록이 삭제되었어요', 'success');
    setTimeout(goBack, 600);
  } catch {
    showToast('삭제에 실패했어요', 'error');
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = '삭제하기';
  }
});

// ── 뒤로가기 ───────────────────────────────────────────────
backBtn.addEventListener('click', goBack);

function goBack() {
  if (document.referrer && document.referrer !== window.location.href) {
    history.back();
  } else {
    window.location.href = 'main.html';
  }
}

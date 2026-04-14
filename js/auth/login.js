import { requireGuest } from './authState.js';
import { logIn } from '../services/authService.js';
import { showError, clearAllErrors, isValidEmail } from '../utils/validation.js';
import { showToast } from '../utils/toast.js';

await requireGuest();

const form     = document.getElementById('loginForm');
const emailEl  = document.getElementById('email');
const pwEl     = document.getElementById('password');
const togglePw = document.getElementById('togglePw');
const loginBtn = document.getElementById('loginBtn');

// 비밀번호 보이기/숨기기
togglePw.addEventListener('click', () => {
  const isText = pwEl.type === 'text';
  pwEl.type = isText ? 'password' : 'text';
  document.getElementById('eyeIcon').innerHTML = isText
    ? `<path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />`
    : `<path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />`;
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAllErrors(form);

  const email = emailEl.value.trim();
  const pw    = pwEl.value;
  let valid = true;

  if (!isValidEmail(email)) {
    showError(emailEl, '올바른 이메일을 입력해 주세요');
    valid = false;
  }
  if (!pw) {
    showError(pwEl, '비밀번호를 입력해 주세요');
    valid = false;
  }
  if (!valid) return;

  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="spinner"></span> 로그인 중...';

  try {
    await logIn(email, pw);
    window.location.href = 'pages/main.html';
  } catch (err) {
    const msg = getErrorMessage(err.code);
    showToast(msg, 'error');
    loginBtn.disabled = false;
    loginBtn.textContent = '로그인';
  }
});

function getErrorMessage(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return '이메일 또는 비밀번호가 올바르지 않아요';
    case 'auth/too-many-requests':
      return '로그인 시도가 너무 많아요 잠시 후 다시 시도해 주세요';
    default:
      return '로그인에 실패했어요 다시 시도해 주세요';
  }
}

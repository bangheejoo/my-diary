import { requireGuest } from './authState.js';
import { signUp, isNicknameTaken } from '../services/authService.js';
import {
  showError, clearError, clearAllErrors,
  isValidEmail, isValidPassword, isValidNickname, isValidPhone, isValidBirthdate
} from '../utils/validation.js';
import { showToast } from '../utils/toast.js';

await requireGuest();

const form        = document.getElementById('signupForm');
const emailEl     = document.getElementById('email');
const nicknameEl  = document.getElementById('nickname');
const checkNickBtn= document.getElementById('checkNickBtn');
const passwordEl  = document.getElementById('password');
const pwConfirmEl = document.getElementById('passwordConfirm');
const phoneEl     = document.getElementById('phone');
const birthdateEl = document.getElementById('birthdate');
const signupBtn   = document.getElementById('signupBtn');

const nickErrMsg = document.getElementById('nickErrMsg');
let nickChecked = false;

function setNickMsg(msg, isSuccess = false) {
  nickErrMsg.textContent = msg;
  nickErrMsg.style.color = isSuccess ? '#16a34a' : '#ef4444';
}

// 닉네임 입력 시 중복확인 상태 초기화
nicknameEl.addEventListener('input', () => {
  nickChecked = false;
  checkNickBtn.textContent = '중복확인';
  nicknameEl.classList.remove('input-error');
  nickErrMsg.textContent = '';
});

// 닉네임 중복확인
checkNickBtn.addEventListener('click', async () => {
  const nick = nicknameEl.value.trim();
  nicknameEl.classList.remove('input-error');
  nickErrMsg.textContent = '';

  if (!isValidNickname(nick)) {
    nicknameEl.classList.add('input-error');
    setNickMsg('닉네임은 2~12자로 입력해 주세요');
    return;
  }

  checkNickBtn.disabled = true;
  checkNickBtn.textContent = '확인 중...';

  try {
    const taken = await isNicknameTaken(nick);
    if (taken) {
      nicknameEl.classList.add('input-error');
      setNickMsg('이미 사용 중인 닉네임이예요');
      nickChecked = false;
      checkNickBtn.textContent = '중복확인';
    } else {
      nicknameEl.classList.remove('input-error');
      setNickMsg('사용 가능한 닉네임이예요', true);
      nickChecked = true;
      checkNickBtn.textContent = '확인완료';
    }
  } catch (err) {
    setNickMsg('확인 중 오류가 발생했어요');
    checkNickBtn.textContent = '중복확인';
  } finally {
    checkNickBtn.disabled = false;
  }
});

// 폼 제출
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAllErrors(form);
  nickErrMsg.style.color = '#ef4444';

  const email     = emailEl.value.trim();
  const nickname  = nicknameEl.value.trim();
  const password  = passwordEl.value;
  const pwConfirm = pwConfirmEl.value;
  const phone     = phoneEl.value.replace(/-/g, '').trim();
  const birthdate = birthdateEl.value;

  let valid = true;

  if (!isValidEmail(email)) {
    showError(emailEl, '올바른 이메일 형식으로 입력해 주세요');
    valid = false;
  }
  if (!isValidNickname(nickname)) {
    nicknameEl.classList.add('input-error');
    setNickMsg('닉네임은 2~12자로 입력해 주세요');
    valid = false;
  } else if (!nickChecked) {
    nicknameEl.classList.add('input-error');
    setNickMsg('닉네임 중복확인을 해주세요');
    valid = false;
  }
  if (!isValidPassword(password)) {
    showError(passwordEl, '비밀번호는 영문+숫자 포함 8자 이상이어야 해요');
    valid = false;
  }
  if (password !== pwConfirm) {
    showError(pwConfirmEl, '비밀번호가 일치하지 않아요');
    valid = false;
  }
  if (!isValidPhone(phone)) {
    showError(phoneEl, '올바른 휴대폰번호를 입력해 주세요 (예: 01012345678)');
    valid = false;
  }
  if (!isValidBirthdate(birthdate)) {
    showError(birthdateEl, '생년월일을 입력해 주세요');
    valid = false;
  }
  if (!valid) return;

  signupBtn.disabled = true;
  signupBtn.innerHTML = '<span class="spinner"></span> 가입 중...';

  try {
    await signUp({ email, password, nickname, phone, birthdate });
    showToast('가입이 완료되었어요!', 'success');
    setTimeout(() => { window.location.href = 'main.html'; }, 800);
  } catch (err) {
    signupBtn.disabled = false;
    signupBtn.textContent = '가입하기';
    const msg = err.message || '가입에 실패했어요';
    if (err.code === 'auth/email-already-in-use') {
      showError(emailEl, '이미 사용 중인 이메일이예요');
    } else {
      showToast(msg, 'error');
    }
  }
});

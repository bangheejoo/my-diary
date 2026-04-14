/**
 * 유효성 검사 유틸리티
 */

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPassword(pw) {
  // 8자 이상, 영문+숫자 포함
  return pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
}

export function isValidNickname(nickname) {
  const t = nickname.trim();
  return t.length >= 2 && t.length <= 12;
}

export function isValidPhone(phone) {
  return /^01[0-9]{8,9}$/.test(phone.replace(/-/g, ''));
}

export function isValidBirthdate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d);
}

/** 인풋에 에러 표시 */
export function showError(inputEl, msg) {
  inputEl.classList.add('input-error');
  let errEl = inputEl.parentElement.querySelector('.err-msg');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.className = 'err-msg';
    inputEl.parentElement.appendChild(errEl);
  }
  errEl.textContent = msg;
}

/** 인풋 에러 제거 */
export function clearError(inputEl) {
  inputEl.classList.remove('input-error');
  const errEl = inputEl.parentElement.querySelector('.err-msg');
  if (errEl) errEl.textContent = '';
}

/** 폼 전체 에러 초기화 */
export function clearAllErrors(formEl) {
  formEl.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  formEl.querySelectorAll('.err-msg').forEach(el => (el.textContent = ''));
}

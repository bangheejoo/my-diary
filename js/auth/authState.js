/**
 * 인증 상태 관리 - 모든 페이지에서 공유
 * 로그인 필요 페이지: requireAuth()
 * 비로그인 전용 페이지: requireGuest()
 */
import { auth } from '../services/firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const PUBLIC_PAGES = ['/', '/index.html', '/pages/signup.html', '/pages/resetPassword.html'];

function isPublicPage() {
  const path = window.location.pathname;
  return PUBLIC_PAGES.some(p => path.endsWith(p) || path === p);
}

/** 로그인 필요 페이지에서 호출 - 미인증 시 로그인으로 리다이렉트 */
export function requireAuth(callback) {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (!user) {
        window.location.href = getRoot() + 'index.html';
        return;
      }
      resolve(user);
      if (callback) callback(user);
    });
  });
}

/** 비로그인 전용 페이지에서 호출 - 인증됐으면 메인으로 리다이렉트 */
export function requireGuest() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (user) {
        window.location.href = getRoot() + 'pages/main.html';
        return;
      }
      resolve();
    });
  });
}

/** 현재 유저 반환 (null 가능) */
export function getCurrentUser() {
  return auth.currentUser;
}

/** 루트 경로 계산 (GitHub Pages 대응) */
export function getRoot() {
  const path = window.location.pathname;
  // pages/ 하위에 있으면 한 단계 위
  if (path.includes('/pages/')) return '../';
  return './';
}

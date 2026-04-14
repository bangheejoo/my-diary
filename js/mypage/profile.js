/**
 * 내 정보 - 프로필 / 닉네임·비밀번호 변경 / 로그아웃 / 친구 관리
 */
import { requireAuth } from '../auth/authState.js';
import { getUserProfile, updateNickname, changePassword, isNicknameTaken, searchUser } from '../services/authService.js';
import { getMyFriends, removeFriend } from '../services/friendService.js';
import { logOut } from '../services/authService.js';
import { showError, clearError, clearAllErrors, isValidNickname, isValidPassword } from '../utils/validation.js';
import { showToast } from '../utils/toast.js';

const user = await requireAuth();

// DOM
const tabProfile  = document.getElementById('tabProfile');
const tabNotif    = document.getElementById('tabNotif');
const tabFriendsBtn= document.getElementById('tabFriends');
const profileTab  = document.getElementById('profileTab');
const notifTab    = document.getElementById('notifTab');
const friendsTab  = document.getElementById('friendsTab');

const avatarInitial   = document.getElementById('avatarInitial');
const profileNickname = document.getElementById('profileNickname');
const profileEmail    = document.getElementById('profileEmail');
const logoutBtn       = document.getElementById('logoutBtn');

const newNicknameEl   = document.getElementById('newNickname');
const checkNewNickBtn = document.getElementById('checkNewNickBtn');
const nickErr         = document.getElementById('nickErr');
const saveNicknameBtn = document.getElementById('saveNicknameBtn');

const currentPwEl  = document.getElementById('currentPw');
const newPwEl      = document.getElementById('newPw');
const newPwConfEl  = document.getElementById('newPwConfirm');
const savePwBtn    = document.getElementById('savePwBtn');

const friendsList = document.getElementById('friendsList');

let nickChecked = false;

// ── 프로필 로드 ─────────────────────────────────────────────
async function loadProfile() {
  const profile = await getUserProfile(user.uid);
  if (!profile) return;
  const nick = profile.nickname || '사용자';
  avatarInitial.textContent = nick[0];
  profileNickname.textContent = nick;
  profileEmail.textContent   = profile.email || user.email || '';
}

loadProfile();

// ── 탭 전환 ─────────────────────────────────────────────────
function showTab(tab) {
  [profileTab, notifTab, friendsTab].forEach(el => el.classList.add('hidden'));
  [tabProfile, tabNotif, tabFriendsBtn].forEach(el => el.classList.remove('active'));
  tab.el.classList.remove('hidden');
  tab.btn.classList.add('active');
  tab.onShow?.();
}

tabProfile.addEventListener('click', () => showTab({ el: profileTab, btn: tabProfile }));
tabNotif.addEventListener('click', () => showTab({ el: notifTab, btn: tabNotif }));
tabFriendsBtn.addEventListener('click', () => showTab({ el: friendsTab, btn: tabFriendsBtn, onShow: loadFriendsList }));

// ── 닉네임 중복확인 ──────────────────────────────────────────
newNicknameEl.addEventListener('input', () => {
  nickChecked = false;
  checkNewNickBtn.textContent = '중복확인';
  nickErr.textContent = '';
  nickErr.style.color = '#ef4444';
});

checkNewNickBtn.addEventListener('click', async () => {
  const nick = newNicknameEl.value.trim();
  nickErr.textContent = '';
  if (!isValidNickname(nick)) {
    nickErr.textContent = '닉네임은 2~12자로 입력해 주세요.';
    return;
  }

  checkNewNickBtn.disabled = true;
  checkNewNickBtn.textContent = '확인 중...';
  try {
    const taken = await isNicknameTaken(nick, user.uid);
    if (taken) {
      nickErr.textContent = '이미 사용 중인 닉네임이예요';
      nickErr.style.color = '#ef4444';
      nickChecked = false;
    } else {
      nickErr.textContent = '사용 가능한 닉네임이예요';
      nickErr.style.color = '#16a34a';
      nickChecked = true;
    }
  } catch {
    showToast('닉네임 확인 중 오류가 발생했어요', 'error');
  } finally {
    checkNewNickBtn.disabled = false;
    checkNewNickBtn.textContent = nickChecked ? '확인완료' : '중복확인';
  }
});

// ── 닉네임 저장 ─────────────────────────────────────────────
saveNicknameBtn.addEventListener('click', async () => {
  const nick = newNicknameEl.value.trim();
  nickErr.style.color = '#ef4444';

  if (!isValidNickname(nick)) {
    nickErr.textContent = '닉네임은 2~12자로 입력해 주세요.';
    return;
  }
  if (!nickChecked) {
    nickErr.textContent = '닉네임 중복확인을 해주세요.';
    return;
  }

  saveNicknameBtn.disabled = true;
  saveNicknameBtn.innerHTML = '<span class="spinner"></span> 저장 중...';
  try {
    await updateNickname(user.uid, nick);
    showToast('닉네임이 변경되었어요', 'success');
    newNicknameEl.value = '';
    nickChecked = false;
    nickErr.textContent = '';
    loadProfile();
  } catch (err) {
    nickErr.textContent = err.message || '닉네임 변경에 실패했어요';
  } finally {
    saveNicknameBtn.disabled = false;
    saveNicknameBtn.textContent = '닉네임 변경경';
  }
});

// ── 비밀번호 변경 ────────────────────────────────────────────
savePwBtn.addEventListener('click', async () => {
  clearAllErrors(document.querySelector('#profileTab'));

  const cur  = currentPwEl.value;
  const nw   = newPwEl.value;
  const conf = newPwConfEl.value;
  let valid  = true;

  if (!cur) { showError(currentPwEl, '현재 비밀번호를 입력해 주세요'); valid = false; }
  if (!isValidPassword(nw)) { showError(newPwEl, '영문+숫자 포함 8자 이상이어야 해요'); valid = false; }
  if (nw !== conf) { showError(newPwConfEl, '비밀번호가 일치하지 않아요'); valid = false; }
  if (!valid) return;

  savePwBtn.disabled = true;
  savePwBtn.innerHTML = '<span class="spinner"></span> 변경 중...';
  try {
    await changePassword(cur, nw);
    showToast('비밀번호가 변경되었어요', 'success');
    currentPwEl.value = '';
    newPwEl.value     = '';
    newPwConfEl.value = '';
  } catch (err) {
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      showError(currentPwEl, '현재 비밀번호가 올바르지 않아요');
    } else {
      showToast(err.message || '비밀번호 변경에 실패했어요', 'error');
    }
  } finally {
    savePwBtn.disabled = false;
    savePwBtn.textContent = '비밀번호 변경';
  }
});

// ── 로그아웃 ─────────────────────────────────────────────────
logoutBtn.addEventListener('click', async () => {
  await logOut();
  window.location.href = '../index.html';
});

// ── 친구 목록 ────────────────────────────────────────────────
async function loadFriendsList() {
  friendsList.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';
  try {
    const raw = await getMyFriends(user.uid);
    if (!raw.length) {
      friendsList.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <p>등록된 친구가 없어요</p>
        </div>`;
      return;
    }

    // 프로필 병렬 로드
    const { getUserProfile: gup } = await import('../services/authService.js');
    const profiles = await Promise.all(raw.map(f => gup(f.friendUid)));

    friendsList.innerHTML = raw.map((f, i) => {
      const nick = profiles[i]?.nickname || '알 수 없음';
      const email = profiles[i]?.email || '';
      return `
        <div class="user-item" data-friendship="${f.friendshipId}" data-friend="${f.friendUid}">
          <div class="user-avatar">${escapeHtml(nick[0])}</div>
          <div class="user-info">
            <p class="user-name">${escapeHtml(nick)}</p>
            <p class="user-email">${escapeHtml(email)}</p>
          </div>
          <button class="btn btn-sm btn-danger remove-friend-btn" data-friendship="${f.friendshipId}" data-friend="${f.friendUid}">삭제</button>
        </div>`;
    }).join('');

    friendsList.querySelectorAll('.remove-friend-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('친구를 삭제할까요? 상대방에게도 삭제돼요')) return;
        btn.disabled = true;
        try {
          await removeFriend(user.uid, btn.dataset.friend);
          showToast('친구가 삭제되었어요', 'success');
          loadFriendsList();
        } catch {
          showToast('친구 삭제에 실패했어요', 'error');
          btn.disabled = false;
        }
      });
    });
  } catch {
    friendsList.innerHTML = '<div class="empty-state"><p>친구 목록을 불러오지 못했어요</p></div>';
  }
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

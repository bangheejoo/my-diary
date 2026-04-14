/**
 * 친구 추가 (검색 + 요청)
 */
import { requireAuth } from '../auth/authState.js';
import { searchUser } from '../services/authService.js';
import { sendFriendRequest, getFriendshipStatus } from '../services/friendService.js';
import { showToast } from '../utils/toast.js';

const user = await requireAuth();

const addFriendBtn    = document.getElementById('addFriendBtn');
const addFriendModal  = document.getElementById('addFriendModal');
const searchInput     = document.getElementById('friendSearchInput');
const searchBtn       = document.getElementById('friendSearchBtn');
const searchResults   = document.getElementById('searchResults');

// 모달 열기/닫기
addFriendBtn.addEventListener('click', () => {
  addFriendModal.classList.remove('hidden');
  searchInput.focus();
});

addFriendModal.addEventListener('click', (e) => {
  if (e.target === addFriendModal) closeModal();
});

function closeModal() {
  addFriendModal.classList.add('hidden');
  searchInput.value = '';
  searchResults.innerHTML = '';
}

// 검색
searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

async function doSearch() {
  const q = searchInput.value.trim();
  if (!q) return;

  searchBtn.disabled = true;
  searchBtn.innerHTML = '<span class="spinner"></span> 검색 중...';
  searchResults.innerHTML = '';

  try {
    const results = await searchUser(q);
    // 본인 제외
    const filtered = results.filter(r => r.uid !== user.uid);

    if (!filtered.length) {
      searchResults.innerHTML = '<p class="text-center text-sm text-muted" style="padding:1rem">검색 결과가 없어요</p>';
      return;
    }

    // 친구 상태 병렬 조회
    const statuses = await Promise.all(filtered.map(r => getFriendshipStatus(user.uid, r.uid)));

    searchResults.innerHTML = filtered.map((r, i) => {
      const status = statuses[i];
      let actionBtn = '';
      if (!status) {
        actionBtn = `<button class="btn btn-sm btn-primary" data-uid="${r.uid}">요청하기</button>`;
      } else if (status.status === 'pending') {
        if (status.requesterId === user.uid) {
          actionBtn = `<button class="btn btn-sm btn-outline" disabled>요청됨</button>`;
        } else {
          actionBtn = `<button class="btn btn-sm btn-primary" data-uid="${r.uid}" data-accept="${status.id}">수락하기</button>`;
        }
      } else {
        actionBtn = `<button class="btn btn-sm btn-outline" disabled>친구</button>`;
      }

      return `
        <div class="user-item">
          <div class="user-avatar">${escapeHtml(r.nickname[0])}</div>
          <div class="user-info">
            <p class="user-name">${escapeHtml(r.nickname)}</p>
            <p class="user-email">${escapeHtml(r.email)}</p>
          </div>
          ${actionBtn}
        </div>`;
    }).join('');

    // 요청 버튼 이벤트
    searchResults.querySelectorAll('button[data-uid]').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await sendFriendRequest(user.uid, btn.dataset.uid);
          btn.textContent = '요청됨';
          btn.classList.replace('btn-primary', 'btn-outline');
          showToast('친구 요청을 보냈어요', 'success');
        } catch (err) {
          showToast(err.message || '요청에 실패했어요', 'error');
          btn.disabled = false;
        }
      });
    });
  } catch {
    showToast('검색 중 오류가 발생했어요', 'error');
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = '검색하기';
  }
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

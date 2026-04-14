/**
 * 내 정보 - 알림 (친구 요청 수락/거절)
 */
import { requireAuth } from '../auth/authState.js';
import { getMyNotifications, acceptFriendRequest, rejectFriendRequest, markNotificationRead } from '../services/friendService.js';
import { getUserProfile } from '../services/authService.js';
import { showToast } from '../utils/toast.js';

const user = await requireAuth();

const notifTab   = document.getElementById('tabNotif');
const notifList  = document.getElementById('notifList');
const notifBadge = document.getElementById('notifBadge');

// 탭 클릭 시 알림 로드
notifTab.addEventListener('click', loadNotifications);

// 초기 뱃지 카운트
async function loadBadge() {
  try {
    const notifs = await getMyNotifications(user.uid);
    const unread = notifs.filter(n => !n.read && n.type === 'friendRequest').length;
    if (unread > 0) {
      notifBadge.textContent = unread;
      notifBadge.classList.remove('hidden');
    } else {
      notifBadge.classList.add('hidden');
    }
  } catch { /* 조용히 실패 */ }
}

async function loadNotifications() {
  notifList.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';
  try {
    const notifs = await getMyNotifications(user.uid);

    if (!notifs.length) {
      notifList.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <p>알림이 없어요</p>
        </div>`;
      notifBadge.classList.add('hidden');
      return;
    }

    // 발신자 프로필 병렬 로드
    const profiles = await Promise.all(notifs.map(n => getUserProfile(n.fromUid)));

    notifList.innerHTML = notifs.map((n, i) => {
      const nick = profiles[i]?.nickname || '알 수 없음';
      let text = '', actions = '';

      if (n.type === 'friendRequest') {
        text = `<strong>${escapeHtml(nick)}</strong>님이 친구 요청을 보냈어요`;
        if (!n.read) {
          actions = `
            <div class="notif-actions">
              <button class="btn btn-sm btn-primary accept-btn" data-id="${n.id}" data-fid="${n.friendshipId}" data-from="${n.fromUid}">수락</button>
              <button class="btn btn-sm btn-outline reject-btn" data-id="${n.id}" data-fid="${n.friendshipId}">거절</button>
            </div>`;
        } else {
          actions = `<p class="text-xs text-muted" style="margin-top:0.25rem">처리 완료</p>`;
        }
      } else if (n.type === 'friendAccepted') {
        text = `<strong>${escapeHtml(nick)}</strong>님이 친구 요청을 수락했어요`;
      }

      const timeText = n.createdAt?.toDate ? formatTime(n.createdAt.toDate()) : '';

      return `
        <div class="notif-item ${!n.read ? 'unread' : ''}">
          <div class="user-avatar" style="width:2.25rem;height:2.25rem;font-size:0.85rem;flex-shrink:0">${escapeHtml(nick[0])}</div>
          <div class="notif-item-content">
            <p class="notif-item-text">${text}</p>
            <p class="notif-item-time">${timeText}</p>
            ${actions}
          </div>
        </div>`;
    }).join('');

    // 수락 버튼
    notifList.querySelectorAll('.accept-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span>';
        try {
          await acceptFriendRequest(btn.dataset.fid, btn.dataset.from);
          showToast('친구 요청을 수락했어요', 'success');
          loadNotifications();
          loadBadge();
        } catch (err) {
          showToast(err.message || '수락에 실패했어요', 'error');
          btn.disabled = false;
          btn.textContent = '수락';
        }
      });
    });

    // 거절 버튼
    notifList.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await rejectFriendRequest(btn.dataset.fid, user.uid);
          showToast('친구 요청을 거절했어요');
          loadNotifications();
          loadBadge();
        } catch {
          showToast('거절에 실패했어요', 'error');
          btn.disabled = false;
        }
      });
    });

    notifBadge.classList.add('hidden');
  } catch {
    notifList.innerHTML = '<div class="empty-state"><p>알림을 불러오지 못했어요</p></div>';
  }
}

function formatTime(date) {
  const now  = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60)   return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

loadBadge();

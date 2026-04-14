/**
 * 메인 - 최신순 피드
 */
import { requireAuth } from '../auth/authState.js';
import { getMyPosts } from '../services/postService.js';
import { getUserProfile } from '../services/authService.js';
import { toKoreanDate } from '../utils/formatDate.js';

const user = await requireAuth();
const profile = await getUserProfile(user.uid);

const tabList     = document.getElementById('tabList');
const tabCalendar = document.getElementById('tabCalendar');
const listView    = document.getElementById('listView');
const calendarView= document.getElementById('calendarView');
const postList    = document.getElementById('postList');
const fabBtn      = document.getElementById('fabBtn');

// FAB → 기록 작성
fabBtn.addEventListener('click', () => {
  window.location.href = 'write.html';
});

// 탭 전환
tabList.addEventListener('click', () => {
  tabList.classList.add('active');
  tabCalendar.classList.remove('active');
  listView.classList.remove('hidden');
  calendarView.classList.add('hidden');
});

tabCalendar.addEventListener('click', () => {
  tabCalendar.classList.add('active');
  tabList.classList.remove('active');
  calendarView.classList.remove('hidden');
  listView.classList.add('hidden');
});

// 기록 목록 로드
async function loadPosts() {
  postList.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';
  try {
    const posts = await getMyPosts(user.uid);
    renderPosts(posts, postList);
  } catch (err) {
    postList.innerHTML = '<div class="empty-state"><p>기록을 불러오지 못했어요</p></div>';
  }
}

export function renderPosts(posts, container) {
  if (!posts.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
        <p>아직 기록이 없어요<br>나만의 하루를 기록해 보세요</p>
      </div>`;
    return;
  }

  container.innerHTML = posts.map(p => `
    <div class="post-card" data-id="${p.id}">
      <div class="post-card-header">
        <span class="post-date">${toKoreanDate(p.recordDate)}</span>
        <span class="badge ${p.visibility === 'private' ? 'badge-gray' : 'badge-mint'}">
          ${p.visibility === 'private' ? '나만보기' : '친구공개'}
        </span>
      </div>
      <p class="post-content">${escapeHtml(p.content)}</p>
      ${p.imageUrl ? `<div class="post-image"><img src="${p.imageUrl}" alt="기록 이미지" loading="lazy" /></div>` : ''}
    </div>
  `).join('');

  // 카드 클릭 → 수정 페이지
  container.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `write.html?id=${card.dataset.id}`;
    });
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

loadPosts();

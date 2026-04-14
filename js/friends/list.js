/**
 * 친구 피드 + 캘린더
 */
import { requireAuth } from '../auth/authState.js';
import { getMyFriends } from '../services/friendService.js';
import { getUserProfile } from '../services/authService.js';
import { getFriendsPosts, getFriendPostsByUid, getFriendPostsByDate } from '../services/postService.js';
import { toKoreanDate, today, firstDayOfMonth, lastDateOfMonth } from '../utils/formatDate.js';
import { showToast } from '../utils/toast.js';

const user = await requireAuth();

// DOM
const tabFeed         = document.getElementById('tabFeed');
const tabCalendar     = document.getElementById('tabCalendar');
const feedView        = document.getElementById('feedView');
const friendCalView   = document.getElementById('friendCalendarView');
const friendPostList  = document.getElementById('friendPostList');
const friendFilter    = document.getElementById('friendFilter');
const calendarGrid    = document.getElementById('calendarGrid');
const calendarTitle   = document.getElementById('calendarTitle');
const prevMonthBtn    = document.getElementById('prevMonth');
const nextMonthBtn    = document.getElementById('nextMonth');
const calendarPosts   = document.getElementById('calendarPosts');

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const todayStr = today();

let friends      = [];   // { friendUid, nickname, ... }
let friendUids   = [];
let selectedUid  = 'all';
let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let postDates    = new Set();
let selectedDate = null;

// 친구 목록 + 필터 로드
async function loadFriends() {
  try {
    const raw = await getMyFriends(user.uid);
    // 각 친구 프로필 병렬 로드
    const profiles = await Promise.all(raw.map(f => getUserProfile(f.friendUid)));
    friends = raw.map((f, i) => ({ ...f, nickname: profiles[i]?.nickname || '알 수 없음' }));
    friendUids = friends.map(f => f.friendUid);

    renderFriendFilter();
    loadFeed();
  } catch {
    showToast('친구 목록을 불러오지 못했어요', 'error');
  }
}

function renderFriendFilter() {
  const allBtn = `<button class="badge ${selectedUid === 'all' ? 'badge-pink' : 'badge-gray'}" style="cursor:pointer;padding:0.35rem 0.85rem;font-size:0.8rem" data-uid="all">전체 친구</button>`;
  const friendBtns = friends.map(f =>
    `<button class="badge ${selectedUid === f.friendUid ? 'badge-pink' : 'badge-gray'}" style="cursor:pointer;padding:0.35rem 0.85rem;font-size:0.8rem" data-uid="${f.friendUid}">${escapeHtml(f.nickname)}</button>`
  ).join('');
  friendFilter.innerHTML = allBtn + friendBtns;

  friendFilter.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedUid = btn.dataset.uid;
      renderFriendFilter();
      if (!feedView.classList.contains('hidden')) loadFeed();
      else loadCalendarDates();
    });
  });
}

// 피드 로드
async function loadFeed() {
  friendPostList.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';
  if (!friendUids.length) {
    renderEmpty(friendPostList, '친구를 추가하면 친구의 기록을 볼 수 있어요');
    return;
  }

  try {
    let posts;
    if (selectedUid === 'all') {
      posts = await getFriendsPosts(friendUids);
    } else {
      posts = await getFriendPostsByUid(selectedUid);
    }
    renderFriendPosts(posts, friendPostList);
  } catch {
    friendPostList.innerHTML = '<div class="empty-state"><p>기록을 불러오지 못했어요</p></div>';
  }
}

function renderFriendPosts(posts, container) {
  if (!posts.length) {
    renderEmpty(container, '친구의 기록이 없어요');
    return;
  }

  container.innerHTML = posts.map(p => {
    const friend = friends.find(f => f.friendUid === p.uid);
    const name = friend?.nickname || '알 수 없음';
    return `
      <div class="post-card">
        <div class="post-card-header">
          <div style="display:flex;align-items:center;gap:0.5rem">
            <div class="user-avatar" style="width:1.75rem;height:1.75rem;font-size:0.75rem">${escapeHtml(name[0])}</div>
            <span style="font-size:0.85rem;font-weight:600">${escapeHtml(name)}</span>
          </div>
          <span class="post-date">${toKoreanDate(p.recordDate)}</span>
        </div>
        <p class="post-content">${escapeHtml(p.content)}</p>
        ${p.imageUrl ? `<div class="post-image"><img src="${p.imageUrl}" alt="기록 이미지" loading="lazy" /></div>` : ''}
      </div>`;
  }).join('');
}

function renderEmpty(container, msg) {
  container.innerHTML = `
    <div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
      <p>${msg}</p>
    </div>`;
}

// 탭 전환
tabFeed.addEventListener('click', () => {
  tabFeed.classList.add('active');
  tabCalendar.classList.remove('active');
  feedView.classList.remove('hidden');
  friendCalView.classList.add('hidden');
  loadFeed();
});

tabCalendar.addEventListener('click', () => {
  tabCalendar.classList.add('active');
  tabFeed.classList.remove('active');
  friendCalView.classList.remove('hidden');
  feedView.classList.add('hidden');
  loadCalendarDates();
});

// 캘린더
async function loadCalendarDates() {
  if (!friendUids.length) { renderCalendar(); return; }

  const uids = selectedUid === 'all' ? friendUids : [selectedUid];
  const posts = await getFriendsPosts(uids);
  postDates = new Set(posts.map(p => p.recordDate));
  renderCalendar();
}

function renderCalendar() {
  const y = currentYear, m = currentMonth;
  calendarTitle.textContent = `${y}년 ${m + 1}월`;

  const firstDay = firstDayOfMonth(y, m);
  const lastDate = lastDateOfMonth(y, m);

  let html = DAY_NAMES.map(d => `<div class="calendar-day-name">${d}</div>`).join('');
  for (let i = 0; i < firstDay; i++) html += `<div class="calendar-day empty"></div>`;

  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday    = dateStr === todayStr;
    const isSelected = dateStr === selectedDate;
    const hasPost    = postDates.has(dateStr);
    const isFuture   = dateStr > todayStr;

    let cls = 'calendar-day';
    if (isToday)    cls += ' today';
    if (isSelected) cls += ' selected';
    if (hasPost)    cls += ' has-post';
    if (isFuture)   cls += ' empty';

    html += `<div class="${cls}" data-date="${dateStr}">${d}</div>`;
  }

  calendarGrid.innerHTML = html;

  calendarGrid.querySelectorAll('.calendar-day:not(.empty)').forEach(el => {
    el.addEventListener('click', () => {
      const date = el.dataset.date;
      if (!date || date > todayStr) return;
      selectedDate = date;
      renderCalendar();
      loadPostsForDate(date);
    });
  });
}

async function loadPostsForDate(dateStr) {
  calendarPosts.innerHTML = `<div class="section-header">${toKoreanDate(dateStr)}의 친구 기록</div><div class="loading-screen" style="min-height:6rem"><div class="spinner"></div></div>`;

  const uids = selectedUid === 'all' ? friendUids : [selectedUid];
  const posts = await getFriendPostsByDate(uids, dateStr);

  calendarPosts.innerHTML = `<div class="section-header">${toKoreanDate(dateStr)}의 친구 기록</div>`;
  const container = document.createElement('div');
  renderFriendPosts(posts, container);
  calendarPosts.appendChild(container);
}

prevMonthBtn.addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  selectedDate = null;
  calendarPosts.innerHTML = '';
  loadCalendarDates();
});

nextMonthBtn.addEventListener('click', () => {
  const now = new Date();
  if (currentYear > now.getFullYear() || (currentYear === now.getFullYear() && currentMonth >= now.getMonth())) return;
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  selectedDate = null;
  calendarPosts.innerHTML = '';
  loadCalendarDates();
});

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

loadFriends();

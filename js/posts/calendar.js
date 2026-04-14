/**
 * 캘린더 뷰 (메인 / 친구 공통 사용)
 */
import { requireAuth } from '../auth/authState.js';
import { getMyPosts, getMyPostsByDate } from '../services/postService.js';
import { today, firstDayOfMonth, lastDateOfMonth, toDateString, toKoreanDate } from '../utils/formatDate.js';
import { renderPosts } from './list.js';

const user = await requireAuth();

const calendarGrid  = document.getElementById('calendarGrid');
const calendarTitle = document.getElementById('calendarTitle');
const prevMonthBtn  = document.getElementById('prevMonth');
const nextMonthBtn  = document.getElementById('nextMonth');
const calendarPosts = document.getElementById('calendarPosts');

if (!calendarGrid) {
  // 이 페이지에 캘린더가 없으면 종료
  throw new Error('no calendar');
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const todayStr = today();
let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-indexed
let postDates    = new Set();
let selectedDate = null;

// 내 기록 날짜 목록 로드
async function loadPostDates() {
  const posts = await getMyPosts(user.uid);
  postDates = new Set(posts.map(p => p.recordDate));
  renderCalendar();
}

function renderCalendar() {
  const y = currentYear;
  const m = currentMonth;

  calendarTitle.textContent = `${y}년 ${m + 1}월`;

  const firstDay  = firstDayOfMonth(y, m);
  const lastDate  = lastDateOfMonth(y, m);

  let html = DAY_NAMES.map(d => `<div class="calendar-day-name">${d}</div>`).join('');

  // 빈 칸 채우기
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-day empty"></div>`;
  }

  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday    = dateStr === todayStr;
    const isSelected = dateStr === selectedDate;
    const hasPost    = postDates.has(dateStr);
    const isFuture   = dateStr > todayStr;

    let cls = 'calendar-day';
    if (isToday)    cls += ' today';
    if (isSelected) cls += ' selected';
    if (hasPost)    cls += ' has-post';
    if (isFuture)   cls += ' empty';

    html += `<div class="${cls}" data-date="${dateStr}" ${isFuture ? '' : 'role="button"'}>${d}</div>`;
  }

  calendarGrid.innerHTML = html;

  // 날짜 클릭
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
  calendarPosts.innerHTML = `
    <div class="section-header">${toKoreanDate(dateStr)}의 기록</div>
    <div class="loading-screen" style="min-height:6rem"><div class="spinner"></div></div>`;

  const posts = await getMyPostsByDate(user.uid, dateStr);
  const container = document.createElement('div');
  renderPosts(posts, container);

  calendarPosts.innerHTML = `<div class="section-header">${toKoreanDate(dateStr)}의 기록</div>`;
  calendarPosts.appendChild(container);
}

// 이전/다음 달
prevMonthBtn.addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  selectedDate = null;
  calendarPosts.innerHTML = '';
  renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
  // 미래 달 이동 제한
  const now = new Date();
  if (currentYear > now.getFullYear() || (currentYear === now.getFullYear() && currentMonth >= now.getMonth())) return;
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  selectedDate = null;
  calendarPosts.innerHTML = '';
  renderCalendar();
});

loadPostDates();

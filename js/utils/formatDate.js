/**
 * 날짜 포맷 유틸리티
 */

/** Date → 'YYYY-MM-DD' */
export function toDateString(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 'YYYY-MM-DD' → '2025년 1월 3일' */
export function toKoreanDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
}

/** 'YYYY-MM-DD' → 'MM/DD' */
export function toShortDate(dateStr) {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${m}/${d}`;
}

/** 오늘 날짜 'YYYY-MM-DD' */
export function today() {
  return toDateString(new Date());
}

/** Firestore Timestamp → 'YYYY-MM-DD' */
export function fromTimestamp(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return toDateString(d);
}

/** 'YYYY-MM-DD' 가 오늘 이전(포함)인지 */
export function isPastOrToday(dateStr) {
  return dateStr <= today();
}

/** 캘린더용: 해당 월의 첫 날 요일(0=일) */
export function firstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

/** 캘린더용: 해당 월의 마지막 날 */
export function lastDateOfMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

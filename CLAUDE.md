# 프로젝트:  나만의 일기장

## 목적
개인용 기록 저장 및 관리 웹서비스

## 기술 스택
- 프론트엔드: HTML, CSS, JS + Tailwind CSS
- 배포: GitHub Pages
- 데이터베이스: firebase

## Firebase 세부 스택
- Firebase Authentication (로그인/회원가입)
- Firestore (DB)
- Firebase Storage (이미지)

## firebase 정보
const firebaseConfig = {
    apiKey: "AIzaSyBV8L1IBl2C0756ow7LLywUnrRVbnPvH9c",
    authDomain: "myself-da51a.firebaseapp.com",
    projectId: "myself-da51a",
    storageBucket: "myself-da51a.firebasestorage.app",
    messagingSenderId: "113820162484",
    appId: "1:113820162484:web:a0825b3b7eee6c7305bae1"
  };

### 디자인 가이드
- 반응형 완벽 지원 (puppeteer MCP 로 반응형 디자인도 문제가 없는지 확인)
- https://tx.shadcn.com/ 스타일로 전체 웹페이지에 일관된 디자인 적용
- 색상은 #F29199, #F2BDC1, #CEF2E8, #F2D7D0, #0D0D0D 적절히 이용

## 구성화면
- 로그인
- 회원가입
- 비밀번호찾기
- 내 정보 (프로필/알림)
- 메인 (최신순/캘린더)
- 친구 (최신순/캘린더)
- 기록 쓰기
- 기록 수정하기

## 핵심 기능
- 로그인 기능 (아이디=이메일/비밀번호)
  : Firebase Authentication 사용
- 회원가입 기능 (아이디=이메일/닉네임/비밀번호/휴대폰번호/생년월일)
  : 닉네임은 중복체크
  : 휴대폰번호와 생년월일은 단순 프로필 정보
- 로그인 전에 비밀번호찾기 기능
  : Firebase 기본 기능 사용 -> 비밀번호 재설정 이메일
- 내 정보에서 닉네임/비밀번호 변경 기능
  : 로그인한 상태에서만 가능
  : 현재 비밀번호 한번 더 확인후 변경 가능
- 메인은 2가지 형태 
  1. 최신 날짜별로 기록한 글과 이미지 표시
  2. 캘린더 표시되며 날짜 선택하면 해당 날짜의 기록한 글과 이미지 표시
- 이미지 업로드 (최대 5MB)
  : 이미지는 게시글당 1개만 가능
  : 기본적으론 1번 압축 + 품질 조절 (0.7~0.8) 후 업로드
  : 최대 2번 압축 진행해도 5MB 초과시 용량 초과 메시지 표시
  : Firebase Storage 저장
- 친구등록 기능 
  : 아이디나 닉네임으로 가입된 사용자를 검색하여 친구등록이 가능
  : 양방향 (서로 요청/수락을 해야 등록 완료)
  : 요청/수락은 내 정보-알림에 표시
  : 친구가 된 이후에도 삭제가 가능 - 삭제는 한명만 해도 서로에게 삭제됨
- 업로드한 기록은 나만보기, 친구공개 범위로 등록할 수 있음
- 업로드한 기록을 친구들은 친구 메뉴에서 볼 수 있음
  : 친구 메뉴에 가면 내 친구들의 기록들 중 친구공개로 되어있는 글들을 볼 수 있음
  : 친구 메뉴에서도 최신날짜별로 나오는 화면과 캘린더에서 특정 날짜 선택해서 볼 수 있는 화면 2가지 형태 존재
  : 기본적으로는 내 모든 친구들의 기록이 표시되지만만 특정 친구를 선택하면 그 친구의 기록들만 표시됨
- 로그인 안 된 상태에선 로그인,회원가입,비밀번호찾기 화면만 접근 가능
- 기록 쓰기/수정/삭제 가능 (당연히 내가 쓴 기록만)
- 기록을 쓸때 기록할 날짜를 지정
  : 미래의 날짜는 안되고 오늘부터 과거의 날짜만 선택 가능
- 로그아웃 기능

## 구조
├── index.html  (로그인)
├── pages/
│   ├── signup.html
│   ├── resetPassword.html
│   ├── main.html
│   ├── write.html  (쓰기/수정)
│   ├── friends.html
│   └── mypage.html
│
├── css/
│   └── style.css
│
├── js/
│   ├── auth/
│   │   ├── login.js
│   │   ├── signup.js
│   │   └── authState.js
│   │
│   ├── mypage/
│   │   ├── profile.js
│   │   └── notification.js
│   │
│   ├── posts/
│   │   ├── write.js (쓰기/수정/삭제)
│   │   ├── list.js
│   │   └── calendar.js
│   │
│   ├── friends/
│   │   ├── add.js
│   │   └── list.js
│   │
│   ├── services/
│   │   ├── firebase.js
│   │   ├── authService.js
│   │   ├── postService.js
│   │   ├── storageService.js
│   │   └── friendService.js
│   │
│   └── utils/
│       ├── formatDate.js
│       └── validation.js
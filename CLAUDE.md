# 프로젝트:  나만의 일기장

## 목적
개인용 기록 저장 및 관리 웹서비스

## 기술 스택
- 프론트엔드: React, TypeScript, Tailwind CSS
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
- 내정보 (프로필/알림함/친구관리)
- 메인 (최신순/캘린더)
- 친구 (최신순/캘린더)
- 기록 쓰기/수정하기
- 친구추가 (검색팝업)
- 설정

## 핵심 기능
- 로그인 기능 (아이디=이메일/비밀번호)
  : Firebase Authentication 사용
- 회원가입 기능 (아이디=이메일/닉네임/비밀번호/휴대폰번호/생년월일)
  : 닉네임은 중복체크
  : 휴대폰번호와 생년월일은 단순 프로필 정보 -> 내정보 화면에서 확인가능
- 로그인 전에 비밀번호찾기 기능
  : Firebase 기본 기능 사용 -> 비밀번호 재설정 이메일
- 내정보에서 닉네임/비밀번호 변경 기능
  : 로그인한 상태에서만 가능
  : 현재 비밀번호 한번 더 확인후 변경 가능
- 메인은 2가지 형태 
  1. 최신 날짜순으로 기록한 글과 이미지 표시
  2. 캘린더 표시되며 날짜 선택하면 해당 날짜의 기록한 글과 이미지 표시
  : 게시글들은 무한스크롤 형태로 보여지며 skeleton UI 사용
  : 이미지는 중앙에서부터 1:1비율 표시
- 이미지 업로드 (최대 5MB)
  : 이미지는 게시글당 1개만 가능
  : 기본적으론 1번 압축 + 품질 조절 (0.7~0.8) 후 업로드
  : 최대 2번 압축 진행해도 5MB 초과시 용량 초과 메시지 표시
  : Firebase Storage 저장
- 친구등록 기능 
  : 아이디나 닉네임으로 가입된 사용자를 검색하여 친구등록이 가능
  : 양방향 (서로 요청/수락을 해야 등록 완료)
  : 요청/수락은 내 정보-알림함에 표시
  : 친구가 된 이후에도 삭제가 가능 - 삭제는 한명만 해도 서로에게 삭제됨
- 업로드한 기록은 나만보기, 친구랑보기 범위로 등록할 수 있음
  : 기록은 날짜별로 최대 3개까지 업로드 가능
- 업로드한 기록을 친구들은 친구 메뉴에서 볼 수 있음
  : 친구 메뉴에 가면 내 친구들의 기록들 중 친구랑보기로 되어있는 글들을 볼 수 있음
  : 친구 메뉴에서도 최신날짜순으로 나오는 화면과 캘린더에서 특정 날짜 선택해서 볼 수 있는 화면 2가지 형태 존재
  : 기본적으로는 내 모든 친구들의 기록이 표시되지만 특정 친구를 선택하면 그 친구의 기록들만 표시됨
- 비로그인 상태에선 로그인,회원가입,비밀번호찾기 화면만 접근 가능
- 기록 쓰기/수정/삭제 가능 (당연히 내가 쓴 기록만)
- 기록 작성 시 기록할 날짜를 지정
  : 미래의 날짜는 불가, 오늘부터 과거의 날짜만 선택 가능
- 게시글 댓글달기 기능 (댓글 100자 제한)
  : 댓글 삭제 가능 (수정은 불가)
  : 댓글이 달리면 알림함에 표시
  : 한 게시글에 댓글 갯수는 제한 없음
- 게시글 이모지 반응하기 기능
  : 좋아요/싫어요/슬퍼요/놀라워요 .... 같은 간단한 이모지로 반응 기록 가능
  : 반응이 달리면 알림함에 표시
  : 한 게시글에 이모지 반응은 사용자당 1번 가능
- 프로필 사진 설정 기능
  : 내정보 화면에서 프로필 사진 설정 가능
  : 사진은 중앙에서부터 1:1비율 크롭하여 보여줌
  : 프로필 사진 선택하면 크게 확대해서 볼 수 있음
- 로그아웃 기능

## 구조
├── index.html                      (Vite 진입점)
├── firestore.rules                 (Firestore 보안 규칙)
├── firestore.indexes.json
├── storage.rules                   (Storage 보안 규칙)
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
│
├── assets/
│   ├── index.css                   (전역 스타일 - Tailwind + 커스텀)
│   └── font/                       (GmarketSans, Cafe24Ssurround)
│
└── src/
    ├── main.tsx                    (앱 진입점)
    ├── App.tsx                     (라우터 설정)
    │
    ├── context/
    │   └── AuthContext.tsx         (Firebase Auth 전역 상태)
    │
    ├── hooks/
    │   └── usePullToRefresh.ts
    │
    ├── components/
    │   ├── BottomNav.tsx           (하단 네비게이션)
    │   ├── CalendarView.tsx        (캘린더 공통 컴포넌트)
    │   ├── CommentSection.tsx      (댓글 목록/입력)
    │   ├── GuestRoute.tsx          (비로그인 전용 라우트)
    │   ├── PostCard.tsx            (게시글 카드)
    │   ├── PrivateRoute.tsx        (로그인 전용 라우트)
    │   └── ReactionBar.tsx         (이모지 반응)
    │
    ├── pages/
    │   ├── auth/
    │   │   ├── LoginPage.tsx
    │   │   ├── SignupPage.tsx
    │   │   └── ResetPasswordPage.tsx
    │   ├── main/
    │   │   └── MainPage.tsx        (내 기록 목록 - 최신순/캘린더)
    │   ├── friends/
    │   │   └── FriendsPage.tsx     (친구 기록 피드 - 최신순/캘린더)
    │   ├── write/
    │   │   └── WritePage.tsx       (기록 쓰기/수정/삭제)
    │   └── mypage/
    │       └── MyPage.tsx          (내 정보/알림/친구관리)
    │
    ├── services/
    │   ├── firebase.ts             (Firebase 초기화)
    │   ├── authService.ts          (인증 / 유저 프로필)
    │   ├── postService.ts          (게시글 CRUD)
    │   ├── storageService.ts       (이미지 업로드)
    │   ├── friendService.ts        (친구 요청/수락/삭제)
    │   ├── commentService.ts       (댓글 CRUD)
    │   └── reactionService.ts      (이모지 반응)
    │
    └── utils/
        ├── formatDate.ts
        ├── toast.ts
        └── validation.ts
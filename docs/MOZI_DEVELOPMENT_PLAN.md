# MOZI 기존 프로젝트 분석 및 개발 계획

> Phase 0 코드 분석 보고서  
> 분석 기준일: 2026-11-04  
> 분석 범위: `frontend`, `backend`, `docs`, 환경변수 이름, 마이그레이션과 기존 테스트  
> 주의: 이번 단계에서는 기능 코드를 수정하지 않았으며 이 문서만 추가했다.

## 0. 핵심 결론

MOZI는 React와 FastAPI 기반의 동작 가능한 MVP다. 회원가입·로그인, 하루 한 번 일기 작성, 16종 감정 분석 형식, 캐릭터 자동 저장, 달력, 도감, 감정 방, 공유 링크와 가구 상점까지 연결되어 있다. 기존 자동 테스트도 모두 통과한다.

가장 큰 구조적 문제는 **캐릭터 시스템이 두 갈래로 분리되어 있다는 점**이다.

- 실제 서비스 화면은 `CharacterSprite` → `PixelMonster` → 정적 PNG 레이어를 사용한다.
- 개발용 `/prototype/characters/pixel` 화면은 64×64 Canvas 렌더러, 10종 실루엣, 6단계 팔레트, 5단계 표정과 감정 이펙트를 사용한다.
- 백엔드가 실제 저장하는 몸통은 현재 `basic` 하나뿐이다.

따라서 개발용 화면에서 확인한 고품질 캐릭터가 일기·달력·도감·감정 방에 그대로 나타나는 구조가 아니다. 다음 개발의 우선순위는 새 기능 추가보다 **렌더러와 저장 명세를 하나로 통합하고 실제 서비스 흐름에 연결하는 것**이다.

또한 `.env`의 `DATABASE_URL`이 비어 있어 현재 실제 연결 대상은 `backend/mozi.db` SQLite다. Alembic은 `20261102_0007 (head)`까지 적용되어 있다. Supabase PostgreSQL 연결은 코드상 지원하지만 이번 분석에서는 검증되지 않았다.

## 1. 현재 기술 스택

| 영역 | 현재 구성 | 실제 코드 근거 |
| --- | --- | --- |
| 프론트엔드 | React 19.3.1, React DOM 19.3.1 | `frontend/package.json` |
| 라우팅 | React Router DOM 7.18.5 | `frontend/package.json`, `frontend/src/App.tsx` |
| 언어·빌드 | TypeScript 7.0.2, Vite 8.3.5 | `frontend/package.json`, `frontend/tsconfig.app.json` |
| 스타일 | Tailwind CSS 4.3.3 + 전역 CSS | `frontend/package.json`, `frontend/src/index.css` |
| 프론트 테스트 | Vitest 5.0.5, Testing Library, jsdom | `frontend/package.json`, `frontend/vitest.config.ts` |
| 프론트 정적 검사 | TypeScript build + Oxlint | `frontend/package.json`, `frontend/.oxlintrc.json` |
| 백엔드 | FastAPI 0.162.0, Uvicorn 0.54.0 | `backend/requirements.txt`, `backend/app/main.py` |
| 데이터 계층 | SQLAlchemy 2.1.6, Alembic 1.20.1 | `backend/requirements.txt`, `backend/app/db` |
| DB 드라이버 | Psycopg 3.3.6, SQLite fallback | `backend/requirements.txt`, `backend/app/core/config.py:26` |
| 인증 암호화 | Argon2 비밀번호 해시, SHA-256 세션 토큰 해시 | `backend/app/services/security.py` |
| AI | OpenAI Python SDK 3.42.1, Responses API 구조화 출력 | `backend/app/services/openai_analysis.py:40` |
| 이미지 처리 | 정적 PNG 레이어 + 개발용 Canvas 픽셀 렌더러 | `frontend/src/characters/PixelMonster.tsx`, `frontend/src/characters/pixel` |
| 백엔드 테스트 | pytest 9.2.0, FastAPI TestClient, 인메모리 SQLite | `backend/tests/conftest.py` |

### 1.1 데이터베이스와 연결 방식

- `DATABASE_URL`이 있으면 해당 SQLAlchemy URL을 사용한다.
- 값이 없으면 `sqlite+pysqlite:///.../backend/mozi.db`를 사용한다 (`backend/app/core/config.py`).
- 현재 `.env`에는 `DATABASE_URL` 항목이 있지만 값은 비어 있고, 로컬 SQLite 파일이 존재한다.
- Alembic 마이그레이션은 7개이며 로컬 DB는 최신 head에 있다.
- 운영 후보인 PostgreSQL/Supabase 연결은 아직 실제 검증되지 않았다.

현재 테이블은 다음과 같다.

```text
users
├─ auth_sessions
├─ daily_entries
│  ├─ emotion_analyses (1:1)
│  └─ encounters (1:1)
├─ characters
│  ├─ encounters (1:N)
│  └─ character_shares (1:N)
└─ owned_furniture
```

`daily_entries`에는 `(user_id, entry_date)` 유일 제약이 있어 사용자별 하루 한 기록 정책이 DB에서도 보장된다 (`backend/app/models/daily_entry.py:31`).

### 1.2 인증 및 회원 관리

- 이메일·비밀번호 회원가입 후 별도 이메일 인증 없이 로그인한다.
- 비밀번호는 Argon2로 해시되며 원문은 저장하지 않는다.
- 로그인 시 무작위 토큰을 발급하고 DB에는 토큰 해시만 저장한다.
- 브라우저에는 `HttpOnly`, `SameSite=Lax` 쿠키로 전달한다.
- 보호 API는 쿠키의 세션 해시, 폐기 여부와 만료일을 검사한다.
- 닉네임은 1~20자이며 한글·영문·숫자·밑줄을 허용한다.
- 계정 삭제와 사용자 데이터 내보내기 API는 없다.

근거: `backend/app/api/auth.py`, `backend/app/api/dependencies.py`, `backend/app/api/account.py`, `backend/app/schemas/auth.py`, `frontend/src/auth`.

### 1.3 AI 감정 분석

- OpenAI Responses API의 `responses.parse`와 Pydantic 스키마를 사용한다.
- 16종 기본 감정을 각각 0~100 독립 점수로 받는다.
- 주감정 1개, 보조감정 최대 2개, 세부 상태 최대 3개, 키워드 최대 5개를 받는다.
- 실제 분석 실패 시 일기를 보존하고 재시도 또는 규칙 기반 데모 분석을 선택할 수 있다.
- 화면의 감정 비율은 원점수를 그대로 보여주는 값이 아니라 선택된 최대 3개 감정 점수를 다시 합계 100으로 정규화한 값이다 (`backend/app/services/emotion_display.py`).
- 테스트는 실제 OpenAI 호출 대신 `FakeEmotionAnalyzer`를 주입한다 (`backend/tests/conftest.py`). 따라서 스키마와 실패 복구는 검증되었지만 현재 키·모델·네트워크를 이용한 실호출 성공은 확인 불가다.

### 1.4 이미지·픽셀 렌더링과 저장

현재 세 종류의 자산/렌더링 경로가 공존한다.

1. 원본 캐릭터 12종 PNG: `frontend/public/assets/characters`
2. 실제 서비스용 조립 PNG: `frontend/public/assets/character-prototype`, `PixelMonster.tsx`
3. 개발용 64×64 Canvas 렌더러: `frontend/src/characters/pixel`

실제 서비스의 일기 결과·달력·도감·방은 2번을 사용하고, 고급 픽셀 데모 화면만 3번을 사용한다. 생성 결과는 PNG 파일로 저장하지 않고 캐릭터 부품 ID, 색상 팔레트, seed와 알고리즘 버전을 DB에 저장한다. 개발용 Canvas 렌더러의 완전한 명세나 최종 PNG 스냅샷은 DB에 저장하지 않는다.

### 1.5 파일 및 이미지 저장 방식

- 사용자 업로드 파일 저장 기능은 없다.
- 이미지 자산은 `frontend/public/assets`의 정적 파일이다.
- 원본 캐릭터 12종, 조립용 몸통·얼굴·효과 PNG, 방·가구·날씨 PNG가 저장되어 있다.
- DB에는 이미지 URL이나 바이너리가 아니라 캐릭터 구성 ID가 저장된다.
- 별도 object storage(Supabase Storage, S3 등)는 연결되어 있지 않다.

### 1.6 환경변수 구성

루트 `.env.example`에 정의된 항목은 다음과 같다.

- 앱: `APP_ENV`, `FRONTEND_URL`, `BACKEND_URL`, `VITE_API_URL`
- DB: `DATABASE_URL`, `TEST_DATABASE_URL`
- 인증: `SESSION_COOKIE_NAME`, `SESSION_TTL_DAYS`, `SESSION_COOKIE_SECURE`, `SESSION_SECRET`
- AI: `OPENAI_API_KEY`, `AI_ANALYSIS_MODE`

실제 `.env`에는 추가로 `OPENAI_MODEL`이 있다. 반대로 `SESSION_SECRET`, `TEST_DATABASE_URL`, `AI_ANALYSIS_MODE`, `VITE_API_URL` 중 일부는 현재 실행 코드에서 직접 사용되지 않거나 설정 위치와 로딩 주체가 다르다.

- 백엔드 `Settings`에는 `SESSION_SECRET`과 `TEST_DATABASE_URL` 필드가 없다.
- `AI_ANALYSIS_MODE`는 읽지만 실제 API 분기에는 사용되지 않는다.
- Vite는 기본적으로 `frontend` 디렉터리의 env를 읽으므로 루트 `.env`의 `VITE_API_URL`은 자동 주입되지 않는다. 현재 `api/client.ts`의 fallback과 프록시가 이를 보완한다.
- `.env`는 `.gitignore`에서 제외되어 있고 `.env.example`만 추적된다.

비밀값 자체는 이번 분석에서 읽거나 기록하지 않았다.

### 1.7 테스트 및 빌드 기준선

2026-11-04 직접 실행 결과:

| 명령 | 결과 |
| --- | --- |
| `backend/.venv/Scripts/python.exe -m pytest -q backend/tests` | 53 passed |
| `npm.cmd test -- --run` | 17 files, 62 tests passed |
| `npm.cmd run lint` | 통과, 오류 출력 없음 |
| `npm.cmd run build` | 통과, 72 modules transformed |
| `python -m alembic current` | SQLite, `20261102_0007 (head)` |

프론트 테스트에는 jsdom의 `window.scrollTo()` 미구현 안내가 2회 출력되지만 테스트 실패는 아니다.

## 2. 전체 프로젝트 구조

```text
vibecodingprojectnew/
├─ .env / .env.example         # 로컬 비밀값 / 공개 템플릿
├─ docs/                       # 기획, 명세, 설치, 프로토타입 문서
├─ backend/
│  ├─ app/
│  │  ├─ api/                  # FastAPI 라우트
│  │  ├─ constants/            # 감정·캐릭터·상점 규칙
│  │  ├─ core/                 # 환경 설정
│  │  ├─ db/                   # SQLAlchemy 세션, Alembic
│  │  ├─ models/               # DB 모델
│  │  ├─ schemas/              # 요청·응답 Pydantic 모델
│  │  └─ services/             # 인증, 분석, 캐릭터, 방, 공유, 상점 로직
│  └─ tests/                   # API·서비스 pytest
└─ frontend/
   ├─ public/assets/           # 캐릭터·방·가구·날씨 정적 PNG
   └─ src/
      ├─ api/                  # 공통 fetch 래퍼
      ├─ auth/                 # 회원가입·로그인·보호 라우트
      ├─ diary/                # 작성·분석 결과·달력
      ├─ characters/           # 도감·상세·실서비스 PNG 렌더러
      │  ├─ pixel/             # 개발용 64×64 픽셀 렌더러
      │  └─ prototype/         # 디자인 검증 화면
      ├─ room/                 # 감정 방·입주 관리
      ├─ settings/             # 닉네임 설정
      ├─ sharing/              # 공개 캐릭터 링크
      ├─ shop/                 # 가구 상점
      └─ weather/              # 위치·날씨 기반 방 배경
```

### 2.1 현재 백엔드 API 라우트

| 영역 | 라우트 |
| --- | --- |
| 상태 | `GET /api/health` |
| 인증 | `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` |
| 계정 | `PATCH /api/account/nickname` |
| 일기 | `GET /api/diary/today`, `GET /api/diary/records`, `POST /api/diary/today`, `POST /api/diary/today/retry`, `POST /api/diary/today/demo` |
| 캐릭터 | 목록, 상세, 이름 변경, 만남 상세, 만남 삭제 (`/api/characters/...`) |
| 방 | 입주 목록, 입주, 퇴실 (`/api/room/residents/...`) |
| 공유 | 공유 링크 생성·폐기, 공개 조회 |
| 상점 | 상점 조회, 구매, 배치 변경 (`/api/shop/...`) |

일기 수정, 임시 저장, 검색, 통계, 알림, 즐겨찾기, 계정 삭제, 데이터 내보내기 API는 없다.

## 3. 기능별 구현 현황

상태는 요청에서 지정한 다섯 가지 표현만 사용했다. “부분 구현”은 개발용 화면에만 있거나, 기능 일부만 있거나, 실서비스 연결이 끝나지 않은 경우다.

| 기능 | 상태 | 실제 코드 근거와 판단 |
| --- | --- | --- |
| 회원가입 / 로그인 | 구현 완료 | `api/auth.py`, `authApi.ts`, `SignupPage.tsx`, `LoginPage.tsx`; Argon2와 HttpOnly 세션 쿠키 사용. 인증 테스트 존재. |
| 사용자 프로필 | 부분 구현 | `SettingsPage.tsx`와 `PATCH /api/account/nickname`으로 이메일 표시·닉네임 변경만 제공. 프로필 이미지·비밀번호 변경·계정 관리 없음. |
| 일기 작성 / 수정 / 삭제 | 부분 구현 | `POST /api/diary/today` 작성과 만남 삭제가 있음. 생성 확정 후 수정 API는 의도적으로 없고 삭제는 원문·분석을 지우되 날짜 표식을 남김 (`services/characters.py`). |
| 일기 임시 저장 | 미구현 | draft 상태, 임시 저장 API, localStorage 자동 저장 코드가 없음. |
| 일기 검색 | 미구현 | 검색어 파라미터, 전문 검색 쿼리와 검색 UI가 없음. |
| 16종 감정 분석 | 부분 구현 | 16필드 스키마와 OpenAI 구조화 출력, 데모 규칙은 구현. 자동 테스트는 가짜 분석기만 사용하여 실제 OpenAI 호출 성공은 확인 불가. |
| 주감정 / 보조감정 분석 | 구현 완료 | `EmotionAnalysisPayload`가 주감정 1개와 보조감정 최대 2개를 검증하고 DB JSON에 저장. |
| 감정 강도 및 비율 분석 | 구현 완료 | 독립 0~100 점수 저장, 5단계 강도 계산, 화면용 상위 감정 비율 정규화 구현. 다만 “원점수”와 “표시 비율”의 의미가 UI에서 충분히 구분되지 않음. |
| 감정 분석 근거 | 미구현 | `event_summary`는 한 문장 요약일 뿐, 원문 근거 구절·판단 이유·신뢰도 필드가 없음. |
| 감정 분석 결과 수정 | 미구현 | 분석 override 모델, 수정 API와 UI가 없음. |
| 6종 캐릭터 실루엣 | 부분 구현 | 실제 백엔드는 `BODY_PARTS = ("basic",)` 하나만 저장. 개발용 렌더러는 6종이 아니라 10종(`round`~`star`)이고 실제 화면과 미연결. 6개 감정 그룹 계약도 코드에 없음. |
| 감정별 색상 및 픽셀 음영 | 부분 구현 | 개발용 `palette.ts`는 감정별 6단계 ramp를 만듦. 실제 서비스는 백엔드 8개 단색과 PNG tint를 사용하여 고급 음영이 적용되지 않음. |
| 강도별 표정 | 부분 구현 | 개발용 `faces.ts`는 16감정×5단계. 실제 백엔드는 감정별 고정 recipe이고 약한 단계에서 눈썹만 바꾸므로 실제 화면에는 5단계가 온전히 반영되지 않음. |
| 보조감정 이펙트 | 부분 구현 | 개발용 Canvas에는 `secondaryEffect`와 16종 bitmap effect가 있음. 실제 백엔드는 주감정·세부상태 effect를 만들며 실제 PNG 렌더러는 일부 effect만 `sparkle`/`sweat`로 축약 매핑함. |
| 일기 키워드 기반 소품 | 부분 구현 | AI/데모가 키워드 최대 5개를 저장하고 백엔드는 첫 키워드 카테고리만 10개 accessory로 매핑. 실제 프론트는 `cup→coffee`, `heart→hearts`만 표시 가능하여 다수 소품이 사라짐. 개발용 렌더러의 상세 소품은 실서비스 미연결. |
| 캐릭터 저장 및 재현 | 부분 구현 | fingerprint, seed, algorithm version, 부품 ID는 DB 저장되어 기존 방식은 재현 가능. 그러나 개발용 최종 렌더 명세·보조감정 effect·팔레트 ramp·PNG snapshot은 저장하지 않아 새 렌더러 장기 재현 계약이 불완전. |
| 감정 캘린더 | 구현 완료 | 사용자별 월간 API, 서울 날짜 처리, 날짜별 저장 캐릭터와 상세 링크 구현 (`DiaryRecordsPage.tsx`, `api/diary.py`). |
| 캐릭터 방 | 구현 완료 | 최대 5마리 입주, 행동별 이동 확률·속도, 말풍선, 가구와 날씨 배경 구현. 단 캐릭터 시각 품질은 구형 렌더러를 따름. |
| 캐릭터 도감 | 구현 완료 | 사용자 소유 목록·상세·만난 날짜·이름 변경·일기 상세·자동 저장 구현. |
| 캐릭터 즐겨찾기 | 미구현 | 모델 필드, API, UI가 없음. `is_resident`는 즐겨찾기가 아니라 방 입주 상태임. |
| 주간 / 월간 감정 통계 | 구현 완료 | `GET /api/reports/emotions`(period=week 또는 month, anchor 날짜)(`api/reports.py`, `services/reports.py`)와 `/reports` 화면(`EmotionReportPage.tsx`). 주는 월요일~일요일, 월은 1일~말일이며 서울 날짜 기준. 감정별·그룹별 횟수, 날짜별 주감정 강도 추이, 작성 일수, 키워드, 집계만 전달하는 선택형 AI 회고 제공. |
| 과거의 오늘 | 구현 완료 | `GET /api/reports/on-this-day`가 한 달 전·일 년 전 같은 날(짧은 달은 말일로 보정)을 사용자별로 조회. 리포트 화면과 헤더 알림 창에 노출. |
| 알림 | 부분 구현 | 채널은 브라우저 알림(Notification API)으로 결정. 설정 화면에서 명시적으로 켜고 시간을 고르면(`notifications_enabled`, `notification_time`) MOZI가 열려 있는 동안 서울 시각 기준 하루 한 번, 오늘 일기를 아직 쓰지 않았을 때만 알림(`components/diaryReminder.ts`). 앱이 닫힌 상태의 푸시·이메일과 delivery log는 서버 인프라가 필요해 미구현. 헤더 알림 창(연속 기록·오늘 상태·과거의 오늘)은 앱 안 알림이다. |
| 이미지 다운로드 | 부분 구현 | `canvasExport.ts`와 개발용 데모의 PNG 버튼만 존재. 실제 도감·상세 화면에는 다운로드가 없고 구형 캐릭터는 이 Canvas 명세로 렌더되지 않음. |
| 계정 삭제 및 데이터 내보내기 | 미구현 | 계정 삭제·export 라우트와 UI가 모두 없음. DB FK cascade 준비는 일부 되어 있지만 사용자 기능은 없음. |

### 3.1 요청 목록 밖에서 이미 구현된 기능

- 캐릭터 공개 공유 링크 생성·폐기와 공개 보기
- 캐릭터 이름 변경
- 최대 5마리 입주·퇴실
- 가구 구매·배치와 코인
- 위치 기반 날씨·시간대 방 배경
- ngrok 및 같은 Wi-Fi 모바일 접속 설정
- 모바일 미리보기용 휴대폰 프레임 페이지

## 4. 발견된 문제점

### 4.1 중복 코드와 구조 분리

#### P0 — 실제 서비스와 개발용 캐릭터 렌더러가 다름

- 실제: `CharacterSprite.tsx` → `PixelMonster.tsx` → PNG 레이어.
- 개발용: `pixel/renderCharacter.ts` → `PixelCharacterCanvas.tsx` → Canvas.
- 같은 감정·표정·색상 개념이 백엔드 `constants/characters.py`, 프론트 `CharacterSprite.tsx`, 프론트 `pixel/*`에 각각 따로 정의되어 있다.
- `hair.ts`는 남아 있지만 현재 렌더 결과 타입은 `hair: null`로 고정되어 사실상 죽은 코드다.
- 원본 12종 PNG도 별도 체계로 남아 있어 시각 자산의 기준이 셋이다.

영향: 데모 승인 결과가 실제 서비스에 반영되지 않고, 한쪽 매핑을 바꿔도 다른 화면은 그대로여서 오류와 디자인 불일치가 반복된다.

#### P1 — 프론트·백엔드 감정 상수 중복

16종 감정 이름, 색상, 표정, effect, accessory 이름이 여러 파일에 반복되어 있다. 자동 생성된 공유 계약이나 검증 테스트가 없어 철자와 지원 범위가 쉽게 어긋난다.

#### P1 — 문서와 코드 상태 불일치

`docs/setup.md`에는 과거 테스트 수, 과거 몸통 수와 당시 Phase 상태가 누적되어 있다. 현재 코드와 다른 정보를 개발자가 최신 상태로 오해할 수 있다.

### 4.2 불필요하거나 비효율적인 API/처리

- 현재 일기 생성 요청 안에서 OpenAI 호출을 동기 실행한다. 요청 시간이 길어지고 네트워크 중단 시 사용자가 오래 기다릴 수 있다.
- AI 실패 시 재시도 횟수 제한, 지수 백오프, 명시적 timeout 정책이 서비스 계층에 없다.
- 도감 목록은 페이지네이션 없이 사용자의 모든 캐릭터와 encounter를 읽는다. 데이터가 커지면 응답과 메모리 사용량이 증가한다.
- 폐기·만료 세션을 정리하는 작업이 없다.
- 같은 상수와 변환을 프론트와 백엔드에서 각각 수행하여 API 응답 후 다시 축약 매핑한다. 이는 네트워크 호출 자체보다 결과 손실과 유지보수 비용이 더 큰 문제다.

### 4.3 캐릭터 이미지 품질 저하 원인

1. 실제 서비스는 개발용 64×64 렌더러를 사용하지 않는다.
2. 백엔드는 몸통을 `basic` 하나만 선택한다 (`constants/characters.py:5`).
3. 실제 프론트의 `bodyParts`는 들어오는 여러 몸통 이름을 전부 `basic`으로 축약한다.
4. 실제 소품 매핑은 2개, 외부 effect 매핑은 사실상 `sparkle`과 `sweat` 두 모양으로 축약된다.
5. 실제 PNG tint는 단색 몸통 위주이며 개발용 6단계 음영 ramp를 사용하지 않는다.
6. 개발용 렌더러는 10개 실루엣인 반면 서비스 요구사항은 6개 감정 그룹을 기준으로 한다. 데이터 계약이 확정되지 않았다.

### 4.4 감정 분석 일관성 문제

- 구조화 스키마는 강하지만 prompt version, 실제 model version, 요청 ID를 저장하지 않는다. 모델이나 프롬프트 변경 전후 결과를 추적하기 어렵다.
- 독립 강도 점수와 화면 표시 비율이 서로 다른 의미인데 이름과 설명이 충분하지 않다.
- 분석 근거 구절과 신뢰도가 없어 결과 검토·수정이 어렵다.
- 데모 분석은 단순 부분 문자열 매칭이라 부정문, 문맥, 중의성을 처리하지 못한다.
- 실제 OpenAI 경로는 자동 테스트에서 fake로 대체된다. 라이브 smoke test 또는 평가용 고정 데이터셋이 없다.
- `AI_ANALYSIS_MODE` 설정값이 실제 분기 제어에 쓰이지 않아 설정만 보고 동작을 예측하기 어렵다.

### 4.5 저장 데이터 구조 문제

- `characters`는 구형 부품 필드만 저장하며 개발용 렌더러의 실루엣, 6단계 팔레트, 5단계 표정 ID, 보조감정 effect 배치, 소품 anchor와 renderer version을 완전하게 저장하지 않는다.
- 최종 렌더 snapshot이 없어 렌더 코드나 팔레트가 바뀌면 과거 캐릭터 외형도 바뀔 수 있다.
- `primary_emotion`은 Character 컬럼이 아니라 fingerprint 문자열 첫 조각에서 역산한다 (`services/characters.py`). fingerprint 형식 변경에 취약하다.
- 일기 삭제는 hard delete가 아니라 원문을 null로 만들고 `deleted` 상태를 유지한다. 재작성 금지 정책에는 맞지만 `deleted_at` 컬럼은 실제 삭제 서비스에서 설정하지 않는다.
- `event_summary`는 근거가 아니며 사용자 수정 결과를 저장할 공간이 없다.

### 4.6 보안 및 개인정보 위험

잘된 점:

- Argon2 비밀번호 해시, 세션 토큰 해시, HttpOnly 쿠키 사용.
- 사용자 소유 조건을 API 쿼리에 포함해 다른 사용자의 일기·캐릭터 접근을 막는다.
- `.env`와 로컬 DB는 Git에서 제외된다.
- OpenAI 요청은 `store=False`를 사용한다.

개선 필요:

- 로그인·회원가입·AI 분석 API에 rate limit이 없다.
- 상태 변경 요청에 CSRF token이 없다. `SameSite=Lax`가 기본 방어를 제공하지만 운영 배포에서는 명시적 origin 검사나 CSRF 대책이 필요하다.
- 일기 원문은 DB에 평문으로 저장된다. 운영 DB 접근 통제, 백업 정책, 보존·삭제 정책이 문서화되어 있지 않다.
- 사용자 일기가 외부 AI API로 전송된다는 고지와 동의 흐름이 코드상 확인되지 않는다.
- 계정 삭제·데이터 내보내기가 없어 개인정보 자기결정 기능이 불완전하다.
- `SESSION_COOKIE_SECURE=false` 기본값은 로컬에는 맞지만 운영 환경에서 잘못 설정될 위험이 있다.
- 공개 공유 링크는 충분히 긴 토큰을 사용하지만 만료일과 접근 감사 로그는 없다.

### 4.7 성능 저하 가능성

- 동기 AI 호출이 API worker를 점유한다.
- 도감·만남 목록에 pagination이 없다.
- 통계 기능 추가 시 JSON 감정 점수를 애플리케이션에서 모두 읽어 집계하면 비효율적일 수 있다.
- 프론트 빌드 JS는 현재 약 377 kB(압축 전), gzip 약 119 kB다. 아직 문제 수준은 아니지만 프로토타입 코드가 실제 번들 라우트에 함께 포함된다.
- 이미지가 다수의 개별 PNG 요청으로 구성되어 있어 캐릭터·가구가 늘면 요청 수가 증가할 수 있다.

### 4.8 사용자 경험 문제

- 개발용 캐릭터와 실제 생성 캐릭터의 품질 차이가 크다.
- “강도 0~100”과 “화면 비율 합계 100”이 같은 값처럼 보일 수 있다.
- 일기 입력 중 페이지 이탈 시 내용이 사라진다.
- AI 요청은 동기인데 분석 화면은 별도 페이지여서, 실제로는 생성 POST 응답을 기다리는 동안 작성 화면에 머무는 구조다.
- 분석 실패 원인이 사용자에게 구체적으로 구분되지 않는다(키 누락, 네트워크, 모델 오류가 같은 메시지).
- 계정 탈퇴, 데이터 내려받기, 즐겨찾기, 검색과 통계가 없다.
- “생성 후 수정 불가” 정책은 구현되어 있으나 오탈자 정정 요구가 생길 수 있어 확정 전 임시 저장이 특히 중요하다.

## 5. Phase 1~7 개발 계획

한 Phase가 완료되고 사용자가 확인하기 전에는 다음 Phase로 넘어가지 않는다.

### Phase 1 — 캐릭터 계약 통합과 실제 화면 연결 기반

목표: 개발용 픽셀 렌더러를 공식 렌더러 후보로 정리하고, 실제 서비스와 동일한 데이터 계약을 사용하게 한다.

주요 작업:

- 6개 감정 그룹과 공식 실루엣 정책 확정. 현재 10개 개발용 실루엣 중 유지·호환 대상을 문서화한다.
- 프론트의 감정 key, 표정 단계, 소품/effect ID를 하나의 공유 명세로 정리한다.
- 백엔드 응답에서 구형 필드와 신규 renderer spec을 함께 제공하는 호환 계층을 설계한다.
- 기존 저장 캐릭터를 변경하지 않는 legacy renderer fallback을 유지한다.
- 프로토타입과 실제 화면의 시각 비교 테스트를 만든다.

예상 수정 파일:

- `frontend/src/characters/pixel/*`
- `frontend/src/characters/CharacterSprite.tsx`
- `frontend/src/characters/PixelMonster.tsx`
- `backend/app/constants/characters.py`
- `backend/app/schemas/characters.py`
- `backend/app/services/character_generator.py`
- 신규 캐릭터 렌더 명세 문서·테스트

DB 마이그레이션: 설계 확정 후 필요. 신규 spec 컬럼을 추가하되 구형 컬럼은 즉시 제거하지 않는다.

완료 조건:

- 동일한 fixture가 프로토타입과 실제 일기 결과·도감·달력·방에서 같은 캐릭터로 보인다.
- 기존 캐릭터 데이터가 계속 표시된다.
- 6개 감정 그룹 정책과 renderer version 계약이 문서·코드·테스트에서 일치한다.

### Phase 2 — 감정 분석 신뢰성·설명 가능성 개선

목표: 실제 AI 결과의 재현성, 검증 가능성과 실패 진단을 높인다.

주요 작업:

- 분석 prompt version, 요청 model, 분석 제공자, 분석 시각을 저장한다.
- 감정별 근거 구절과 confidence 스키마를 추가한다.
- 원점수·표시 비율·강도를 API와 UI에서 명확히 구분한다.
- 고정 한국어 일기 평가 데이터셋과 live opt-in smoke test를 만든다.
- timeout, 재시도 정책, 오류 코드와 사용자 메시지를 분리한다.
- 결과 수정 기능은 “AI 오분류 수정”의 제품 정책을 사용자와 확정한 뒤 구현한다.

예상 수정 파일:

- `backend/app/services/openai_analysis.py`
- `backend/app/schemas/emotions.py`
- `backend/app/models/emotion_analysis.py`
- `backend/app/services/emotion_analysis.py`
- `backend/app/api/diary.py`
- `frontend/src/diary/diaryApi.ts`
- `frontend/src/diary/GenerationPage.tsx`
- 분석 테스트와 평가 fixture

DB 마이그레이션: 필요. 분석 provenance·근거·수정 이력을 nullable 컬럼 또는 별도 테이블로 추가한다.

완료 조건:

- 16종 점수, 주·보조감정, 강도, 비율, 근거의 의미가 API 문서와 화면에서 구분된다.
- 동일 버전·고정 입력 평가가 허용 오차 내에서 통과한다.
- 실제 AI 미설정·timeout·검증 실패를 서로 다른 오류로 확인할 수 있다.

### Phase 3 — 픽셀 캐릭터 생성·저장·재현 완성

목표: 공식 렌더러의 색상, 표정, 보조감정 effect와 키워드 소품을 실제 서비스 전체에 적용한다.

주요 작업:

- 16감정×5강도 표정, 감정 팔레트, 6그룹 실루엣 선택 규칙을 공식화한다.
- 보조감정은 독립 effect로 표현하고 주감정 색과 섞지 않는 현재 정책을 반영한다.
- 키워드 소품 후보와 anchor, 복잡도 예산을 실제 렌더러에 연결한다.
- seed, renderer version, 모든 선택 부품, effect 위치를 저장한다.
- 장기 보존용 PNG snapshot 저장 여부를 용량·호환성 기준으로 결정한다.
- 기존 12종 원본 에셋은 변경 없이 별도 original 타입으로 유지한다.

예상 수정 파일:

- `frontend/src/characters/pixel/*`
- `frontend/src/characters/CharacterSprite.tsx`
- `backend/app/models/character.py`
- `backend/app/models/encounter.py`
- `backend/app/services/character_generator.py`
- `backend/app/schemas/characters.py`
- 캐릭터 구조·시각 회귀 테스트

DB 마이그레이션: 필요. `render_spec`, `renderer_version`, 선택적으로 `snapshot_url`을 추가한다.

완료 조건:

- 실제 일기 생성부터 달력·도감·방·공유까지 같은 외형이 유지된다.
- 같은 spec+seed+version은 동일 픽셀 결과를 만든다.
- 과거 캐릭터는 migration 전후 동일하게 보인다.
- 마스크 구멍·얼굴 침범·소품 잘림 자동 검증과 시각 검수가 통과한다.

### Phase 4 — 일기 사용성: 임시 저장·검색·기록 관리

목표: 작성 중 손실을 막고 과거 기록을 쉽게 찾게 한다.

주요 작업:

- 오늘 일기 서버 임시 저장 또는 명확한 local draft 정책 구현.
- 제목·본문·감정·날짜 검색과 필터 구현.
- 확정 후 수정 불가 정책은 유지하되 확정 전 수정·삭제 UX를 강화한다.
- 삭제 상태와 `deleted_at` 사용을 일치시킨다.
- 달력과 상세의 빈 상태·오류·로딩 접근성을 정리한다.

예상 수정 파일:

- `backend/app/models/daily_entry.py`
- `backend/app/api/diary.py`
- `backend/app/services/diary.py`
- `frontend/src/diary/DiaryPage.tsx`
- `frontend/src/diary/DiaryRecordsPage.tsx`
- 신규 검색/필터 컴포넌트와 테스트

DB 마이그레이션: 필요 가능성이 높음. draft 상태·저장 시각·검색 인덱스를 추가한다. PostgreSQL 사용 시 전문 검색 방식은 별도 결정한다.

완료 조건:

- 새로고침·이탈 후 초안 복구가 된다.
- 다른 사용자의 초안·검색 결과가 노출되지 않는다.
- 확정 기록 불변 정책과 삭제 후 재작성 금지 정책이 유지된다.

### Phase 5 — 도감·방·공유 기능 완성

목표: 수집과 공유 경험을 강화한다.

주요 작업:

- 캐릭터 즐겨찾기와 즐겨찾기 필터 추가.
- 실제 캐릭터 상세에 투명 PNG 다운로드 추가.
- 도감 pagination 또는 cursor 적용.
- 공유 링크 만료 선택과 재발급 정책 검토.
- 방·도감·달력에 공식 렌더러를 적용한 뒤 모바일 성능을 확인한다.

예상 수정 파일:

- `backend/app/models/character.py`
- `backend/app/api/characters.py`
- `backend/app/services/characters.py`
- `frontend/src/characters/*`
- `frontend/src/room/*`
- `frontend/src/sharing/*`

DB 마이그레이션: 즐겨찾기 필드와 선택적 공유 만료일에 필요.

완료 조건:

- 즐겨찾기 저장·필터가 재로그인 후 유지된다.
- 사용자가 실제 저장 캐릭터를 투명 PNG로 내려받을 수 있다.
- 대량 도감에서도 API와 화면이 페이지 단위로 동작한다.

### Phase 6 — 회고 기능: 통계·과거의 오늘·알림

목표: 일기 작성 이후 다시 방문할 이유를 만든다.

주요 작업:

- 주간·월간 감정 강도 추이와 작성 빈도 API/UI 구현.
- “과거의 오늘”을 사용자별로 조회한다.
- 알림 채널을 먼저 결정하고 opt-in 설정을 구현한다.
- 독립 감정 점수와 표시 비율 중 어떤 값을 통계에 사용할지 명시한다.

예상 수정 파일:

- 신규 `backend/app/api/insights.py`, `services/insights.py`, schemas
- `backend/app/main.py`
- 신규 `frontend/src/insights/*`
- `frontend/src/components/AppShell.tsx`
- 알림 설정 관련 모델·UI(채널 확정 시)

DB 마이그레이션: 통계는 원본 데이터 집계라 필수 아님. 알림 설정과 delivery log를 구현하면 필요.

완료 조건:

- 기간·시간대 경계가 서울 날짜 기준으로 정확하다.
- 통계 수치가 원본 일기 분석과 대조 테스트에서 일치한다.
- 알림은 명시적 동의 사용자에게만 전송되고 쉽게 해제할 수 있다.

진행 상황 (2026-11-04):

- 경로는 계획의 `insights` 대신 `reports`로 구현했다: `backend/app/api/reports.py`, `services/reports.py`, `services/reflection.py`, `schemas/reports.py`, `frontend/src/reports/*`.
- 통계 기준: 등장 횟수는 일기별 주감정 1개를 센다. 강도는 화면용 표시 비율이 아니라 주감정의 독립 0~100 점수(`base_emotions`)를 쓰며, 사용자가 분석을 수정하면 수정값을 쓴다.
- 서울 날짜 경계(월요일 시작 주, 월말, 윤년, 짧은 달 보정, 기본 anchor)는 `tests/test_reports.py`로 검증한다.
- 알림 채널은 브라우저 알림이다. 설정에서 켜고 끌 수 있고, 꺼져 있거나 권한이 없으면 보내지 않는다. 앱이 닫힌 상태의 푸시와 delivery log는 남은 작업이다.

### Phase 7 — 개인정보·보안·운영 안정화

목표: 실제 배포 가능한 수준으로 개인정보 권리, 보안, 관측성과 배포 검증을 마무리한다.

주요 작업:

- 계정 삭제와 데이터 내보내기(JSON, 필요 시 이미지 묶음) 구현.
- AI 전송 고지·동의, 개인정보 보존·삭제 정책 UI 추가.
- rate limiting, CSRF/origin 방어, 운영 Secure cookie 강제.
- 만료 세션 정리와 로그·오류 추적 정책 수립.
- Supabase PostgreSQL에 마이그레이션을 적용하고 백업·복구를 검증한다.
- 실제 OpenAI smoke test, 핵심 E2E와 모바일 접근성·성능 검사를 수행한다.

예상 수정 파일:

- `backend/app/api/account.py`
- `backend/app/services/auth.py` 또는 신규 account service
- `backend/app/core/config.py`
- `backend/app/main.py`
- `frontend/src/settings/SettingsPage.tsx`
- 개인정보·동의 UI와 E2E 테스트
- 배포·운영 문서

DB 마이그레이션: 동의 시각, export job, 삭제 요청 이력을 보존해야 한다면 필요. 즉시 cascade 삭제만 선택하면 기존 FK를 활용할 수 있으나 실제 PostgreSQL cascade 검증이 필요하다.

완료 조건:

- 사용자 본인 확인 후 export와 탈퇴가 동작한다.
- 탈퇴 후 세션·일기·분석·캐릭터·공유 링크·가구가 정책대로 처리된다.
- Supabase migration, 백업과 복구 리허설이 성공한다.
- 운영 설정에서 Secure cookie, 제한된 CORS, rate limit과 개인정보 고지가 확인된다.
- 전체 테스트·빌드·E2E가 통과하고 실행하지 않은 검사는 별도로 표시된다.

## 6. DB 마이그레이션 종합 판단

| Phase | 필요 여부 | 이유 |
| --- | --- | --- |
| Phase 1 | 필요 가능 | legacy와 신규 렌더 spec을 병행 저장할 경우 nullable 컬럼 필요 |
| Phase 2 | 필요 | 분석 model/prompt version, 근거, 수정 이력 저장 |
| Phase 3 | 필요 | 공식 renderer spec/version 및 선택적 snapshot 참조 저장 |
| Phase 4 | 필요 가능 | draft 상태·자동 저장 시각·검색 인덱스 |
| Phase 5 | 필요 | 즐겨찾기, 선택적 공유 만료일 |
| Phase 6 | 선택 | 통계는 파생 가능, 알림 설정을 구현하면 필요 |
| Phase 7 | 선택 | 동의·export job·삭제 이력을 저장할 정책이면 필요 |

마이그레이션 원칙:

1. 신규 필드는 먼저 nullable 또는 안전한 server default로 추가한다.
2. 기존 데이터를 backfill한 뒤 애플리케이션을 이중 읽기/쓰기 상태로 전환한다.
3. 기존 구형 캐릭터 컬럼은 최소 한 릴리스 이상 유지한다.
4. SQLite와 PostgreSQL에서 모두 upgrade/downgrade를 검증한다.
5. 운영 데이터 삭제나 DB 초기화는 하지 않는다.

## 7. 우선순위와 다음 결정 사항

### 즉시 해결할 P0

1. 공식 캐릭터 렌더러를 실제 서비스와 통합한다.
2. 6개 감정 그룹과 현재 10개 실루엣의 관계를 확정한다.
3. 기존 캐릭터 외형 보존을 위한 renderer version·legacy fallback을 설계한다.

### 그다음 P1

1. 실제 AI 평가와 분석 provenance·근거를 추가한다.
2. draft와 검색을 구현한다.
3. 계정 삭제·데이터 내보내기와 AI 전송 고지를 준비한다.

### 사용자 확인이 필요한 정책

- “6개 감정 그룹당 실루엣 1종”인지, “그룹마다 여러 허용 실루엣”인지
- 과거 캐릭터를 구형 모습으로 보존할지, 신규 렌더러로 일괄 전환할지
- AI 분석 결과를 사용자가 수정할 수 있게 할지, 수정 이력을 별도 보존할지
- 임시 저장을 브라우저에만 둘지 서버 계정에 저장할지
- 캐릭터 PNG snapshot을 장기 저장할지 매번 spec으로 재렌더할지
- 알림 채널을 웹 알림, 이메일, 앱 푸시 중 어디까지 지원할지

## 8. Phase 0 완료 조건 확인

- [x] 프론트엔드 프레임워크와 버전 확인
- [x] 백엔드 구조와 전체 API 라우트 확인
- [x] DB 종류·fallback·마이그레이션 상태 확인
- [x] 인증·회원 관리 방식 확인
- [x] AI 분석 스키마·실패 복구·테스트 대역 확인
- [x] 캐릭터 렌더링 경로 세 종류와 실제 연결 차이 확인
- [x] 이미지·파일 저장 방식 확인
- [x] 환경변수 이름과 코드 사용 여부 확인(비밀값 미열람)
- [x] 기능별 구현 상태를 실제 코드 근거로 분류
- [x] 백엔드 테스트, 프론트 테스트·lint·build 실행
- [x] Phase 1~7 계획, 예상 수정 파일, 마이그레이션과 완료 조건 작성

Phase 0은 이 문서 작성으로 완료한다. 다음 Phase는 사용자 확인 후에만 진행한다.

# MOZI 근거 기반 감정 확인 개편

## 기존 구현 확인 (2026-11-05)

- `openai_analysis.py`: OpenAI Responses `parse`, 환경변수 OPENAI_MODEL(기본 gpt-6-luna), emotion-v2 프롬프트. 16개 독립 점수, 최고 점수 주감정, 선택적 보조감정 1개, 합계 100 비율.
- `schemas/emotions.py`: v1/v2 JSON 검증, 비율이 없으면 점수로 비율을 계산.
- `services/emotion_analysis.py`: 분석 저장과 동시에 캐릭터 생성. 기존 분석 수정 API는 기존 만남/캐릭터를 교체함.
- `daily_entries`: 사용자/날짜 UNIQUE, 오늘만 제출 가능, 확정 본문 수정 금지, 삭제해도 날짜 자리 유지.
- `character_generator.py`: 감정 그룹 6개, 기존 render_spec/seed 저장. human-v1과 pixel-v5 렌더러 존재. 팔레트는 frontend의 palette.ts에서 관리.
- 도감/공유는 저장 character/encounter, 캘린더는 일기와 encounter, 리포트는 저장 analysis 집계. 실제 카카오 공유 도구는 이번 변경 대상이 아님.

## 마이그레이션 계획

1. 기존 비율/점수/렌더링 JSON/seed는 삭제하거나 다시 계산하지 않음.
2. emotion_analyses에 ai_original(JSON), review(JSON), review_revision(INT) 추가. primary_emotion은 불확실 상태를 위해 NULL 허용.
3. daily_entries.status 길이를 30으로 확장하고 분석 요청 소유권을 위한 analysis_token, analysis_started_at 추가.
4. 신규 상태 awaiting_confirmation. 기존 completed 행은 그대로 유지.
5. SQLite는 실행 전 sqlite backup API로 백업하고, 복사본에 Alembic 적용 및 기존 데이터 비교 후 실제 DB 적용. PostgreSQL은 동일 Alembic을 사용하되 이 환경에서 연결되지 않으면 미검증으로 보고.

## 신규 흐름 및 정책

일기 제출 → v3 분석/원문 대조 → 확인 대기 → 사용자가 감정 수정 또는 승인 → 캐릭터/만남/보상 한 트랜잭션 저장.

- 분석은 최대 3감정, 불확실하면 0감정과 추천 null 가능. SINGLE/MIXED/TRANSITION/CONTRAST/UNCERTAIN.
- 강도 1~4는 일기의 표현 강도. 기존 팔레트에 전달할 0~100 값은 렌더링 어댑터의 고정 매핑이며 심리 점수가 아님.
- AI 원본과 현재 사용자 수정본을 별도 저장. 인용 위치는 서버가 검증된 인용으로부터 계산(유니코드 코드포인트, end exclusive).
- 사용자 추가 감정은 source=user, 인용 없이 추가 가능. AI 인용으로 위장하지 않음.
- PATCH /entries/{id}/review: revision 조건부 수정. POST /entries/{id}/confirm: revision 조건부 확정, 반복 확정은 저장된 동일 캐릭터 반환.
- 캐릭터 생성 뒤에는 신규/기존 모두 감정 변경과 재분석을 차단. 과거 기록을 자동 재분석하지 않음.
- 신규 캐릭터는 별도 renderer version을 사용해 기존 외형을 유지. 대표 감정은 실루엣/색/표정, 관계는 별도 이펙트.
- 확인 대기도 캘린더/검색에서 접근 가능. 통계는 확정된 결과만 집계. 과거 점수는 표시 시 4단계 환산임을 안내.

## 검증

근거 위조/유니코드 위치, 관계·선택·강도 유효성, 불확실/단일/동시/변화/대비, 사용자 수정, 중복·동시 요청, 소유권, 삭제 후 재작성 금지, legacy 조회/렌더 보존, 캘린더/공유/통계 회귀, 프론트 타입·빌드·테스트.

구조화 응답 연결은 OpenAI 공식 문서의 Responses parse 방식 유지: https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses

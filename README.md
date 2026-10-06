# BYTE BACK 방어전 5단계 저장점

현재 저장소는 **5단계: 자료 요청을 서버 한곳으로 모읍니다** 상태입니다.

- 저장소: https://github.com/youmjjang/choi-bujang-secret-vault
- Production: https://choi-bujang-secret-vault-6trg.vercel.app
- 단계 설정: `aleph.config.json`의 `step: 5`
- 원본 자료 API: `https://lktbmcgmnfcundifrvxs.supabase.co/rest/v1/learning_notes`

## 현재 동작

Supabase Auth 이메일·비밀번호 로그인/로그아웃은 브라우저에서 유지합니다. 메모 자료의 읽기·추가·수정·삭제는 브라우저가 Supabase Data API를 직접 부르지 않고 모두 Vercel 서버 함수 `/api/notes`, `/api/notes/:id`로 요청합니다.

서버는 공식 시작 틀의 `src/verify-login.mjs`로 토큰을 검증하고, 검증된 `login.userId`와 DB의 `owner_id`를 비교합니다. URL이나 요청 본문의 사용자 ID·역할·`owner_id`를 신뢰하지 않습니다.

자료 API는 다음 경로를 사용합니다.

- `GET /api/notes`
- `POST /api/notes`
- `GET /api/notes/:id`
- `PUT /api/notes/:id`
- `DELETE /api/notes/:id`

한 건 응답은 `{id,title,body}`, 수정 본문은 `{title,body}`를 유지합니다. 서버 전용 `SUPABASE_SECRET_KEY`는 Vercel 환경변수에만 두고 GitHub에는 넣지 않습니다.

## 4단계 보호 상태

`public.learning_notes`에는 본인 행만 허용하는 RLS 정책이 적용되어 있습니다. A/B 계정으로 각자 자기 메모만 보이는 것을 확인했고, B가 A 메모 UUID로 직접 GET 요청했을 때 자료 없이 `404`로 거부되는 것도 확인했습니다.

## 5단계 직접 권한 회수 상태

5단계에서는 원본 Supabase Data API를 브라우저 역할로 직접 부르는 길을 닫기 위해 `PUBLIC`, `anon`, `authenticated`의 `public.learning_notes` 직접 테이블 권한을 회수하는 SQL을 준비했습니다.

이 저장점 작성 시점에는 사용자가 SQL을 검토해 학습 DB에서 직접 실행하기로 했으므로 **직접 권한 회수 적용 완료로 기록하지 않습니다.** 적용 전 실제 상태는 `anon`에 CRUD 권한이 없고 `authenticated`에는 SELECT·INSERT·UPDATE·DELETE 권한이 남아 있습니다. 다른 테이블은 건드리지 않습니다.

## 현재 확인 상태

- 브라우저 코드에는 메모 자료를 Supabase Data API에서 직접 읽거나 고치는 호출이 없습니다.
- A 계정의 메모 읽기·추가·수정·삭제는 서버 함수 경로로 유지됩니다.
- 로그아웃 상태의 `GET /api/notes`는 자료 없이 `401` JSON 오류로 거부됩니다.
- `/data.json`은 `{"notes":[]}` 상태를 유지합니다.
- `X-Content-Type-Options: nosniff` 보안 헤더 설정을 유지합니다.
- `originalApiUrl`에는 쿼리 없는 원본 Supabase 자료 API HTTPS 경로를 기록했습니다.
- 5단계 직접 권한 회수 후 원본 Data API 차단 확인은 아직 실행 완료로 기록하지 않습니다.

## 다시 실행하기

로컬 정적 빌드는 다음 명령으로 확인합니다.

```sh
npm run build -- --local
```

Production에서는 Vercel의 서버 전용 환경변수를 유지한 채 GitHub `main`을 배포합니다.

비밀번호, JWT, 서버 전용 키, 실제 개인정보와 실제 메모 본문은 코드·로그·README·Git 커밋에 넣지 않습니다.

# BYTE BACK 방어전 4단계 저장점

현재 저장소는 **4단계: 로그인해도 내 자료만 보이게 합니다** 상태입니다.

- 저장소: https://github.com/youmjjang/choi-bujang-secret-vault
- Production: https://choi-bujang-secret-vault-6trg.vercel.app
- 단계 설정: `aleph.config.json`의 `step: 4`

## 현재 동작

Supabase Auth 이메일·비밀번호 로그인/로그아웃을 유지합니다. 브라우저는 Supabase 공식 SDK로 세션을 만들고 자료 API 요청 때 access token만 Authorization 헤더로 보냅니다.

서버는 공식 시작 틀의 `src/verify-login.mjs`로 토큰을 검증합니다. URL이나 요청 본문에서 받은 사용자 ID·역할·`owner_id`를 신뢰하지 않고, 검증된 `login.userId`만 소유권 판단에 사용합니다.

자료 API는 다음 경로를 사용합니다.

- `GET /api/notes` — 로그인 사용자의 메모 목록
- `POST /api/notes` — 검증된 사용자 ID를 `owner_id`로 저장해 메모 추가
- `GET /api/notes/:id` — 본인 소유 메모 한 건 조회
- `PUT /api/notes/:id` — 기존 행과 수정 대상이 본인 소유일 때만 수정
- `DELETE /api/notes/:id` — 본인 소유 메모만 삭제

한 건 응답 형식은 `{id,title,body}`, 수정 본문은 `{title,body}`를 유지합니다. POST/PUT 본문에 `owner_id`를 넣어 소유자를 바꾸려는 요청은 거부합니다. 상대 사용자의 메모 UUID를 사용한 단건 조회·수정·삭제는 소유자 조건에 맞지 않으면 자료 없이 거부하도록 구현했습니다.

## 인증 발급자와 허용 경로

`aleph.config.json`의 `identityProvider`에는 공개 정보만 기록합니다.

- issuer: `https://lktbmcgmnfcundifrvxs.supabase.co/auth/v1`
- audience: `authenticated`
- jwksUrl: `https://lktbmcgmnfcundifrvxs.supabase.co/auth/v1/.well-known/jwks.json`

`allowedRoutes`에는 실제 자료 API의 GET·POST·PUT·DELETE 경로 다섯 개를 기록합니다. 서버 전용 `SUPABASE_SECRET_KEY`는 Vercel 환경변수에만 두고 GitHub에는 넣지 않습니다.

## DB 권한 작업 상태

`public.learning_notes`에 적용할 RLS와 최소 권한 SQL을 별도로 준비했습니다. 목표는 `anon`에는 직접 테이블 권한을 두지 않고, `authenticated`에는 SELECT·INSERT·UPDATE·DELETE만 허용하며 모든 정책에서 `auth.uid() = owner_id`를 강제하는 것입니다.

이 저장점 작성 시점에는 사용자가 SQL을 검토해 직접 실행하기로 했으므로 **RLS/GRANTS 적용 완료로 기록하지 않습니다.** 다른 테이블은 변경하지 않았습니다.

## 현재 확인 상태

- A 계정 실제 로그인·로그아웃을 확인했습니다.
- A 계정에서 메모 추가·수정·삭제를 실제 화면에서 확인했습니다.
- 로그아웃 상태의 `GET /api/notes`가 자료 없이 `401` JSON 오류를 반환하는 것을 확인했습니다.
- `/data.json`은 계속 `{"notes":[]}` 상태입니다.
- `X-Content-Type-Options: nosniff` 보안 헤더 설정을 유지합니다.
- A/B 각자 자기 행 CRUD와 상대 행 거부의 교차 시험은 이 저장점 작성 시점에 아직 실행 완료로 기록하지 않습니다.

## 다시 실행하기

로컬 정적 빌드는 다음 명령으로 확인합니다.

```sh
npm run build -- --local
```

Production에서는 Vercel에 `SUPABASE_URL`과 `SUPABASE_SECRET_KEY`를 환경변수로 설정한 뒤 GitHub `main`을 배포합니다.

비밀번호, JWT, 서버 전용 키, 실제 개인정보와 실제 메모 본문은 코드·로그·README·Git 커밋에 넣지 않습니다.

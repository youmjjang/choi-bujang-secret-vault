# BYTE BACK 방어전 3단계 저장점

현재 저장소는 **3단계: 진짜 로그인을 붙입니다** 상태입니다.

- 저장소: https://github.com/youmjjang/choi-bujang-secret-vault
- Production: https://choi-bujang-secret-vault-6trg.vercel.app
- 단계 설정: `aleph.config.json`의 `step: 3`

## 현재 동작

Supabase Auth 이메일·비밀번호 로그인/로그아웃 화면을 사용합니다. 브라우저는 Supabase 공식 SDK로 세션을 만들고, 자료 API 요청 때 access token만 Authorization 헤더로 보냅니다.

서버는 공식 시작 틀의 `src/verify-login.mjs`로 토큰을 검사합니다. 브라우저가 보내는 `userId`나 `role` 값은 신뢰하지 않습니다. 토큰이 없거나 검증에 실패하면 자료 없이 `401` JSON 오류로 거부합니다.

자료 API는 다음 경로를 사용합니다.

- `GET /api/notes` — 로그인 사용자의 메모 목록
- `POST /api/notes` — 로그인 사용자 ID를 `owner_id`로 저장해 메모 추가
- `GET /api/notes/:id` — 한 건 조회
- `PUT /api/notes/:id` — 한 건 수정
- `DELETE /api/notes/:id` — 한 건 삭제

한 건 GET 응답은 `{id,title,body}`이고, 삭제 뒤 다시 GET하면 `404`가 나도록 구현했습니다. 목록 GET은 로그인 사용자의 메모 배열을 반환합니다.

## 인증 발급자

`aleph.config.json`의 `identityProvider`에는 공개 정보만 기록합니다.

- issuer: `https://lktbmcgmnfcundifrvxs.supabase.co/auth/v1`
- audience: `authenticated`
- jwksUrl: `https://lktbmcgmnfcundifrvxs.supabase.co/auth/v1/.well-known/jwks.json`

서버 전용 `SUPABASE_SECRET_KEY`는 Vercel 환경변수에만 두고 GitHub에는 넣지 않습니다.

## 4단계에서 고칠 허점

목록과 추가는 서버가 확인한 사용자 ID를 사용하지만, **`/api/notes/:id`의 조회·수정·삭제에는 아직 소유자 검사가 없습니다.** 따라서 로그인한 B 사용자가 A의 메모 UUID를 알고 있으면 접근할 수 있는 허점이 남아 있으며 4단계에서 보완합니다.

## 현재 확인 상태

- 무로그인 자료 요청을 `401`로 거부하도록 구현했습니다.
- `/data.json`은 계속 `{"notes":[]}` 상태입니다.
- `X-Content-Type-Options: nosniff` 보안 헤더 설정을 유지합니다.
- GitHub 최신 파일에서 서버 전용 키 패턴을 검색했을 때 발견되지 않았습니다.
- Supabase Auth에 아직 A 테스트 계정이 없어, **A 계정 실제 로그인·로그아웃 및 CRUD 성공 시험은 이 저장점 작성 시점에 미실행**입니다.

## 다시 실행하기

로컬 정적 빌드는 다음 명령으로 확인합니다.

```sh
npm run build -- --local
```

Production에서는 Vercel에 `SUPABASE_URL`과 `SUPABASE_SECRET_KEY`를 환경변수로 설정한 뒤 GitHub `main`을 배포합니다.

실제 로그인 확인은 Supabase Authentication에 테스트 계정 A를 만든 뒤 Production 첫 화면에서 이메일·비밀번호로 로그인하고, 로그인 전/후 화면 상태와 메모 추가·수정·삭제를 확인합니다.

비밀번호, JWT, 서버 전용 키, 실제 개인정보는 코드·로그·README·Git 커밋에 넣지 않습니다.

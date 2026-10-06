# BYTE BACK 방어전 5단계 저장점

현재 저장소는 **5단계: 자료 요청을 서버 한곳으로 모읍니다** 상태입니다.

- 저장소: https://github.com/youmjjang/choi-bujang-secret-vault
- Production: https://choi-bujang-secret-vault-6trg.vercel.app
- 단계 설정: `aleph.config.json`의 `step: 5`
- 원본 자료 API: `https://lktbmcgmnfcundifrvxs.supabase.co/rest/v1/learning_notes`

## 현재 동작

이메일·비밀번호 로그인/로그아웃과 메모 자료의 읽기·추가·수정·삭제를 모두 Vercel 서버 함수로 요청합니다. 브라우저 코드에는 Supabase publishable/anon 키를 두지 않습니다.

서버는 공식 시작 틀의 `src/verify-login.mjs`로 토큰을 검증하고, 검증된 `login.userId`와 DB의 `owner_id`를 비교합니다. URL이나 요청 본문의 사용자 ID·역할·`owner_id`를 신뢰하지 않습니다.

자료 API는 다음 경로를 사용합니다.

- `GET /api/notes`
- `POST /api/notes`
- `GET /api/notes/:id`
- `PUT /api/notes/:id`
- `DELETE /api/notes/:id`

한 건 응답은 `{id,title,body}`, 수정 본문은 `{title,body}`를 유지합니다. 서버 전용 `SUPABASE_SECRET_KEY`는 Vercel 환경변수에만 두고 GitHub에는 넣지 않습니다.

## 4단계 보호 상태

`public.learning_notes`에는 본인 행만 허용하는 RLS 정책이 유지되어 있습니다. A/B 계정으로 각자 자기 메모만 보이는 것을 확인했고, B가 A 메모 UUID로 직접 GET 요청했을 때 자료 없이 `404`로 거부되는 것도 확인했습니다.

## 5단계 직접 권한 회수 상태

원본 Supabase Data API를 브라우저 역할로 직접 부르는 길을 닫기 위해 `public.learning_notes`의 `PUBLIC`, `anon`, `authenticated` 직접 테이블 권한을 모두 회수했습니다. 확인 결과 `anon`과 `authenticated` 모두 SELECT·INSERT·UPDATE·DELETE 직접 권한이 없고, 서버 함수가 사용하는 `service_role`만 CRUD 권한을 유지합니다.

다른 테이블은 변경하지 않았습니다.

## 현재 확인 상태

- 브라우저 코드에는 메모 자료를 Supabase Data API에서 직접 읽거나 고치는 호출이 없고 Supabase publishable/anon 키도 없습니다.
- 로그인·로그아웃과 A 계정의 메모 읽기·추가·수정·삭제는 서버 함수 경로로 처리되도록 구성했습니다.
- 로그아웃 상태의 `GET /api/notes`는 자료 없이 `401` JSON 오류로 거부됩니다.
- `/data.json`은 `{"notes":[]}` 상태를 유지합니다.
- `X-Content-Type-Options: nosniff` 보안 헤더 설정을 유지합니다.
- `originalApiUrl`에는 쿼리 없는 원본 Supabase 자료 API HTTPS 경로를 기록했습니다.
- 원본 Data API의 직접 테이블 권한은 PUBLIC·anon·authenticated에서 회수된 상태를 확인했습니다.

## 다시 실행하기

로컬 정적 빌드는 다음 명령으로 확인합니다.

```sh
npm run build -- --local
```

Production에서는 Vercel의 서버 전용 환경변수를 유지한 채 GitHub `main`을 배포합니다.

비밀번호, JWT, 서버 전용 키, 실제 개인정보와 실제 메모 본문은 코드·로그·README·Git 커밋에 넣지 않습니다.

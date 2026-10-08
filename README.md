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

## 보너스 XDR-01 제작 상태

공식 시작 저장소의 Wazuh 형식 시험 경보와 실행기를 가져왔습니다. 원본 경보는 변경하지 않았습니다.
`read-alerts.mjs`는 경보당 시각·출발 주소·계정·수준·설명 다섯 항목을 읽으며 비밀값을 제거합니다.
`patterns.json`은 MITRE ATT&CK T1110.001/T1110.003 근거를 기록합니다. 수치 임계값은 수업용 로컬 정책입니다.
명확한 반복 실패/비밀번호 분사는 규칙으로 판단하고, 애매한 실패만 Jev로 보냅니다.
확신도 0.85 이상 block, 0.5 이상 alert, 그 아래 record이며 Jev 장애·키 미설정은 alert입니다.

실행: `npm run xdr:run -- brute-force` → `xdr/brute-force/result.json`.
추가 검증: `npm run xdr:check`, `npm run test:xdr`.
Jev의 공식 API는 https://api.typesafe.ai/v1/systemone 입니다.
https://console.typesafe.ai 에서 받은 키를 서버의 `TYPESAFE_API_KEY` 비밀 환경변수로 설정합니다.
키를 채팅·Git·브라우저 코드에 넣지 않습니다. Jev에는 원본 IP·계정·비밀번호 대신 실패 건수 등 파생 지표만 보냅니다.
현재 실제 Jev 호출은 미실행이며 키 없는 fallback과 모의 API 응답만 검증했습니다.

`enforce.mjs`는 기존 판정 함수를 유지하는 sidecar 연결과 15분 임시 거부 규칙을 제공합니다.
각 규칙에 근거 경보 번호·생성 시각·만료 시각을 기록합니다. `xdr:check`는 시험 시각에 재생하며
`replay-deny-rules.json`과 `xdr/alerts.log`를 만들지만 실제 차단 규칙과 구분합니다.
과거 시험 경보로 현재 유효한 운영 차단을 생성하지 않습니다. 이 파일들은 Git에서 제외합니다.

**운영 연결은 미완료입니다.** 이 저장소에는 6단계 SDP 판정기와 운영 릴레이가 없습니다.
공식 SDP 요청 계약에는 출발 IP도 없습니다. 운영에서 검증한 출발 주소를 sidecar에 전달하는
계약과 허용 reasonCode를 확인해야 실제 ZTNA에 연결할 수 있습니다. 임의 IP 필드나 신뢰할 수 없는
브라우저 헤더를 만들어 차단하지 않습니다. 5단계 로그인·메모 API와 설정은 보존했습니다.
로컬 재생 결과나 모의 연동 검증을 심판 통과·운영 방어 완료로 표현하지 않습니다.

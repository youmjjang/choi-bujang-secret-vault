# BYTE BACK 방어전 6단계 저장점

현재 저장소는 **6단계: 등록한 기기만 자료실에 들어옵니다**의 학생 판정기 구현 상태입니다. 기존 5단계 서비스와 보너스 XDR 작업은 유지합니다.

- 저장소: https://github.com/youmjjang/choi-bujang-secret-vault
- Production: https://choi-bujang-secret-vault-6trg.vercel.app
- 단계 설정: `aleph.config.json`의 `step: 6`
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

**운영 연결은 미완료입니다.** 6단계 SDP 판정기 규칙은 추가되었지만 운영 릴레이는 아직 연결되지 않았습니다.
공식 SDP 요청 계약에는 출발 IP도 없습니다. 운영에서 검증한 출발 주소를 sidecar에 전달하는
계약과 허용 reasonCode를 확인해야 실제 ZTNA에 연결할 수 있습니다. 임의 IP 필드나 신뢰할 수 없는
브라우저 헤더를 만들어 차단하지 않습니다. 5단계 로그인·메모 API와 설정은 보존했습니다.
로컬 재생 결과나 모의 연동 검증을 심판 통과·운영 방어 완료로 표현하지 않습니다.

## 보너스 XDR-02 저장점

`xdr/web-injection/`은 웹 입력 조작 경보를 처리합니다. SQL 구문 결합, 스크립트 삽입,
경로 이탈, 명령 구분자 근거와 반복 건수를 함께 봅니다. 고수준 경보(10 이상)·5회 이상
반복·명확한 주입 근거가 모두 있을 때만 규칙 기반 차단 후보가 됩니다. MITRE T1190에
근거를 기록하되 수치 임계값은 로컬 정책으로 구분했습니다. 단독 수업 단어나 따옴표는
차단 근거가 아닙니다. 애매한 경보만 Jev에 파생 지표로 질문하고 실패하면 alert로 유지합니다.

실행: `npm run xdr:run -- web-injection`.
재생·차단 만료·정상 통과 확인: `npm run xdr:check:web`.
검증: `npm run test:xdr` 및 `node --experimental-vm-modules scripts/check-isolated-decider.mjs web-injection`.
판단 모듈은 Node 내장 모듈·npm 패키지를 import하지 않으며 경보 읽기는 별도 파일입니다.
알림은 로컬 `xdr/alerts.log`, 재생 차단은 해당 모듈의 `replay-deny-rules.json`에 남깁니다.
운영 차단 연결과 Jev 실호출의 미확인 범위는 위 XDR-01과 같습니다. 정상 요청이 통과하는
기존 로그인·메모 API를 바꾸지 않았습니다.

## 6단계 등록 기기 판정기 확인 순서 (로컬 연습)

공식 시작 저장소의 `scripts/decider-test.mjs`, `scripts/fixture-7.mjs`를 추가했습니다. `src/decider.mjs`의 `device_registered` 규칙은 `request.deviceRegistered === true`인 자료실 읽기(`GET /notes`, `GET /notes/:id`)만 허용합니다. 미등록 또는 값 누락 시 `deny` / `device_not_registered`를 반환합니다. 다른 요청은 기존 `starter.deny`로 거부합니다.

1. 저장소에서 `src/decider.mjs`와 공식 가상 요청 테스트 두 파일이 있는지 확인합니다.
2. Node.js 22 이상에서 저장소 루트의 `npm run decider:test`를 실행합니다. 별도 접속 프로그램 설치는 없습니다.
3. `통과 · 등록 기기의 정상 요청`이 출력되는지 확인합니다 (`allow`).
4. `통과 · 미등록 기기의 가상 요청`이 출력되는지 확인합니다 (`deny`, 이유 `device_not_registered`).
5. 이 명령은 가상 요청 연습이며 운영 릴레이와 심판의 미등록 기기 공격 검증을 대신하지 않습니다. 미등록 기기 공격은 심판이 수행합니다.

검증 기록: 판정 코드와 두 가상 요청을 로컬에 재구성하여 `npm run decider:test`를 실행했을 때 두 항목이 통과했습니다. 저장소 전체를 그대로 체크아웃해 공식 스크립트를 실행한 결과는 아직 확인하지 않았습니다. 실제 심판 판정·운영 연결·배포는 미확인입니다.

## 6단계 저장점과 제출 묶음 상태

- 판정 규칙: `device_registered` (등록된 기기 + 자료실 읽기 요청만 `allow`; 미등록/누락은 `deny` · `device_not_registered`). 다른 요청은 `starter.deny` 유지.
- 로컬 확인 명령: `npm run decider:test`. 시험 요청은 심판의 공격 판정이 아닙니다.
- 제출 묶음 명령: `npm run bundle`. 실행 전에 Git 작업 트리가 깨끗하고, Git에서 제외된 `bundle-notes.json`과 실제 확인 결과를 기록하는 `src/attack-check.mjs`가 필요합니다.
- 본 저장점에서는 별도 접속 프로그램, 인증서, 개인키를 생성하지 않았습니다. 운영 릴레이 연결 및 심판 방어 결과는 미확인입니다.
- 작성 환경에서 GitHub 저장소 복제가 네트워크 DNS 문제로 실패했으므로 전체 저장소 대상으로 `npm run bundle`을 실제 완료했다고 주장하지 않습니다. 실행 로그와 제출 JSON은 추후 현지 확인이 필요합니다.

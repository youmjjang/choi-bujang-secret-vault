# BYTE BACK 방어전 8단계 저장점

**7단계 해야 할 일 모두 완료. 사용자 직접 확인 결과 모두 통과 (2026-10-13).**

현재 저장소는 **8단계: 자료마다 갈 수 있는 구역을 나눕니다**의 자원 ID·경로 검사·API 소유자 재확인을 구현한 상태입니다. 기존 기기·이상 접속 규칙, 로그인·메모 기능, 보너스 XDR 작업은 유지합니다. 7단계는 사용자 직접 확인 결과 모두 통과했습니다. 8단계의 판정기 소유자 대응 계약과 저장된 강사 권한 연결은 아직 없습니다.

- 저장소: https://github.com/youmjjang/choi-bujang-secret-vault
- Production: https://choi-bujang-secret-vault-6trg.vercel.app
- 단계 설정: `aleph.config.json`의 `step: 8`
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

검증 기록 (2026-10-13): 저장소를 실제 복제하여 `npm run decider:test`를 실행했고 두 항목 모두 통과했습니다. 이는 로컬 가상 요청 연습입니다. 실제 심판 판정과 운영 릴레이 연결은 미확인입니다.

## 6단계 저장점과 제출 묶음 상태

- 판정 규칙: `device_registered` (등록된 기기 + 자료실 읽기 요청만 `allow`; 미등록/누락은 `deny` · `device_not_registered`). 다른 요청은 `starter.deny` 유지.
- 로컬 확인 명령: `npm run decider:test`. 시험 요청은 심판의 공격 판정이 아닙니다.
- 제출 묶음 명령: `npm run bundle`. 실행 전에 Git 작업 트리가 깨끗하고, Git에서 제외된 `bundle-notes.json`과 실제 확인 결과를 기록하는 `src/attack-check.mjs`가 필요합니다.
- 본 저장점에서는 별도 접속 프로그램, 인증서, 개인키를 생성하지 않았습니다. 운영 릴레이 연결 및 심판 방어 결과는 미확인입니다.
- 저장소 복제 후 첫 묶음 오류인 `bundle-notes.json` 누락을 실제 확인 내용으로 보완했습니다. 이후 누락된 `src/attack-check.mjs`를 추가했습니다. 묶음의 자기 점검은 공개 화면, 빈 공개 자료, 비로그인 자료 요청의 실제 HTTP 응답만 기록하며 심판 판정으로 표현하지 않습니다.
- 6단계 설정을 거부하던 빌드와 배포 식별 검증을 6단계까지 허용하도록 수정했습니다. `npm run build -- --local`이 통과했습니다.
- 실제 공개 주소 점검에서 `/`는 로그인 화면과 HTTP 200, `/data.json`은 빈 `notes`와 HTTP 200, 비로그인 `/api/notes`는 자료 없는 JSON 오류와 HTTP 401을 반환했습니다. 로그인 후 CRUD·등록 기기 운영 접속·심판 공격은 이번 점검에서 미실행입니다.
- 다시 실행: `npm run decider:test` → `npm run build -- --local` → Git 작업 트리를 확인·커밋 → `npm run bundle`. 생성된 `public/data.json`은 빌드 산출물이며 커밋 대상이 아닙니다. `bundle-notes.json`과 `artifacts/submission.json`도 커밋하지 않습니다.
- 방어전 화면의 `내 배포 주소`와 `내 GitHub 저장소 주소`에 위 주소를 입력합니다. 최종 `심판에게 제출하기`는 학생이 직접 누릅니다.

## 7단계 저장점: 가상 사건과 재로그인 계약 확인

7단계 저장점 당시 단계 설정은 7단계였습니다. 「7단계 저장점」 커밋 `2ac14f9449f9`를 GitHub `main`에 푸시했고, 공개 배포의 `/aleph.json`에서도 `step: 7`과 동일 커밋을 확인했습니다. 7단계 코드·빌드·가상 사건 테스트·제출 묶음 생성·배포 반영까지 완료했습니다. 이후 사용자가 7단계 해야 할 일을 직접 확인했고 모두 통과했다고 보고했습니다. 제출은 학생이 직접 수행합니다.
입력 검사에서 `judge_fixture` 가상 사건과 `none` 정보 없음을 구분하고, 클라이언트 헤더를
신뢰 정보로 승격하지 않습니다. 누락된 접속 정보에 정상값을 만들어 넣지 않습니다.
기존 기기 규칙을 유지하며 가상 사건의 0~5시·`unusual` 네트워크·최근 300초 내
`risk_signal` 건수 20 이상 조합에 `step_up` / `step_up_required`를 반환합니다.
수치는 로컬 연습 정책이며 지역 하나만으로 차단하지 않습니다.

확보한 공식 `docs/DECIDER_REQUEST.md` 계약은 `{verified, authAgeSeconds}`를 설명하지만
이 값만으로 재인증 확인 요청을 건너뛰지 말라고 명시합니다. 코드 작업 당시에는 같은 주체의
새 로그인 시각 검증과 재판정의 운영 연결을 확인하지 못했습니다. 이후 사용자 직접 확인에서
7단계 항목이 모두 통과했다고 보고되어 완료 상태로 갱신했습니다.
토큰 발급 시각을 새 로그인 증거로 간주하거나 클라이언트의 성공 표시를 신뢰하지 않습니다.

확인 명령: `npm run fixture:7`, `npm run decider:test`,
`node --test test/connection-input.test.mjs test/step-up.test.mjs`.
가상 사건에서 확인 전 `step_up`, 확인 결과를 모의 입력한 새 요청에서 `allow`를 시험합니다.
이 명령들의 결과는 가상 사건 시험입니다. 실제 화면 확인은 사용자가 수행했고,
7단계 확인 항목 모두 통과했다고 보고했습니다 (2026-10-13). 토큰 원문은 기록하지 않습니다.

저장점 확인: 가상 사건은 정상 `allow`, 복합 이상 `step_up`, 재확인 모의 새 요청 `allow`입니다.
입력·규칙 테스트 5개와 `decider:test` 4개가 통과했습니다. 빌드와 배포 식별 검증은 7단계를 지원합니다.
다시 실행: `npm run fixture:7` → `npm run decider:test` → `npm run build -- --local` → `npm run bundle`.
묶음의 HTTP 자기 점검은 현재 공개된 자료실의 응답만 기록하며 7단계 실측 증거가 아닙니다.

## 8단계 저장점

메모는 notes:collection 및 notes:<기존 UUID>, 공지는 notices:collection으로 서버 응답 헤더에서 구분합니다. 기존 URL·자료·화면 메뉴는 유지합니다. 공지 원본이 없어 GET /api/notices는 로그인 후 빈 목록을 반환합니다.

판정기는 메서드·서비스·정확한 경로를 대조하고 export 등 기능 경로와 검증할 수 없는 쿼리를 거부합니다. 기기 및 step_up 규칙은 유지합니다. subjectId와 소유자의 검증된 대응 계약이 없어 판정기의 메모 수정은 거부합니다. 자기 메모 수정 허용과 강사 권한 허용은 미구현입니다.

자료 API는 검증한 사용자와 저장된 owner_id를 쿼리 및 반환 행에서 재확인합니다. 요청 본문의 role을 권한으로 인정하지 않습니다. 공지 수정은 instructor_permissions에 저장된 user_id, active, can_edit_notices를 검증된 로그인 사용자와 대조합니다. 권한 없음은 403/instructor_required, 권한 조회 실패는 503/permission_check_failed입니다. 거부 사유는 X-Aleph-Deny-Reason 헤더에 남깁니다.

다시 실행: node --experimental-vm-modules --test test/api-resource-access.test.mjs test/resource-boundary.test.mjs test/resource-id.test.mjs test/connection-input.test.mjs test/step-up.test.mjs → npm run decider:test → npm run build -- --local → npm run bundle.

API 자동 검증은 모의 DB·검증된 모의 사용자에 대한 격리 테스트입니다. 사용자 화면에서 실제 본인 메모 수정 200 및 다른 계정의 같은 메모 조회 404가 확인됐습니다. 이것만으로 심판의 구역 규칙 통과를 주장하지 않습니다.

강사 공지 API 보완: GET /api/notices와 GET·PUT /api/notices/:id를 instructor_notices에 연결했습니다. DB에 권한표와 빈 공지표를 만들었으며 일반 사용자·익명 역할은 직접 읽기·수정 권한이 없습니다. 강사 권한을 임의로 부여하거나 공지 내용을 만들어 넣지 않았습니다. 현재 강사 권한 0건·공지 0건이므로 실제 강사 계정의 수정 성공은 미실행입니다. 화면 메뉴와 기존 메모 자료는 보존했습니다.

확인: node --experimental-vm-modules --test test/api-resource-access.test.mjs test/notice-permissions.test.mjs test/resource-boundary.test.mjs (11개 통과). 일반 학생의 공지 PUT은 403, 저장된 활성 강사 권한의 모의 PUT은 200입니다. 실제 심판 S08_OTHER_ZONE_ALLOWED 해결은 아직 확인되지 않았습니다.

### S08_OTHER_ZONE_ALLOWED 수정
심판은 4e85973553ce의 다른 구역 메모 조회가 허용됐다고 판정했습니다. 판정기에서 UUID 형식만으로 개별 메모 읽기를 허용하던 분기를 제거했습니다. 엔진의 소유자 대응 정보가 없는 개별 자료는 거부하며 공식 로컬 demo는 반·프로젝트·주체를 함께 제한합니다. 실제 소유자의 자료실 API 읽기·수정은 기존 owner_id 검사를 유지합니다. 판정기를 통한 실제 개별 자원 정상 허용은 소유자 대응 계약이 필요합니다. 수정 후 격리 테스트 13개와 기존 decider:test 4개 통과, 심판 재판정은 아직 미실행입니다.

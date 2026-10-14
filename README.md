# BYTE BACK 방어전 12단계 저장점

**7단계 해야 할 일 모두 완료. 사용자 직접 확인 결과 모두 통과 (2026-10-13).**

현재 저장소는 **12단계: 탈환 작전실을 완성합니다**의 실제 HTTP 자기 점검·가상 규칙 시험과 가린 서버 기록 표를 추가한 상태입니다. 기존 로그인·메모·공지 API, 첨부 판정기·탐지기·복구 기능과 승인 전 화면을 유지합니다. 공식 총공세 영수증과 실제 회수·복구·기기 승인 결과는 별도이며 없는 기록을 통과로 표시하지 않습니다.

- 저장소: https://github.com/youmjjang/choi-bujang-secret-vault
- Production: https://choi-bujang-secret-vault-6trg.vercel.app
- 단계 설정: `aleph.config.json`의 `step: 12`
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

사용자 요청에 따라 마지막 첨부 파일을 src/decider.mjs로 그대로 복사했습니다. 파일 해시가 원문과 동일합니다. 함수, 구역 규칙, 수치와 비동기 반환도 원문 그대로이며, 이전 구역 정책을 대신 연결하지 않았습니다.

보너스 전용 xdr 디렉터리, 실행·점검 스크립트 4개, 보너스 테스트 2개 및 npm의 보너스 실행 명령을 저장소에서 제거했습니다. 로컬 복구 사본과 Git 이력은 보존합니다. 일반 자료실 API와 메모·공지 DB는 변경하지 않았습니다.

실제 실행: npm run decider:test의 가상 요청 4개가 통과했습니다. 전체 기존 테스트 통과를 주장하지 않습니다. 원문에 readConnectionInput 및 createDecider export가 없으므로 이전 판정기 내부 함수에 의존한 테스트는 이 판정기와 호환되지 않습니다.

현재 판정기는 첨부 원문의 ID 이름 비교 및 단건 경로 정책을 사용합니다. 이 코드의 공식 8단계 통과는 미확인입니다. 본인 목록 경로를 거부할 수 있고 가명 주체와 실제 소유자의 검증된 대응을 구현한 것은 아닙니다.

자료 API는 기존 검증된 로그인 사용자 및 owner_id 비교와 저장된 강사 권한 검사를 유지합니다. bundle의 HTTP 자기 점검은 공개 자료실의 실제 응답만 기록하며 심판 통과 증거가 아닙니다. bundle-notes.json과 artifacts/submission.json은 커밋하지 않습니다.

## 9단계 저장점

src/detect.mjs의 detect(events)는 공식 docs/DETECT_EVENTS.md 계약에 따라 같은 가명 주체의 GET이 어느 10분 구간에서든 120건을 초과할 때만 {action:propose_revocation, reasonCode:burst_read, subject}를 반환합니다. 정상·정확히 120건·서로 다른 주체·10분 밖 조회는 observe입니다. 입력에서는 시각·가명 주체·요청 종류만 선택하며 메모 내용·토큰·실명을 저장하거나 출력하지 않습니다.

로컬 계약에는 기기·네트워크가 없으므로 값을 만들지 않습니다. 별도 detectVerifiedRequests(requests)는 엔진이 검증한 aleph.decision.v1 입력에서 등록된 가상 기기·가명 주체·시각·GET 및 judge_fixture 출처의 unusual 네트워크만 사용합니다. 같은 주체·기기에서 이상 네트워크와 10분 내 120건 초과가 함께 나타날 때만 subject와 deviceId 하나를 포함한 burst_read 회수 제안을 반환합니다. 지역 하나·정상 네트워크·다른 기기의 사건 합산·클라이언트 헤더는 제안 근거로 인정하지 않습니다.

기존 decide 응답 다섯 항목과 첨부 판정기는 변경하지 않았습니다. 회수 API·권한 변경·실제 집행은 추가하지 않았습니다. 별도 기기 탐지 함수의 운영 사건 전달 연결과 실제 회수·경과 시간은 미실행이며 심판이 확인해야 합니다.

실행: node --test test/detect.test.mjs (3개 통과), npm run detect:test (공식 가상 사례 6개 통과), npm run decider:test (기존 4개 통과), npm run build -- --local (통과). 정상 사건은 observe, 복합 기기 사건은 대상과 이유가 있는 propose_revocation입니다. npm run bundle은 공개 자료실에 실제 보내는 HTTP 자기 점검이며 회수 실측이나 심판 통과를 의미하지 않습니다.

## 10단계 저장점

시험 정책: src/trial-policy-restore.mjs에서 신뢰하는 해시로 사본을 검증하고 previewPolicyRestore가 사본 버전·현재 버전·메모 서비스의 변경 범위를 먼저 반환합니다. applyTrialPolicyRestore는 그 미리보기의 confirmationHash가 일치할 때만 시험 정책을 복원하며 다른 서비스 규칙과 감사 배열을 보존합니다. 운영 판정기·DB 권한은 이 절차로 바꾸지 않습니다. 사본 없음·검증 실패·확인 누락은 중단합니다.

자료 복구: notes 서비스의 POST /api/restore/:noteId (aleph.config.json.restoreRoute). 검증된 심판 신원 identity=b의 소유 메모만 허용합니다. 요청 본문으로 ID·소유자·내용·권한을 받지 않습니다. 신규 메모가 처음 INSERT될 때 서버 트리거가 note_restore_backups에 비공개 원본과 소유자·내용 SHA-256·정책 SHA-256을 저장합니다. 사본은 수정·삭제된 메모와 별도로 남고 최초 값은 덮어쓰지 않습니다. 기존 9개 메모에 사전 백업이 있었다고 꾸미지 않았으며 사본 없는 메모는 409/verified_backup_missing으로 중단합니다.

복구 RPC는 대상 ID·검증된 소유자·내용 해시·정책 해시를 확인하고 한 건만 원래 내용으로 복원합니다. 새로 조회한 결과의 해시도 다시 확인하며 감사 행을 추가합니다. 감사 삭제 권한은 부여하지 않았습니다. 백업·감사는 일반 사용자와 익명이 읽을 수 없습니다. 메모 본문·토큰·개인정보를 Git·묶음·로그에 넣지 않습니다. 정책 해시는 UTF-8과 LF 줄바꿈으로 정규화합니다.

실측: service_role로 실행한 트랜잭션에서 합성 B 메모의 변조 복구 및 삭제 복구, A의 B 복구 거부, 잘못된 정책 해시 거부, 다른 메모·감사 이력 보존을 검증하고 전체 ROLLBACK했습니다. 이후 기존 메모 9개 유지, 시험 백업·감사 0건, 일반 사용자 백업 읽기와 익명 RPC 실행 및 service_role 감사 삭제 권한 없음이 확인됐습니다. 이것은 DB 합성 시험이며 실제 서명된 심판 B의 HTTP 복구 실측은 아직 미실행입니다.

복구 전후 재시험 순서:
1. 사전 정책 사본·신뢰 해시를 다시 읽고 previewPolicyRestore의 버전과 notes 변경 범위를 확인합니다. 사본이 없거나 다르면 중단합니다.
2. 확인한 해시로 시험 정책만 복원하고 A 정상 읽기 허용·B의 A 읽기 거부 및 다른 서비스·감사 보존을 시험합니다: node --test test/restore.test.mjs.
3. 심판 B만 신규 가상 메모를 만들고 비공개 원본 생성 후 변조 또는 삭제합니다. POST /api/restore/<그 메모 UUID>에 기존 B 인증을 보내고 ID·소유자·내용 해시가 원본과 같은지 검증합니다. 실제 심판 계정 시험은 미실행입니다. 토큰을 출력하지 않습니다.
4. 일반 API 정상 본인 읽기·수정, 타인 읽기·수정 거부, 타인 목록 거부 및 학생 공지 수정 거부를 다시 시험합니다: node --experimental-vm-modules --test test/api-resource-access.test.mjs test/notice-permissions.test.mjs test/note-target.test.mjs.
5. 기존 가상 기기·복합 이상·재확인 및 조회 폭주를 확인합니다: npm run decider:test → npm run detect:test. 실제 회수·복구 후 탈취 세션 재접속·운영 엔진 정책 재판정은 미실행입니다.
6. npm run bundle로 공개 페이지·빈 공개 자료·로그인 없는 메모 조회 거부·로그인 없는 복구 거부를 실제 요청으로 기록합니다. 이 자기 점검을 심판 통과로 표시하지 않습니다.

## 11단계: 접속 앱과 기기 승인 화면

- `public/manifest.json`, 앱 아이콘, 오프라인 전용 안내와 service worker를 추가했습니다. 캐시는 공개 오프라인 안내만 저장하고 메모·API 응답·로그인 화면은 저장하지 않습니다. 설치는 기기 승인을 의미하지 않습니다.
- 로그인 토큰은 현재 페이지의 메모리에만 두며 이전 `byte-back-session` 저장값은 제거합니다. 새로고침하면 다시 로그인합니다. 개인키를 생성하거나 저장하지 않습니다.
- 승인 요청 버튼은 `POST /api/device/request`, 상태 확인은 `GET /api/device/status`를 호출합니다. 화면은 HTTP 200의 `approved === true`만 승인으로 사용합니다. 버튼 클릭·로그인·설치·요청 접수는 승인 근거가 아닙니다.
- 승인 전·오프라인·로그아웃에서는 메모 제목·본문·편집 화면을 지우고 보호 API를 요청하지 않습니다. 늦게 도착한 승인 응답도 로그아웃 뒤 화면을 열 수 없습니다.
- **실제 승인 연결의 정확한 차단점:** 이 저장소와 단계 안내에는 제공 엔진의 등록 요청 API, 서버가 검증할 기기 세션/서명 계약이 없습니다. 상태 API는 승인 전 `approved:false`, 요청 API는 `501`·`accepted:false`·`device_approval_contract_unavailable`을 반환합니다. 접수·승인을 완료했다고 기록하지 않습니다. 가짜 헤더로 승격하거나 별도의 기기 인증 체계를 만들어 엔진 규칙을 대체하지 않습니다.
- 제공 엔진의 요청 서명 확인은 학생 화면의 책임으로 옮기지 않았습니다. 기존 자료 API의 로그인·소유자·강사 권한 검사와 판정기를 유지했습니다. 운영 서명 없는 요청·경로/본문 변경의 실제 엔진 시험은 미실행입니다.
- 관련 로컬 시험 19개, `npm run decider:test`의 가상 요청 4개, `npm run detect:test`의 가상 사건 6개와 `npm run build -- --local`이 통과했습니다. 승인된 서버 응답을 넣은 화면 단위시험은 실제 기기 승인 실측이 아닙니다.

다시 실행할 명령:

```sh
node --experimental-vm-modules --test test/device-approval.test.mjs test/api-resource-access.test.mjs test/notice-permissions.test.mjs test/note-target.test.mjs test/restore.test.mjs test/detect.test.mjs
```

직접 확인: 자료실에서 로그인한 뒤 승인 전에는 자료가 없어야 합니다. ‘기기 승인 요청’을 누르면 엔진 연결 미완료를 표시하고 자료가 열리지 않아야 합니다. 실제 승인된 기기의 기존 화면 확인은 제공 엔진 계약이 연결된 환경에서 시행해야 하며 현재 배포에서는 미실행입니다. 학생이 직접 최종 제출합니다.

## 12단계: 실제 기록을 읽는 탈환 작전실

학생 몫은 `src/decider.mjs` 판정기, `src/detect.mjs` 탐지 규칙, `public/` 접속 앱, `api/` 자료실과 작전실 자기 점검입니다. **제공 엔진은 ALEPH SDP 엔진 사용**으로 출처를 구분합니다. 제공 엔진의 기기 등록·요청 서명 검증·정책 집행·회수·공식 심판 기록을 이 저장소의 화면 문구로 대신하지 않습니다. Supabase Auth는 로그인 검증에 사용합니다.

`GET /api/checks`는 현재 배포에서 고정 자기 점검을 실행하고 메타데이터만 반환합니다. 공개 화면·빈 공개 자료·무인증 및 위조 신원 거부 등 실제 HTTP 9개와 판정기·탐지기 고정 가상 시험 7개를 분리합니다. 본인 인증 API·원본 Data API·실제 회수·실제 복구·승인 기기 시험 5개는 필요한 운영 인증/계약이 없어 미실행으로 남깁니다. 요청 ID는 학생 점검 UUID이며 별도로 얻은 Vercel 서버 요청 ID는 `serverRequestId`입니다. 두 값은 제공 엔진 영수증 ID가 아닙니다.

화면의 수치는 같은 응답의 행을 합산합니다. 실행 오류는 미실행, 기대와 다른 HTTP/판정 결과는 불일치입니다. 서버 응답 본문, 로그인 토큰, 메모 내용, 실제 사용자 ID와 원문 오류는 반환하지 않습니다. 정책·복구 기준 버전은 검사한 판정기 파일의 UTF-8/LF SHA-256입니다. 회수는 가상 사건의 제안과 실제 집행을 분리합니다.

공식 41종은 이 자기 점검과 다른 시험입니다. 공식 사례 카탈로그와 실행 영수증이 연결되지 않았으므로 이 보고서에서는 실행 0·방어 확인 0·미실행 41로 표시합니다. 앞 단계에서 알레프가 표시한 통과 이력도 이 커밋의 총공세 실측으로 옮겨 적지 않습니다. 12단계 최종 통과와 41종 방어는 학생이 제출한 뒤 공식 심판에서 확인합니다.

### 검사한 커밋에서 설치·실행·중지·복구

1. 설치: `git clone https://github.com/youmjjang/choi-bujang-secret-vault`, 해당 폴더로 이동, `git checkout <제출 묶음 JSON의 commit>`, Node.js 22 이상에서 `npm ci`. 별도 접속 프로그램은 없습니다. 서버 비밀값은 Vercel 공식 환경변수 설정에만 둡니다.
2. 실행: `npm run build -- --local`로 정적 빌드 확인. 실제 API는 기존 Vercel 프로젝트에 같은 커밋을 배포합니다. Production 식별 JSON의 commit과 제출 묶음의 commit을 대조합니다. 앱의 ‘탈환 작전실’에서 ‘실제 기록 새로 확인’을 누르고 ‘가린 서버 기록 JSON 받기’로 같은 응답을 저장합니다.
3. 재현 시험: `node --experimental-vm-modules --test test/operations-report.test.mjs test/device-approval.test.mjs test/api-resource-access.test.mjs test/notice-permissions.test.mjs test/note-target.test.mjs test/restore.test.mjs test/detect.test.mjs`. 관련 21개가 통과했습니다. 이어 `npm run decider:test`, `npm run detect:test`, `npm run build -- --local`. 가상 시험을 운영 시험으로 보고하지 않습니다.
4. 중지: Vercel 프로젝트 설정에서 프로젝트를 일시 중지하거나 제공 엔진의 공식 관리 화면에서 보호 경로 집행을 중지합니다. DB·백업·감사를 삭제하지 않습니다. 이 안내의 중지 조작은 실행하지 않았습니다.
5. 복구: `git status`와 `git diff`를 확인하고 다른 작업을 보존합니다. 이미 배포돼 있는 직전 정상 커밋을 Vercel Instant Rollback으로 되돌리는 안을 검토하고 사용자의 확인 뒤 실행합니다. 코드 복원은 해당 단계 파일만 지정해 안전하게 복원하고 별도 커밋합니다. `reset --hard`는 사용하지 않습니다. 자료 복구는 앞 절의 검증된 한 건 복원 절차를 따릅니다.
6. 복구 뒤 본인 허용·타인 거부·무인증 거부를 다시 실행합니다. 실제 인증이 필요한 시험을 수행하지 못하면 미실행으로 남깁니다.
7. 커밋 후 `npm run bundle`을 실제 실행합니다. `bundle-notes.json`, `artifacts/submission.json`은 Git에서 제외하며 메모 내용·비밀값을 포장하지 않습니다. 묶음의 실제 HTTP 점검과 작전실 기록은 학생의 자기 점검이고 공식 심판 판정이 아닙니다.

### 12단계 가산 조건 재현 확인 (2026-10-14)

- 원격 저장소를 새로운 폴더에 복제해 실제 `npm install`을 실행했습니다. 종료 코드 0, 10개 패키지 설치, 취약점 0개였습니다. 별도 접속 프로그램 설치는 없습니다.
- 공식 시작 틀에서 제공된 `docs/DECIDER_REQUEST.md`를 저장소에 포함했습니다. 이 문서는 제공 엔진의 `aleph.decision.v1` 요청·응답 계약이며 학생이 임의로 새 필드를 정의한 것이 아닙니다.
- `npm run decider:contract`는 정상/금지/추가 확인을 포함한 1,296개 가상 조합에서 문서의 18개 요청 이름과 중첩 필드만 접근하는지 검사합니다. 응답의 정확한 5개 이름, 요청 ID 보존, 결정과 사유 코드 형식, RULE_IDS에 있는 중복 없는 규칙 이름 및 입력 보존을 검증했고 두 시험이 통과했습니다. 이는 해당 조합의 로컬 계약 검사이며 공식 41종 공격이나 모든 가능한 입력의 검증을 의미하지 않습니다.
- 기존 판정기 파일은 수정하지 않았고 정책/백업 기준 해시를 유지했습니다. 기존 `npm run decider:test`의 가상 요청 4개와 `npm run build -- --local`도 다시 통과했습니다.
- `aleph.config.json`의 `step: 12`를 유지했습니다. 최종 가산 점수는 공식 심판의 판정으로 확인합니다.

### 12단계 격리 묶음의 첫 오류 수정 (2026-10-14)

심판의 `S12_BUNDLE_UNSUPPORTED` 첫 오류는 묶음 점검에서 POST를 보낸 것이었습니다. `src/attack-check.mjs`에서 GET·HEAD 이외의 요청은 보내지 않고 `observed: "not_run"`으로 남깁니다. 복구 거부와 기기 승인 요청 두 점검이 여기에 해당합니다. 보호 API, 판정기와 화면 기록 API는 변경하지 않았습니다.

`node --test test/bundle-read-only.test.mjs`로 묶음 점검이 공개 HTTPS 읽기 요청 6건만 보내고 POST 두 건은 실제 전송 없이 미실행으로 기록하는 것을 검증했습니다. 기존 가상 판정 시험 4개도 통과했습니다. 이 로컬 검증은 공식 격리 심판의 재실행 성공을 대신하지 않습니다.

직접 확인: `npm run bundle` 뒤 `artifacts/submission.json`에서 `unauthenticated_restore`와 `device_request_unavailable`의 observed가 정확히 `not_run`인지 확인합니다. 최신 커밋의 두 주소로 12단계에 다시 제출하면 공식 격리 실행 결과를 확인할 수 있습니다.

### 12단계 실행 기록 연결 수정 (2026-10-14)

심판은 읽기 점검 6건에 대해 해당 attackId의 요청 기록을 찾지 못했습니다. `src/attack-check.mjs`의 실제 fetch에 공식 표본의 runner 메타데이터 `alephEvidence: {caseId: check.attackId, requestKey: "read"}`를 추가했습니다. 이는 HTTP 헤더·사용자 신원·권한 입력이 아니며, 실제 요청을 제출 점검 ID와 연결하기 위한 정보입니다. 없는 요청을 생성해 기록하지 않습니다.

읽기 전용 회귀 시험은 실제 전송 함수에 넘긴 caseId와 미실행을 제외한 묶음 attackId가 6건 모두 일치하고 중복되지 않는지 검증합니다. POST 두 건은 계속 observed `not_run`입니다. 해당 시험과 1,296개 가상 조합의 판정기 계약 검사가 통과했습니다. 자료 API·판정기·화면 수치 계산은 바꾸지 않았습니다. 공식 격리 환경의 연결 확인은 최신 커밋을 다시 제출해 시행합니다.

### 12단계 관측값 형식 수정 (2026-10-14)

실행 기록 대조가 실제 요청 ID 연결을 통과한 뒤 `observed`의 설명 문장 때문에 거부됐습니다. 실행한 읽기 점검의 observed는 실제 응답의 `HTTP <상태 코드>`만 기록하도록 수정했습니다. `PASS/FAIL`, 경로 설명, 자기 점검 설명은 관측값에 넣지 않습니다. POST 두 건은 계속 정확히 `not_run`입니다. 기대 결과와 실제 관측값을 구분하며, 공식 심판 결과를 추측으로 채우지 않습니다. 읽기 전용 회귀 시험에서 실제 전송 ID와 이 관측값 형식이 모두 검증됐습니다. 다른 API·화면·판정기는 변경하지 않았습니다.

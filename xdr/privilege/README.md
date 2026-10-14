# privilege 응답 연결

`decide.mjs`는 판단만 반환하며 파일·패키지를 불러오거나 외부 요청·파일 쓰기를 하지 않습니다. `respond.mjs`만 만료 규칙과 알림 로그를 관리합니다.

`createResponder`의 `resolveVerifiedRequest(alertId)`는 운영 서버가 근거 경보 번호를 제공 엔진의 검증 요청에 연결하는 함수입니다. Wazuh 계정명·출발 주소·본문 role을 ZTNA 가명 사용자로 복사하지 않습니다. 연결이 없거나 틀리면 `not_bound`로 기록하고 차단 규칙을 만들지 않습니다.

규칙은 확신도 0.85 이상 block 경보만 생성하고 사용자·기기·반·프로젝트·서비스·메서드·정확한 경로·쿼리 해시에 한정합니다. 경보 시각부터 5분 뒤 만료되며 근거 경보 번호를 보존합니다. 재처리로 규칙을 중복 생성하거나 만료를 연장하지 않습니다. 오래된 경보는 현재 운영 차단으로 되살리지 않습니다.

`createConnectedDecider`는 기존 판정 결과를 먼저 적용합니다. 기존 deny·step_up을 유지하고 기존 allow 중 유효한 차단 범위와 정확히 일치한 요청만 zone_access의 거부로 돌려줍니다. 기존 판정기 규칙은 변경하지 않았습니다.

alert는 규칙을 만들지 않고 `xdr/alerts.log`에 한 줄 JSON을 추가합니다. block 후보도 적용·미연결·만료 상태를 같은 로그에 남깁니다. 원문 설명·출발 IP·계정·토큰은 기록하지 않습니다. `xdr/privilege/deny-rules.json`과 알림 로그는 Git에서 제외합니다.

```sh
node --experimental-vm-modules --test test/privilege-respond.test.mjs test/privilege-decide.test.mjs test/privilege-reader.test.mjs
```

재흐름은 원본 26건·합성 검증 요청·시험 시계·임시 파일을 사용합니다. 명확한 9건만 거부하고 애매한 8건과 정상 9건의 요청은 기존 허용을 유지합니다. 운영 엔진의 등록 API 계약이 현재 저장소에 없어 실제 운영 자동 연결은 미실행입니다. 시험 성공을 실제 PC의 접속 회수 완료라고 기록하지 않습니다.

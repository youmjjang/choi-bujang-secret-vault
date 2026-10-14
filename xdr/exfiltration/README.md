# exfiltration 응답 연결

`decide.mjs`는 판단만 반환하고 import·파일 입출력·외부 요청을 하지 않습니다. `respond.mjs`가 별도로 만료 거부 규칙과 한 줄 알림을 관리합니다.

`createResponder`에는 운영 서버의 `resolveVerifiedRequest(alertId)` 상관관계 함수가 필요합니다. 경보를 엔진 검증 요청에 연결하며, Wazuh 계정·출발 IP·목적지를 ZTNA 가명 신원이나 요청 필드로 추정해서 넣지 않습니다. 연결이 없거나 틀린 경우 규칙을 만들지 않고 `not_bound`로 기록합니다.

차단은 신선한 block·확신도 0.85 이상 경보에 한정합니다. 규칙에는 근거 경보 번호와 사용자·기기·반·프로젝트·서비스·메서드·정확한 경로·쿼리 해시를 붙이고 경보 시각부터 5분 뒤 만료시킵니다. 중복 경보는 규칙을 늘리거나 만료를 연장하지 않습니다. 오래된 fixture 경보를 현재 운영 차단으로 되살리지 않습니다.

`createConnectedDecider`는 기존 판정 결과를 먼저 적용하고 deny·step_up을 그대로 유지합니다. 기존 allow 중 유효한 규칙의 정확한 범위에 맞는 요청만 zone_access 거부로 바꿉니다. 현재 요청 계약에는 목적지 필드가 없으므로 실제 목적지 전체 차단을 연결했다고 주장하지 않습니다. 제공 엔진이 검증한 목적지 계약을 별도로 제공해야 목적지 단위 집행을 추가할 수 있습니다.

alert와 block 후보의 처리 상태는 `xdr/alerts.log`에 한 줄 JSON으로 추가합니다. 경보 번호·패턴·확신도·처리 상태·만료만 기록하고 원문·계정·주소·파일 내용·토큰은 복사하지 않습니다. 생성된 `xdr/exfiltration/deny-rules.json`과 알림 로그는 Git에서 제외합니다.

```sh
node --experimental-vm-modules --test test/exfiltration-respond.test.mjs test/exfiltration-decide.test.mjs test/exfiltration-reader.test.mjs
```

재흐름은 원본 30건·합성 엔진 검증 요청·시험 시계·임시 파일로 확인합니다. 명확한 10건만 거부하고 애매한 10건과 정상 10건은 기존 허용을 유지합니다. 정상 이벤트는 차단 규칙을 만들지 않습니다. 운영 엔진 등록 계약이 현재 저장소에 없어 실제 운영 자동 연결은 미실행입니다.

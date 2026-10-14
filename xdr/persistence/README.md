# persistence 판단과 응답 연결

`decide.mjs`는 patterns.json의 세 패턴을 상수로 보관하고 경보만으로 동기 판단합니다. 다른 파일·패키지·읽기 모듈을 불러오거나 파일을 쓰거나 외부에 요청하지 않습니다. 직접 악성 근거는 block, 확인이 필요한 맥락은 alert, 확인된 정상/단순 조회는 record입니다. 임시 폴더나 규칙 수준만으로 차단하지 않습니다.

`respond.mjs`의 `createResponder`는 block·확신도 0.85 이상인 신선한 경보만 차단 후보로 처리합니다. 운영 서버가 제공한 `resolveVerifiedRequest(alertId)`로 근거 경보를 엔진 검증 요청에 연결해야 합니다. 출발 IP·계정 이름으로 가명 사용자와 기기를 추정하지 않습니다. 연결되지 않거나 오래된 경보는 거부 규칙을 만들지 않습니다.

규칙은 경보 시각부터 5분 뒤 만료되며 근거 경보 번호와 검증된 사용자·기기·반·프로젝트·서비스·메서드·정확한 경로·쿼리 해시를 저장합니다. `xdr/persistence/deny-rules.json`과 `xdr/alerts.log`는 Git에서 제외합니다. 알림은 한 줄 JSON으로 누적하고 경보 원문·파일 경로·계정·주소·토큰은 복사하지 않습니다.

`createConnectedDecider`는 기존 판정기를 먼저 실행하고 기존 거부·추가 확인을 유지합니다. 기존 허용 중 유효한 거부 규칙과 정확히 일치하는 요청만 기존 zone_access 규칙으로 거부합니다. 일반 판정기의 규칙 내용은 변경하지 않았습니다.

운영 엔진의 실제 등록 API 계약이 저장소에 없어 운영 자동 연결은 아직 실행하지 않았습니다. 제공 엔진의 공식 서버 연결로 상관관계 함수와 어댑터를 등록해야 하며, 로컬 시험을 운영 PC 접속 격리로 보고하지 않습니다.

```sh
node --experimental-vm-modules --test test/persistence-decide.test.mjs test/persistence-reader.test.mjs test/persistence-respond.test.mjs
```

이 명령은 24개 원본 경보와 합성 엔진 요청·시험 시계·임시 파일로 재흐름을 확인합니다. 명확한 공격 8건만 거부되고, 애매한 경보와 정상 이벤트의 16개 요청은 차단되지 않습니다. 정상 이벤트 8건 모두 record이며, 만료 뒤에는 기존 허용 결과로 돌아갑니다.

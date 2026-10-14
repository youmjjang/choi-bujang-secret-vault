const PATTERNS = [
  {
    "name": "unexpected_administrator_group_addition",
    "techniques": [
      "T1098.007",
      "T1078"
    ],
    "condition": {
      "fields": [
        "rule.description",
        "rule.mitre",
        "data.group",
        "data.srcuser",
        "data.count"
      ],
      "required": [
        "경보가 관리자 그룹에 계정을 추가하거나 제거된 권한을 다시 부여한 사건을 명시합니다. 단순 그룹 목록 조회는 제외합니다.",
        "평범한 계정의 비정상 권한 변경, 낯선 원격 접속, 승인된 회수 직후 재추가 등 확인된 이상 맥락을 함께 찾습니다."
      ],
      "supporting": [
        "추가 직후 관리자 명령 실행",
        "같은 출발지에서 여러 계정의 그룹 추가",
        "권한 회수 직후 반복 재추가"
      ],
      "exclude": "검증된 승인 절차에 따른 정상 관리자 그룹 변경은 제외합니다. data.group 값만 있거나 승인 정보를 읽지 못했다는 이유만으로 악성으로 단정하지 않습니다."
    },
    "evidence": "관리자 그룹 추가의 직접 근거는 MITRE T1098.007이며, 정상 계정의 권한을 악용하는 맥락은 T1078로 구분해 승인되지 않은 권한 변경을 확인합니다.",
    "sources": [
      "https://attack.mitre.org/techniques/T1098/007/",
      "https://attack.mitre.org/techniques/T1078/"
    ]
  },
  {
    "name": "unfamiliar_administrative_execution",
    "techniques": [
      "T1068",
      "T1078"
    ],
    "condition": {
      "fields": [
        "rule.description",
        "rule.mitre",
        "data.srcuser",
        "data.srcip",
        "data.count"
      ],
      "required": [
        "경보가 관리자 명령 실행 또는 세션의 관리자 권한 전환을 명시합니다.",
        "막 관리자 그룹에 들어온 계정, 처음 보는 접속 경로, 다른 계정의 권한 사용 등 확인된 비정상 권한 사용 맥락을 함께 찾습니다."
      ],
      "supporting": [
        "직전 그룹 권한 변경",
        "평소와 다른 출발지",
        "명령 실행과 계정 신원 사이의 불일치"
      ],
      "exclude": "검증된 기존 관리자의 승인된 수업·업무 명령은 제외합니다. 원본에 명령 이름이나 신원 이력이 없으면 임의로 만들지 않습니다."
    },
    "evidence": "MITRE T1068은 취약점 악용에 의한 권한 상승이고 T1078은 정상 계정 악용이므로, 관리자 명령과 비정상 권한 사용을 점검하되 명령 실행만으로 취약점 악용을 입증했다고 하지 않습니다.",
    "sources": [
      "https://attack.mitre.org/techniques/T1068/",
      "https://attack.mitre.org/techniques/T1078/"
    ]
  },
  {
    "name": "out_of_hours_privileged_activity",
    "techniques": [
      "T1078"
    ],
    "condition": {
      "fields": [
        "timestamp",
        "rule.description",
        "rule.mitre",
        "data.srcuser",
        "data.srcip",
        "data.group"
      ],
      "required": [
        "경보가 관리자 명령·그룹 권한 변경 등 권한 사용을 명시합니다.",
        "경보 또는 검증된 업무 시간 정책이 수업·업무 시간 밖의 사용임을 확인합니다."
      ],
      "supporting": [
        "처음 보는 출발지와 함께 발생",
        "그룹 추가와 관리자 명령이 동시에 발생",
        "승인된 작업 이력에 없는 사용"
      ],
      "exclude": "승인된 야간 유지보수·예약 작업은 제외합니다. 실제 업무 시간·시간대 정책이 없으면 고정 시간표를 가정하지 않고, 시각 하나만으로 차단하지 않습니다."
    },
    "evidence": "MITRE T1078은 탈취한 정상 계정으로 접근·권한을 악용하는 기법이므로, 확인된 업무 시간 이탈을 권한 변경·낯선 접속 같은 추가 맥락과 결합해 점검합니다.",
    "sources": [
      "https://attack.mitre.org/techniques/T1078/"
    ]
  }
];

// Classification uses only supplied Wazuh observations. No role lookup,
// invented work schedule, account history or external mutable state is used.
export function decide(alert) {
  const description = typeof alert?.rule?.description === 'string' ? alert.rule.description : '';
  const group = typeof alert?.data?.group === 'string' ? alert.data.group.toLowerCase() : '';
  const techniques = Array.isArray(alert?.rule?.mitre) ? alert.rule.mitre : [];
  const level = Number.isInteger(alert?.rule?.level) ? alert.rule.level : 0;
  const countValue = alert?.data?.count;
  const count = typeof countValue === 'number' && Number.isInteger(countValue) ? countValue
    : typeof countValue === 'string' && /^\d{1,6}$/u.test(countValue) ? Number(countValue) : 0;
  const approved = /승인된\s*(?:관리|그룹|권한|작업)|승인받은\s*(?:관리|변경|작업)|정상\s*관리\s*작업/u.test(description);
  if (approved) return { action: 'record', confidence: 0, reason: 'no_pattern_match' };

  const administratorGroup = (group === 'administrators' || /관리자\s*그룹/u.test(description))
    && !/관리자\s*그룹(?:은|이)?\s*아닙/u.test(description);
  const groupAdded = administratorGroup && /추가|들어가|들어왔|관리자로\s*들어/u.test(description);
  const readded = groupAdded && /(?:빠진|회수|제거).*(?:다시|재추가)/u.test(description);
  const command = /(?:관리자|권한)\s*명령/u.test(description)
    || (administratorGroup && /명령/u.test(description));
  const changedSession = /관리자\s*권한으로\s*바뀌/u.test(description);
  const executed = command && /실행/u.test(description) && !/실패|취소|명령(?:은|이)?\s*없/u.test(description);
  const unusual = /원격\s*주소|처음\s*보는\s*주소|주소는\s*처음|평범한\s*계정/u.test(description);
  const recentlyElevated = /방금\s*관리자가\s*된|곧바로/u.test(description);
  const otherAccount = /다른\s*계정의\s*권한/u.test(description);
  const offHours = /(?:수업|업무)\s*시간\s*밖|업무처럼\s*보이지\s*않는\s*시각/u.test(description);
  const matches = [];
  const add = (index, confidence) => matches.push({ name: PATTERNS[index].name, confidence });

  if (groupAdded && (unusual || readded || count >= 3 || executed)) add(0, 0.95);
  else if (groupAdded || (level >= 5 && (techniques.includes('T1078') || techniques.includes('T1098.007')))) add(0, 0.5);

  if ((executed && (recentlyElevated || otherAccount || groupAdded || (offHours && unusual)))
      || (changedSession && unusual)) add(1, 0.95);
  else if (command || changedSession || (level >= 5 && techniques.includes('T1068'))) add(1, 0.5);

  if (offHours && (executed || changedSession || groupAdded)) {
    add(2, unusual || (groupAdded && executed) ? 0.95 : 0.5);
  }
  const confidence = matches.reduce((maximum, match) => Math.max(maximum, match.confidence), 0);
  return {
    action: confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record',
    confidence,
    reason: matches.length ? matches.map(match => match.name).join(', ') : 'no_pattern_match',
  };
}

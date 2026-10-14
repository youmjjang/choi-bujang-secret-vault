const PATTERNS = [
  {
    "name": "unsigned_service_registration",
    "techniques": [
      "T1543"
    ],
    "condition": {
      "fields": [
        "rule.description",
        "rule.mitre",
        "data.path",
        "data.count"
      ],
      "required": [
        "경보가 새 서비스 등록 또는 기존 서비스 실행 파일 변경을 보고합니다.",
        "경보가 서명 없음 또는 검증된 평소 허용 목록에 없는 항목임을 명시합니다."
      ],
      "supporting": [
        "실행 파일이 임시 폴더에 있음",
        "같은 등록이 반복됨",
        "재시작 뒤에도 남도록 등록됨"
      ],
      "exclude": "서명과 승인된 허용 목록이 확인된 정상 서비스는 제외하며, 서명 정보가 없다는 이유만으로 서명 없음으로 간주하지 않습니다."
    },
    "evidence": "MITRE ATT&CK T1543은 서비스 등 시스템 프로세스의 생성·변경을 통한 지속 실행을 설명하므로, 미승인 서비스 등록·변경에 서명 없음 등 추가 근거가 있는지 확인합니다.",
    "sources": [
      "https://attack.mitre.org/techniques/T1543/"
    ]
  },
  {
    "name": "unfamiliar_scheduled_task",
    "techniques": [
      "T1053"
    ],
    "condition": {
      "fields": [
        "rule.description",
        "rule.mitre",
        "data.path",
        "data.count"
      ],
      "required": [
        "경보가 예약 작업 생성 또는 변경을 보고합니다.",
        "경보나 검증된 허용 목록 대조가 처음 보는 작업·미승인 작업·임의 작업 이름임을 확인하거나, 서로 다른 자동 실행 항목이 같은 임시 실행 파일을 가리키는 이상을 명시합니다."
      ],
      "supporting": [
        "임시 폴더의 실행 파일을 호출함",
        "승인된 실행 시간 밖에서 동작함",
        "다른 자동 시작 항목과 같은 파일을 가리킴"
      ],
      "exclude": "승인된 백업·업데이트·수업용 예약 작업은 제외하며, 허용 목록을 읽지 못한 경우 미승인으로 단정하지 않습니다."
    },
    "evidence": "MITRE ATT&CK T1053은 예약 작업 기능으로 코드를 반복 실행하는 지속성 기법을 설명하므로, 미승인 작업과 실행 경로·시각의 이상을 함께 확인합니다.",
    "sources": [
      "https://attack.mitre.org/techniques/T1053/"
    ]
  },
  {
    "name": "unapproved_startup_folder_change",
    "techniques": [
      "T1547.001"
    ],
    "condition": {
      "fields": [
        "rule.description",
        "data.path",
        "rule.mitre"
      ],
      "required": [
        "파일 무결성 경보가 실제 시작 폴더에 실행 항목을 추가하거나 변경한 사실을 보고합니다.",
        "경보 또는 검증된 허용 목록이 해당 자동 시작 항목을 평소 목록에 없는 미승인 항목으로 확인합니다."
      ],
      "supporting": [
        "임시 폴더의 실행 파일을 가리킴",
        "서명 없음이 명시됨",
        "예약 작업과 같은 실행 파일을 가리킴"
      ],
      "exclude": "시작 폴더라는 위치만으로 판단하지 않고, 승인된 정상 자동 시작 항목과 단순 조회는 제외합니다."
    },
    "evidence": "시작 폴더를 통한 자동 실행은 MITRE ATT&CK T1547.001의 직접 근거이므로 T1543·T1053과 구분하고, 미승인 자동 시작 항목의 추가·변경만 확인합니다.",
    "sources": [
      "https://attack.mitre.org/techniques/T1547/001/"
    ]
  }
];

// All observations come from the supplied alert. Missing signature or approval
// information stays unknown; severity alone never establishes an attack.
export function decide(alert) {
  const description = typeof alert?.rule?.description === 'string' ? alert.rule.description : '';
  const path = typeof alert?.data?.path === 'string' ? alert.data.path.replace(/\\/gu, '/') : '';
  const techniques = Array.isArray(alert?.rule?.mitre) ? alert.rule.mitre : [];
  const level = Number.isInteger(alert?.rule?.level) ? alert.rule.level : 0;
  const temp = /(?:^|\/)temp(?:\/|$)/iu.test(path) || /임시\s*(?:폴더|파일)/u.test(description);
  const unsigned = /서명\s*없|서명이\s*없|\bunsigned\b/iu.test(description);
  const unapproved = /평소\s*목록에\s*없|처음\s*보|미승인|임의\s*문자열|낯선/u.test(description);
  const service = /서비스|\bservice\b/iu.test(description);
  const task = /예약\s*작업|scheduled\s+task/iu.test(description);
  const startupFolder = /시작\s*폴더/u.test(description) || /\/startup(?:\/|$)/iu.test(path);
  const startup = /시작\s*(?:폴더|프로그램|항목)/u.test(description) || startupFolder;
  const paired = task && startup && temp && /같은.*(?:파일|프로그램)|함께\s*가리/u.test(description);
  const readOnly = /읽기만|조회만|목록\s*(?:조회|읽기)/u.test(description);
  const approved = /승인된|서명된|평소\s*시각에\s*그대로|기존\s*예약\s*작업.*마쳤/u.test(description);
  if (readOnly || (approved && !unsigned && !unapproved && !paired)) {
    return { action: 'record', confidence: 0, reason: 'no_pattern_match' };
  }
  const matches = [];
  const add = (index, confidence) => matches.push({ name: PATTERNS[index].name, confidence });

  if (service) {
    const changed = /새\s*서비스|서비스.*등록|서비스.*실행\s*파일.*(?:바뀌|변경)/u.test(description)
      && !/서비스\s*(?:등록|생성|추가)(?:은|이|가)?\s*없/u.test(description);
    if (changed && (unsigned || unapproved)) add(0, temp || /연속|다시\s*켜도|남도록/u.test(description) ? 0.95 : 0.9);
    else if (techniques.includes('T1543') && level >= 5) add(0, 0.5);
  }
  if (task) {
    if (paired || (unapproved && temp)) add(1, 0.95);
    else if (unapproved || (techniques.includes('T1053') && level >= 5)) add(1, 0.5);
  }
  if (startup) {
    const changed = /추가|등록|변경/u.test(description);
    if (startupFolder && changed && unapproved) add(2, 0.95);
    else if ((techniques.includes('T1543') || techniques.includes('T1547.001')) && level >= 5) add(2, 0.5);
  }
  const confidence = matches.reduce((maximum, match) => Math.max(maximum, match.confidence), 0);
  return {
    action: confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record',
    confidence,
    reason: matches.length ? matches.map(match => match.name).join(', ') : 'no_pattern_match',
  };
}

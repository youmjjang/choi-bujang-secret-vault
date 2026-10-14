const PATTERNS = [
  {
    "name": "large_transfer_to_unfamiliar_destination",
    "techniques": [
      "T1041",
      "T1048"
    ],
    "condition": {
      "fields": [
        "rule.description",
        "rule.mitre",
        "data.dstip",
        "data.bytes",
        "data.files",
        "data.count"
      ],
      "required": [
        "경보가 실제 자료 전송을 보고합니다. 목적지 조회나 연결 시도만 있는 사건은 전송 완료와 구분합니다.",
        "경보 또는 검증된 이력이 처음 보는·미승인 목적지, 평소와 다른 통로 또는 짧은 시간의 비정상 반복 반출을 확인합니다.",
        "검증된 평소 전송량 정책과 비교해 바이트·파일 수가 비정상적으로 크거나, 경보가 대용량·대량 전송을 명시합니다."
      ],
      "supporting": [
        "짧은 시간의 반복 전송",
        "여러 자료가 같은 목적지로 나감",
        "기존 업무 흐름과 다른 통로 사용"
      ],
      "scoringHeuristics": {
        "highBytes": 64000000,
        "manyFiles": 100,
        "repeatedTransfers": 4,
        "note": "수량은 이 모듈의 보조 점수 기준이며 평소 이력이나 MITRE가 정한 임계값이 아닙니다. 수량 하나로 차단하지 않습니다."
      },
      "exclude": "승인된 백업·자료 배포·정상 대용량 업무 전송은 제외합니다. 목적지 이력이나 전송량 기준이 없으면 처음 보는 목적지 또는 비정상 대용량으로 임의 분류하지 않습니다."
    },
    "evidence": "MITRE T1041은 기존 명령 통로를 통한 유출, T1048은 다른 프로토콜을 통한 유출을 설명하므로, 확인된 자료 전송의 낯선 목적지·비정상 규모를 함께 점검합니다.",
    "sources": [
      "https://attack.mitre.org/techniques/T1041/",
      "https://attack.mitre.org/techniques/T1048/"
    ]
  },
  {
    "name": "out_of_hours_archive_transfer",
    "techniques": [
      "T1041",
      "T1048"
    ],
    "condition": {
      "fields": [
        "timestamp",
        "rule.description",
        "rule.mitre",
        "data.dstip",
        "data.bytes",
        "data.files",
        "data.count"
      ],
      "required": [
        "경보가 압축 파일의 외부 전송을 명시합니다. 압축 파일 생성만으로 반출했다고 판단하지 않습니다.",
        "경보 또는 검증된 업무 시간·시간대 정책이 업무·수업 시간 밖 전송임을 확인합니다."
      ],
      "supporting": [
        "처음 보는·미승인 목적지",
        "평소보다 큰 전송량",
        "짧은 시간에 같은 목적지로 반복 반출"
      ],
      "exclude": "승인된 야간 압축 백업·배포 작업은 제외합니다. 업무 시간 정책이 없으면 고정 시간표를 가정하지 않으며, 시각 또는 압축 파일이라는 사실 하나만으로 차단하지 않습니다."
    },
    "evidence": "MITRE T1041·T1048의 자료 유출 맥락에서 실제 압축 파일 전송과 확인된 업무 시간 이탈을 결합해 점검하되, 압축·야간 작업 자체를 악성으로 단정하지 않습니다.",
    "sources": [
      "https://attack.mitre.org/techniques/T1041/",
      "https://attack.mitre.org/techniques/T1048/"
    ]
  }
];

function quantity(value) {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : null;
  if (typeof value !== 'string' || !/^\d{1,16}$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

// This is a deterministic heuristic, not an assumed destination history,
// working-hours policy, verified C2 protocol or source of authorization.
export function decide(alert) {
  const description = typeof alert?.rule?.description === 'string' ? alert.rule.description : '';
  const techniques = Array.isArray(alert?.rule?.mitre) ? alert.rule.mitre : [];
  const level = Number.isInteger(alert?.rule?.level) ? alert.rule.level : 0;
  const bytes = quantity(alert?.data?.bytes);
  const files = quantity(alert?.data?.files);
  const count = quantity(alert?.data?.count);
  const limits = PATTERNS[0].condition.scoringHeuristics;
  const noTransfer = /전송.*(?:실패|아직\s*없)|전송(?:은|이)?\s*없/u.test(description);
  const transfer = /전송|나갔|올라갔|반출|외부.*복사/u.test(description) && !noTransfer;
  const unfamiliar = /처음\s*(?:보는|봅니다)|평소와\s*다른\s*주소|미승인\s*목적지/u.test(description);
  const unusualChannel = /평소에\s*쓰지\s*않던\s*포트|비정상\s*통로/u.test(description);
  const reportedLarge = /대용량|큰\s*파일|메모\s*묶음|자료실\s*전체/u.test(description)
    && !/큰\s*파일은\s*아닙/u.test(description);
  const large = reportedLarge || (bytes !== null && bytes >= limits.highBytes) || (files !== null && files >= limits.manyFiles);
  const repeated = (count !== null && count >= limits.repeatedTransfers) || /반복|연속/u.test(description);
  const offHours = /(?:수업|업무)\s*시간\s*밖/u.test(description);
  const archive = /압축\s*파일/u.test(description);
  const wholeLibraryExternal = /자료실\s*전체.*외부\s*주소/u.test(description);
  const approved = /승인된\s*(?:백업|전송|배포|작업)|승인받은\s*(?:백업|전송|작업)|정상\s*백업/u.test(description);
  if (approved) return { action: 'record', confidence: 0, reason: 'no_pattern_match' };

  const matches = [];
  const add = (index, confidence) => matches.push({ name: PATTERNS[index].name, confidence });
  if (transfer && large && (unfamiliar || unusualChannel || repeated || wholeLibraryExternal)) add(0, 0.95);
  else if ((transfer && (unfamiliar || /전송량.*높|파일\s*수.*늘/u.test(description)))
      || (level >= 5 && (techniques.includes('T1041') || techniques.includes('T1048')))) add(0, 0.5);
  if (archive && offHours && transfer) add(1, unfamiliar || large || repeated ? 0.95 : 0.5);
  else if (archive && level >= 5 && (techniques.includes('T1041') || techniques.includes('T1048'))) add(1, 0.5);

  const confidence = matches.reduce((maximum, match) => Math.max(maximum, match.confidence), 0);
  return {
    action: confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record',
    confidence,
    reason: matches.length ? matches.map(match => match.name).join(', ') : 'no_pattern_match',
  };
}

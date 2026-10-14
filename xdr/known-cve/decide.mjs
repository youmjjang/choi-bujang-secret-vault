const PATTERNS = Object.freeze([
  Object.freeze({
    name: 'jndi_remote_lookup',
    condition: Object.freeze({
      fields: Object.freeze(['data.useragent', 'data.url']),
      regex: '\\$\\{\\s*jndi\\s*:\\s*(?:ldap|ldaps|rmi|dns)\\s*:',
      flags: 'i',
      description: '요청 머리글(User-Agent)이나 요청 URL·인자 문자열에서 외부 이름 조회 프로토콜이 붙은 직접적인 JNDI 구문을 찾습니다.',
    }),
    evidence: 'Apache는 CVE-2021-44228의 공격자 제어 LDAP 등 JNDI 끝점 조회 위험을 설명하며, 공개 애플리케이션 취약점 악용은 MITRE ATT&CK T1190에 해당합니다.',
    sources: Object.freeze(['https://logging.apache.org/security.html', 'https://attack.mitre.org/techniques/T1190/']),
  }),
  Object.freeze({
    name: 'explicit_log4j_scan_marker',
    condition: Object.freeze({
      fields: Object.freeze(['data.useragent', 'data.url']),
      regex: '(?:^|[^a-z0-9])log4j-scan(?:$|[^a-z0-9])',
      flags: 'i',
      description: '요청 머리글이나 URL·인자에 알려진 도구 이름 log4j-scan이 명시적으로 포함된 경우만 보조 신호로 찾습니다. 일반 curl·브라우저 문자열은 포함하지 않습니다.',
    }),
    evidence: 'FullHunt는 log4j-scan을 CVE-2021-44228 점검 도구로 공개했으므로 명시적 이름은 점검 흔적의 보조 신호이며, 이 이름만으로 악용 성공이나 악성 여부를 확정하지 않습니다.',
    sources: Object.freeze(['https://github.com/fullhunt/log4j-scan']),
  }),
  Object.freeze({
    name: 't1190_rule_context',
    condition: Object.freeze({
      fields: Object.freeze(['rule.mitre', 'rule.level']), technique: 'T1190',
      minimumLevel: 5, maximumConfidence: 0.5,
      description: 'Wazuh가 T1190으로 분류한 수준 5 이상 경보에 직접 악용 구문이 없으면 확인이 필요한 맥락으로만 알립니다. 수준만으로는 매칭하지 않고 차단으로 올리지 않습니다.',
    }),
    evidence: 'MITRE T1190은 공개 애플리케이션 취약점 악용 분류이며, 이 분류가 붙은 경보만으로 실제 JNDI 악용을 입증할 수 없어 알림 수준의 보조 근거로만 사용합니다.',
    sources: Object.freeze(['https://attack.mitre.org/techniques/T1190/']),
  }),
]);

const MATCHERS = PATTERNS.map(pattern => pattern.condition.regex ? new RegExp(pattern.condition.regex, pattern.condition.flags) : null);
// A complete expression with a non-empty remote endpoint is clearer than a
// truncated prefix. Tool identification alone never reaches the block threshold.
const COMPLETE_LOOKUP = /\$\{\s*jndi\s*:\s*(?:ldap|ldaps|rmi|dns)\s*:\s*\/\/[^\s{}]+\s*\}/iu;

export function decide(alert) {
  const values = [alert?.data?.useragent, alert?.data?.url].filter(value => typeof value === 'string');
  const matches = PATTERNS.filter((pattern, index) => MATCHERS[index] && values.some(value => MATCHERS[index].test(value)));
  let confidence = 0;
  if (matches.some(pattern => pattern.name === 'jndi_remote_lookup')) {
    confidence = values.some(value => COMPLETE_LOOKUP.test(value)) ? 0.95 : 0.7;
    if (confidence >= 0.85 && matches.some(pattern => pattern.name === 'explicit_log4j_scan_marker')) confidence = 0.98;
  } else if (matches.some(pattern => pattern.name === 'explicit_log4j_scan_marker')) {
    confidence = 0.6;
  }
  if (confidence === 0 && Array.isArray(alert?.rule?.mitre)
      && alert.rule.mitre.includes(PATTERNS[2].condition.technique)
      && Number.isInteger(alert.rule.level) && alert.rule.level >= PATTERNS[2].condition.minimumLevel) {
    matches.push(PATTERNS[2]);
    confidence = PATTERNS[2].condition.maximumConfidence;
  }
  return {
    action: confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record',
    confidence,
    // Fixed names only: never copy request strings, credentials or descriptions.
    reason: matches.length ? matches.map(pattern => pattern.name).join(', ') : 'no_pattern_match',
  };
}

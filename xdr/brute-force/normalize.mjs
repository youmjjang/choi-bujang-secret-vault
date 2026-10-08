// Pure transformation, with no Node built-ins or package dependencies.
export function redact(value) {
  return String(value ?? '').replace(/(?:sb_secret_|sb_publishable_)[\w-]+|eyJ[\w.-]+/g, '[REDACTED]')
    .replace(/((?:password|token|secret|api[_-]?key|비밀번호|토큰)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]').replace(/[\r\n]/g, ' ').slice(0, 500);
}
function validIPv4(value) {
  return typeof value === 'string' && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)
    && value.split('.').every(part => Number(part) <= 255 && String(Number(part)) === part);
}
export function normalize(alert) {
  return {
    timestamp: Number.isFinite(Date.parse(alert?.timestamp)) ? alert.timestamp : null,
    sourceIp: validIPv4(alert?.data?.srcip) ? alert.data.srcip : null,
    account: redact(alert?.data?.srcuser),
    level: Number.isFinite(Number(alert?.rule?.level)) ? Number(alert.rule.level) : 0,
    description: redact(alert?.rule?.description),
  };
}

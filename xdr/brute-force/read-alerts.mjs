import { readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { pathToFileURL } from 'node:url';

export function redact(value) {
  return String(value ?? '').replace(/(?:sb_secret_|sb_publishable_)[\w-]+|eyJ[\w.-]+/g, '[REDACTED]')
    .replace(/((?:password|token|secret|api[_-]?key|비밀번호|토큰)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]').replace(/[\r\n]/g, ' ').slice(0, 500);
}
export function normalize(alert) {
  return {
    timestamp: Number.isFinite(Date.parse(alert?.timestamp)) ? alert.timestamp : null,
    sourceIp: isIP(alert?.data?.srcip ?? '') ? alert.data.srcip : null,
    account: redact(alert?.data?.srcuser),
    level: Number.isFinite(Number(alert?.rule?.level)) ? Number(alert.rule.level) : 0,
    description: redact(alert?.rule?.description),
  };
}
export async function readAlerts(path = new URL('../fixtures/brute-force.json', import.meta.url)) {
  const fixture = JSON.parse(await readFile(path, 'utf8'));
  if (!Array.isArray(fixture.alerts)) throw new Error('Invalid alert fixture');
  return fixture.alerts.map(normalize);
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  for (const row of await readAlerts()) console.log(JSON.stringify(row));
}

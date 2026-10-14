import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SECRET = /-----BEGIN[\s\S]*PRIVATE KEY-----|\bBearer\s+\S+|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*|\bsb_secret_[A-Za-z0-9_-]+|\bsk-[A-Za-z0-9_-]{16,}|(?:password|passwd|pwd|token|secret|api[_ -]?key|authorization|private[_ -]?key|비밀번호|개인키)\s*[=:]|[a-z][a-z0-9+.-]*:\/\/[^\s/]+:[^\s/]+@|\b[A-Za-z0-9+/_=-]{32,}\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu;
function safeText(value) {
  if (typeof value !== 'string') return null;
  return SECRET.test(value) ? '[REDACTED]' : value;
}
export function extractAlert(alert) {
  return {
    timestamp: safeText(alert?.timestamp),
    sourceIp: safeText(alert?.data?.srcip),
    account: safeText(alert?.data?.srcuser),
    level: Number.isInteger(alert?.rule?.level) && alert.rule.level >= 0 ? alert.rule.level : null,
    description: safeText(alert?.rule?.description),
  };
}
export async function readAlerts(path = new URL('../fixtures/known-cve.json', import.meta.url)) {
  let fixture;
  try { fixture = JSON.parse(await readFile(path, 'utf8')); }
  catch { throw new Error('경보 파일을 읽을 수 없거나 JSON 형식이 올바르지 않습니다.'); }
  if (!Array.isArray(fixture?.alerts)) throw new Error('alerts 배열이 필요합니다.');
  return fixture.alerts.map(extractAlert);
}
// Importing this module performs no I/O. The CLI emits exactly one JSON line per alert.
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    for (const row of await readAlerts(process.argv[2])) process.stdout.write(`${JSON.stringify(row)}\n`);
  } catch {
    process.stderr.write('경보 읽기 실패: 파일과 alerts 배열 형식을 확인해 주세요.\n');
    process.exitCode = 1;
  }
}

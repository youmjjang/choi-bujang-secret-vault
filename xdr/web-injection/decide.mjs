import { normalize } from '../brute-force/normalize.mjs';
import { askJev } from './jev.mjs';

export function indicators(alert) {
  const row = normalize(alert);
  let input = String(alert?.data?.url ?? '').slice(0, 4096);
  for (let i = 0; i < 2; i++) { try { input = decodeURIComponent(input); } catch { break; } }
  const text = row.description;
  const sql = /SQL.*(?:구문|표식)|데이터베이스 조회.*이어 붙/.test(text)
    || /\bunion\s+(?:all\s+)?select\b|\bselect\s+.+\s+from\b|['"]\s*(?:or|and)\s+\d+\s*=\s*\d+/i.test(input);
  const script = /스크립트.*(?:삽입 표기|표식)/.test(text) || /<script\b|\bon(?:error|load)\s*=|javascript\s*:/i.test(input);
  const traversal = /경로.*(?:거슬러|이탈)/.test(text) || /(?:\.\.[/\\]){2,}/.test(input);
  const command = /명령 구분자/.test(text) || /[;|&]\s*(?:cat|curl|wget|sh|bash)\b/i.test(input);
  const technique = Array.isArray(alert?.rule?.mitre) && alert.rule.mitre.includes('T1190');
  const count = Number(alert?.data?.count ?? 0);
  return { row, count, technique, sql, script, traversal, command };
}
export function createDecider({ jev } = {}) {
  return async function decide(alert) {
    const evidence = indicators(alert);
    const { row, count, technique, sql, script, traversal, command } = evidence;
    const names = [sql && 'sql-injection', script && 'script-injection', traversal && 'path-traversal', command && 'command-injection'].filter(Boolean);
    if (names.length && row.sourceIp && row.timestamp && row.level >= 10 && count >= 5) {
      return { action: 'block', confidence: 0.95, reason: `${names.join('+')}: 반복 주입 경보` };
    }
    if (!technique && !names.length && row.level <= 3) {
      return { action: 'record', confidence: 0.1, reason: 'normal-web-event: 주입 신호 없음' };
    }
    try {
      if (typeof jev !== 'function') throw new Error('Jev unavailable');
      // Only derived booleans/counts; URLs, account names, and IPs are not sent.
      const answer = await jev({ level: row.level, repeatCount: count, sql, script, traversal, command, technique });
      const confidence = answer?.confidence;
      if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error('Invalid confidence');
      return { action: confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record', confidence,
        reason: `${names.join('+') || 'uncertain-web-input'}: Jev 판단` };
    } catch {
      return { action: 'alert', confidence: 0.5, reason: `${names.join('+') || 'uncertain-web-input'}: Jev 미응답, 알림 유지` };
    }
  };
}
export const decide = createDecider({ jev: askJev });

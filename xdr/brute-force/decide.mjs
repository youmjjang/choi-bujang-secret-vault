import { normalize } from './normalize.mjs';
import { askJev } from './jev.mjs';

// Inject an adapter for tests; the default calls TypeSafe only if a server key exists.
export function createDecider({ jev } = {}) {
  return async function decide(alert) {
    const row = normalize(alert);
    const text = row.description;
    const count = Number(alert?.data?.count ?? 0);
    const failure = /실패|같은 비밀번호.*(?:넣|대입)/.test(text);
    if (!failure) return { action: 'record', confidence: 0.1, reason: 'normal-event: 실패 신호 없음' };
    const technique = alert?.rule?.mitre?.some(id => /^T1110(?:\.|$)/.test(id));
    // A single low-severity mistake followed by success, with no attack
    // technique attached, is routine authentication activity.
    if (!technique && row.level <= 3 && count === 1 && /뒤.*성공/.test(text)) {
      return { action: 'record', confidence: 0.1, reason: 'normal-event: 단일 실패 후 정상 로그인' };
    }
    const minutes = text.match(/(\d+)분/);
    const burst = count >= 30 && (!minutes || Number(minutes[1]) <= 3);
    const spray = /같은 비밀번호/.test(text) || /계정\s*(\d+)개/.test(text) && Number(text.match(/계정\s*(\d+)개/)[1]) >= 20 && /같은 간격/.test(text);
    // Password-spraying descriptions may say "넣었습니다" rather than failure.
    if (technique && row.sourceIp && row.account && row.timestamp && row.level >= 10 && (burst || spray)) {
      return { action: 'block', confidence: 0.95, reason: `${spray ? 'password-spraying' : 'repeated-failure'}: 반복 인증 공격 근거` };
    }
    try {
      if (typeof jev !== 'function') throw new Error('Jev unavailable');
      const timeout = new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('timeout')), 3000); timer.unref?.(); });
      // Only derived non-sensitive indicators are sent, never raw events/accounts.
      const answer = await Promise.race([jev({ level: row.level, failures: count, pattern: 'uncertain-failure',
        durationMinutes: minutes ? Number(minutes[1]) : null,
        successfulLoginAfterFailures: /뒤.*성공|그 뒤 성공/.test(text),
        passwordChangeAttempt: /비밀번호 변경/.test(text),
        multipleAccounts: /계정.*(?:개|바꿔)|두 계정/.test(text),
      }), timeout]);
      const confidence = answer?.confidence;
      if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error('invalid confidence');
      return { action: confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record', confidence, reason: 'uncertain-failure: Jev 판단' };
    } catch {
      return { action: 'alert', confidence: 0.5, reason: 'uncertain-failure: Jev 미응답, 알림 유지' };
    }
  };
}
export const decide = createDecider({ jev: askJev });

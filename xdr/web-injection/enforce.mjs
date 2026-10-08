import { denyRule as bruteForceDenyRule, isBlocked } from '../brute-force/enforce.mjs';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
export { isBlocked };
export function denyRule(alert, decision, now = Date.now()) {
  const rule = bruteForceDenyRule(alert, decision, now);
  return rule ? { ...rule, ruleId: 'xdr.web-injection' } : null;
}
export function withXdr(baseDecide, options) {
  return async request => isBlocked(options.sourceIp, options.rules, options.now ?? Date.now())
    ? { schema: 'aleph.decision.v1', requestId: request.requestId, decision: 'deny',
        reasonCode: 'policy_denied', ruleIds: ['xdr.web-injection'] }
    : baseDecide(request);
}
export async function persistDecisions(root, alerts, decisions, { replay = false, now = Date.now() } = {}) {
  const directory = join(root, 'xdr', 'web-injection');
  await mkdir(directory, { recursive: true });
  const rules = [];
  for (let i = 0; i < alerts.length; i++) {
    const rule = denyRule(alerts[i], decisions[i], replay ? Date.parse(alerts[i].timestamp) : now);
    if (rule) rules.push(rule);
    if (decisions[i].action !== 'record') await appendFile(join(root, 'xdr', 'alerts.log'), JSON.stringify({
      at: new Date(now).toISOString(), moduleKey: 'web-injection', alertId: alerts[i].id,
      action: decisions[i].action, confidence: decisions[i].confidence, reason: decisions[i].reason, replay,
    }) + '\n');
  }
  await writeFile(join(directory, replay ? 'replay-deny-rules.json' : 'deny-rules.json'), JSON.stringify(rules, null, 2) + '\n');
  return rules;
}

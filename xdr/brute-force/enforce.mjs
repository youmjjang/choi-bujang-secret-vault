import { isIP } from 'node:net';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function denyRule(alert, decision, now = Date.now()) {
  const created = Date.parse(alert?.timestamp);
  if (decision.action !== 'block' || decision.confidence < 0.85 || !isIP(alert?.data?.srcip ?? '')
      || !Number.isFinite(created) || created > now + 5000 || now - created >= 900000
      || !/^[a-zA-Z0-9._-]{1,80}$/.test(alert?.id ?? '')) return null;
  return { action: 'deny', sourceIp: alert.data.srcip, evidenceAlertId: alert.id,
    createdAt: new Date(created).toISOString(), expiresAt: new Date(created + 900000).toISOString(),
    ruleId: 'xdr.brute-force' };
}
export function isBlocked(sourceIp, rules, now = Date.now()) {
  return isIP(sourceIp ?? '') !== 0 && rules.some(rule => rule.action === 'deny' && rule.sourceIp === sourceIp
    && Date.parse(rule.createdAt) <= now && Date.parse(rule.expiresAt) > now
    && Date.parse(rule.expiresAt) - Date.parse(rule.createdAt) <= 900000);
}
// Sidecar precheck: the trusted transport supplies sourceIp separately. Never
// add an undocumented IP field to the official 18-field SDP request contract.
export function withXdr(baseDecide, { rules, sourceIp, now = Date.now() }) {
  return async request => isBlocked(sourceIp, rules, now)
    ? { schema: 'aleph.decision.v1', requestId: request.requestId, decision: 'deny',
        reasonCode: 'policy_denied', ruleIds: ['xdr.brute-force'] }
    : baseDecide(request);
}
export async function persistDecisions(root, alerts, decisions, { now = Date.now(), replay = false } = {}) {
  const directory = join(root, 'xdr', 'brute-force');
  await mkdir(directory, { recursive: true });
  const path = join(directory, replay ? 'replay-deny-rules.json' : 'deny-rules.json');
  let existing = [];
  try { existing = JSON.parse(await readFile(path, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const rules = existing.filter(rule => Date.parse(rule.expiresAt) > now);
  for (let i = 0; i < alerts.length; i++) {
    const decision = decisions[i];
    const rule = denyRule(alerts[i], decision, replay ? Date.parse(alerts[i].timestamp) : now);
    if (rule && !rules.some(item => item.evidenceAlertId === rule.evidenceAlertId)) rules.push(rule);
    if (decision.action !== 'record') await appendFile(join(root, 'xdr', 'alerts.log'), JSON.stringify({
      at: new Date(now).toISOString(), alertId: alerts[i].id, action: decision.action,
      confidence: decision.confidence, replay, reason: decision.reason,
    }) + '\n');
  }
  await writeFile(path, JSON.stringify(rules, null, 2) + '\n');
  return rules;
}

import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide as decideAlert } from './decide.mjs';

const DEFAULT_RULES = fileURLToPath(new URL('./deny-rules.json', import.meta.url));
const DEFAULT_LOG = fileURLToPath(new URL('../alerts.log', import.meta.url));
const SCOPE_FIELDS = ['classId', 'projectId', 'subjectId', 'deviceId', 'service', 'method', 'path', 'querySha256'];
const TTL_MS = 300_000;
let queue = Promise.resolve();

function verifiedScope(request) {
  if (request?.schema !== 'aleph.decision.v1' || request.deviceRegistered !== true) return null;
  if (!/^[a-f0-9]{16}$/u.test(request.deviceId ?? '') || !/^[a-f0-9]{64}$/u.test(request.querySha256 ?? '')) return null;
  if (!SCOPE_FIELDS.every(key => typeof request[key] === 'string' && request[key].length > 0 && request[key].length <= 2048)) return null;
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].includes(request.method)
      || !request.path.startsWith('/') || /[?\r\n]/u.test(request.path)) return null;
  return Object.fromEntries(SCOPE_FIELDS.map(key => [key, request[key]]));
}
function alertReference(id) {
  if (typeof id === 'string' && /^(?:[a-z][a-z_-]{0,20}-\d{1,8}|\d{1,16}(?:\.\d{1,16})?|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/iu.test(id)) return id;
  return null; // Never echo arbitrary strings that could contain credentials.
}
async function loadRules(path) {
  let text;
  try { text = await readFile(path, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return []; throw new Error('deny_rules_unavailable'); }
  let rules;
  try { rules = JSON.parse(text); } catch { throw new Error('invalid_deny_rules'); }
  if (!Array.isArray(rules) || rules.some(rule => rule?.module !== 'persistence'
      || !alertReference(rule.evidenceAlertId) || !Number.isFinite(Date.parse(rule.expiresAt))
      || !rule.scope || !SCOPE_FIELDS.every(key => typeof rule.scope[key] === 'string'))) throw new Error('invalid_deny_rules');
  return rules;
}

// resolveVerifiedRequest is a trusted server-side correlation callback. It must
// resolve this alert ID to an engine-verified request, never copy data.srcuser,
// data.srcip or a client role/header into the ZTNA principal.
export function createResponder({ resolveVerifiedRequest = null, rulesPath = DEFAULT_RULES,
  logPath = DEFAULT_LOG, now = Date.now } = {}) {
  return function respond(alert) {
    const task = queue.then(async () => {
      const result = decideAlert(alert);
      if (result.action === 'record') return { ...result, outcome: 'record', rule: null };
      const current = now();
      const eventAt = Date.parse(alert?.timestamp);
      const evidenceAlertId = alertReference(alert?.id);
      let outcome = result.action === 'alert' ? 'alert_only' : 'not_bound';
      let rule = null;
      if (result.action === 'block' && result.confidence >= 0.85) {
        if (!evidenceAlertId || !Number.isFinite(eventAt) || eventAt > current + 5000 || eventAt + TTL_MS <= current) outcome = 'invalid_or_expired_alert';
        else if (typeof resolveVerifiedRequest === 'function') {
          const verified = await resolveVerifiedRequest(evidenceAlertId);
          const scope = verifiedScope(verified);
          // Correlation requires a recent engine request as well as a fresh alert.
          if (scope && Number.isFinite(Date.parse(verified.at)) && Math.abs(Date.parse(verified.at) - eventAt) <= 5000) {
            const rules = await loadRules(rulesPath);
            const id = createHash('sha256').update(JSON.stringify({ evidenceAlertId, scope })).digest('hex');
            rule = rules.find(existing => existing.id === id) ?? {
              id, module: 'persistence', action: 'deny', evidenceAlertId, scope,
              reason: result.reason, createdAt: new Date(current).toISOString(),
              expiresAt: new Date(eventAt + TTL_MS).toISOString(),
            };
            if (!rules.some(existing => existing.id === id)) {
              await mkdir(dirname(rulesPath), { recursive: true });
              const temp = `${rulesPath}.${randomUUID()}.tmp`;
              await writeFile(temp, `${JSON.stringify([...rules, rule], null, 2)}\n`, { mode: 0o600 });
              await rename(temp, rulesPath);
            }
            outcome = 'rule_registered';
          }
        }
      }
      await mkdir(dirname(logPath), { recursive: true });
      await appendFile(logPath, `${JSON.stringify({ module: 'persistence',
        at: new Date(current).toISOString(), evidenceAlertId,
        action: result.action, confidence: result.confidence, reason: result.reason, outcome,
        expiresAt: rule?.expiresAt ?? null })}\n`, { mode: 0o600 });
      return { ...result, outcome, rule };
    });
    queue = task.catch(() => {});
    return task;
  };
}

// Register this adapter with the engine only through its documented server API.
// Existing decisions are evaluated first and can never be changed into an allow.
export function createConnectedDecider({ baseDecide, ruleIds, rulesPath = DEFAULT_RULES, now = Date.now }) {
  if (typeof baseDecide !== 'function' || !Array.isArray(ruleIds) || !ruleIds.includes('zone_access')) throw new Error('existing_zone_rule_required');
  return async function decide(request) {
    const original = await baseDecide(request);
    if (original.decision !== 'allow') return original;
    const scope = verifiedScope(request);
    if (!scope) return original;
    const rules = await loadRules(rulesPath);
    const match = rules.some(rule => Date.parse(rule.expiresAt) > now()
      && Date.parse(rule.createdAt) <= now()
      && SCOPE_FIELDS.every(key => rule.scope[key] === scope[key]));
    return match ? { schema: 'aleph.decision.v1', requestId: request.requestId,
      decision: 'deny', reasonCode: 'zone_access_denied', ruleIds: ['zone_access'] } : original;
  };
}

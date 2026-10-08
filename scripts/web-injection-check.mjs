import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runXdr } from './xdr-run.mjs';
import { readAlerts } from '../xdr/web-injection/read-alerts.mjs';
import { persistDecisions, isBlocked, withXdr } from '../xdr/web-injection/enforce.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const alerts = JSON.parse(await readFile(new URL('../xdr/fixtures/web-injection.json', import.meta.url))).alerts;
assert.equal((await readAlerts()).length, alerts.length);
const result = await runXdr({ root, moduleKey: 'web-injection' });
const rules = await persistDecisions(root, alerts, result.decisions, { replay: true });
let normalBlocked = 0;
for (let i = 0; i < alerts.length; i++) {
  const alert = alerts[i]; const now = Date.parse(alert.timestamp);
  const normal = !alert.rule.mitre.length;
  if (normal && (result.decisions[i].action !== 'record' || isBlocked(alert.data.srcip, rules, now))) normalBlocked++;
  const base = async request => ({ schema: 'aleph.decision.v1', requestId: request.requestId, decision: 'allow', reasonCode: 'approved', ruleIds: [] });
  const outcome = await withXdr(base, { rules, sourceIp: alert.data.srcip, now })({ requestId: 'fixture-only' });
  if (result.decisions[i].action === 'block') assert.equal(outcome.decision, 'deny');
  if (normal) assert.equal(outcome.decision, 'allow');
}
assert.equal(normalBlocked, 0);
await persistDecisions(root, alerts, result.decisions);
console.log(JSON.stringify({ counts: result.counts, normalBlocked, rows: alerts.length, mode: 'local-replay' }));

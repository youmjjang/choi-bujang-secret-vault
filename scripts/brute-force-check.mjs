import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runXdr } from './xdr-run.mjs';
import { readAlerts } from '../xdr/brute-force/read-alerts.mjs';
import { persistDecisions, isBlocked, withXdr } from '../xdr/brute-force/enforce.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = JSON.parse(await readFile(new URL('../xdr/fixtures/brute-force.json', import.meta.url)));
assert.equal((await readAlerts()).length, fixture.alerts.length);
const result = await runXdr({ root, moduleKey: 'brute-force' });
const rules = await persistDecisions(root, fixture.alerts, result.decisions, { replay: true });
let normalBlocked = 0;
for (let i = 0; i < fixture.alerts.length; i++) {
  const alert = fixture.alerts[i];
  const now = Date.parse(alert.timestamp);
  const normal = !alert.rule.mitre.length;
  if (normal && (result.decisions[i].action === 'block' || isBlocked(alert.data.srcip, rules, now))) normalBlocked++;
  const base = async request => ({ schema: 'aleph.decision.v1', requestId: request.requestId, decision: 'allow', reasonCode: 'approved', ruleIds: [] });
  const wrapped = withXdr(base, { rules, sourceIp: alert.data.srcip, now });
  const outcome = await wrapped({ requestId: 'fixture-only' });
  if (result.decisions[i].action === 'block') assert.equal(outcome.decision, 'deny');
  if (normal) assert.equal(outcome.decision, 'allow');
}
assert.equal(normalBlocked, 0);
// Historical fixtures must not become active production rules.
await persistDecisions(root, fixture.alerts, result.decisions);
console.log(JSON.stringify({ counts: result.counts, normalBlocked, rows: fixture.alerts.length, mode: 'local-replay' }));

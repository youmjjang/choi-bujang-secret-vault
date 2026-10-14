import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createResponder, createConnectedDecider } from '../xdr/privilege/respond.mjs';
import { decide, RULE_IDS } from '../src/decider.mjs';
import { fixtureRequests } from '../scripts/fixture-7.mjs';

test('26-alert replay registers nine expiring attack rules and preserves all uncertain/normal requests', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'privilege-response-'));
  const rulesPath = join(directory, 'deny-rules.json');
  const logPath = join(directory, 'alerts.log');
  const source = new URL('../xdr/fixtures/privilege.json', import.meta.url);
  const original = await readFile(source, 'utf8');
  const alerts = JSON.parse(original).alerts;
  const { normal } = fixtureRequests();
  const bindings = new Map(alerts.map((alert, i) => [alert.id, { ...normal,
    deviceId: (i + 1).toString(16).padStart(16, '0'), at: alert.timestamp }]));
  let clock;
  const respond = createResponder({ rulesPath, logPath, now: () => clock,
    resolveVerifiedRequest: async id => bindings.get(id) });
  const connected = createConnectedDecider({ rulesPath, now: () => clock, baseDecide: decide, ruleIds: RULE_IDS });
  let rejected = 0;
  let allowed = 0;
  for (const alert of alerts) {
    clock = Date.parse(alert.timestamp) + 1000;
    const response = await respond(alert);
    const actual = await connected(bindings.get(alert.id));
    assert.equal(actual.decision, response.action === 'block' ? 'deny' : 'allow', alert.id);
    if (response.rule) {
      assert.equal(response.rule.evidenceAlertId, alert.id);
      assert.equal(Date.parse(response.rule.expiresAt), Date.parse(alert.timestamp) + 300_000);
      rejected++;
    } else allowed++;
  }
  assert.equal(rejected, 9);
  assert.equal(allowed, 17);
  const rules = JSON.parse(await readFile(rulesPath, 'utf8'));
  assert.equal(rules.length, 9);
  assert(rules.every(rule => Number(rule.evidenceAlertId.split('-')[1]) <= 9));
  clock += 300_001;
  assert.equal((await connected(bindings.get('pv-01'))).decision, 'allow');
  const logs = (await readFile(logPath, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.equal(logs.length, 17);
  assert(logs.every(log => log.module === 'privilege'));
  assert(!JSON.stringify(logs).includes('user01'));
  assert(!JSON.stringify(logs).includes('203.0.113.11'));
  assert.equal(await readFile(source, 'utf8'), original);
});

test('exact scope, original deny/step-up and duplicate expiry are preserved', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'privilege-scope-'));
  const rulesPath = join(directory, 'deny-rules.json');
  const logPath = join(directory, 'alerts.log');
  const alert = JSON.parse(await readFile(new URL('../xdr/fixtures/privilege.json', import.meta.url), 'utf8')).alerts[0];
  const { normal } = fixtureRequests();
  const request = { ...normal, at: alert.timestamp };
  let clock = Date.parse(alert.timestamp) + 1000;
  const respond = createResponder({ rulesPath, logPath, now: () => clock, resolveVerifiedRequest: async () => request });
  const first = await respond(alert);
  clock += 1000;
  const second = await respond(alert);
  assert.equal(first.rule.expiresAt, second.rule.expiresAt);
  assert.equal(JSON.parse(await readFile(rulesPath, 'utf8')).length, 1);
  const connected = createConnectedDecider({ rulesPath, now: () => clock, baseDecide: decide, ruleIds: RULE_IDS });
  assert.equal((await connected({ ...request, deviceId: 'b'.repeat(16) })).decision, 'allow');
  assert.equal((await connected({ ...request, deviceRegistered: false })).reasonCode, 'device_not_registered');
  const stepUp = { schema: 'aleph.decision.v1', requestId: request.requestId, decision: 'step_up', reasonCode: 'step_up_required', ruleIds: ['step_up_required'] };
  const unchanged = createConnectedDecider({ rulesPath, now: () => clock, baseDecide: async () => stepUp, ruleIds: RULE_IDS });
  assert.deepEqual(await unchanged(request), stepUp);
});

test('unbound, malformed and stale alerts do not create deny rules', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'privilege-unbound-'));
  const rulesPath = join(directory, 'deny-rules.json');
  const logPath = join(directory, 'alerts.log');
  const alerts = JSON.parse(await readFile(new URL('../xdr/fixtures/privilege.json', import.meta.url), 'utf8')).alerts;
  const alert = alerts[0];
  const clock = Date.parse(alert.timestamp) + 1000;
  const unbound = createResponder({ rulesPath, logPath, now: () => clock });
  assert.equal((await unbound(alert)).outcome, 'not_bound');
  assert.equal((await unbound(alerts[9])).outcome, 'alert_only');
  assert.equal((await unbound(alerts[17])).outcome, 'record');
  const malformed = createResponder({ rulesPath, logPath, now: () => clock,
    resolveVerifiedRequest: async () => ({ role: 'admin', userId: 'user01' }) });
  assert.equal((await malformed(alert)).outcome, 'not_bound');
  const stale = createResponder({ rulesPath, logPath, now: () => clock + 300_000 });
  assert.equal((await stale(alert)).outcome, 'invalid_or_expired_alert');
  await assert.rejects(readFile(rulesPath), { code: 'ENOENT' });
});

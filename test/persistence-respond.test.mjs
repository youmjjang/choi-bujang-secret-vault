import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createResponder, createConnectedDecider } from '../xdr/persistence/respond.mjs';
import { decide, RULE_IDS } from '../src/decider.mjs';
import { fixtureRequests } from '../scripts/fixture-7.mjs';

test('replay 24 persistence alerts: only eight clear correlated attacks deny; normal and expiry allow', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'persistence-response-'));
  const rulesPath = join(directory, 'deny-rules.json');
  const logPath = join(directory, 'alerts.log');
  const alerts = JSON.parse(await readFile(new URL('../xdr/fixtures/persistence.json', import.meta.url), 'utf8')).alerts;
  const { normal } = fixtureRequests();
  const bindings = new Map(alerts.map((alert, i) => [alert.id, { ...normal,
    deviceId: (i + 1).toString(16).padStart(16, '0'), at: alert.timestamp }]));
  let clock;
  const respond = createResponder({ rulesPath, logPath, now: () => clock,
    resolveVerifiedRequest: async id => bindings.get(id) });
  const connected = createConnectedDecider({ rulesPath, now: () => clock, baseDecide: decide, ruleIds: RULE_IDS });
  for (const alert of alerts) {
    clock = Date.parse(alert.timestamp) + 1000;
    const response = await respond(alert);
    assert.equal((await connected(bindings.get(alert.id))).decision, response.action === 'block' ? 'deny' : 'allow');
    if (response.rule) {
      assert.equal(response.rule.evidenceAlertId, alert.id);
      assert(Date.parse(response.rule.expiresAt) > clock);
    }
  }
  const rules = JSON.parse(await readFile(rulesPath, 'utf8'));
  assert.equal(rules.length, 8);
  assert(rules.every(rule => !rule.evidenceAlertId.match(/^ps-(09|1[0-9]|2[0-4])$/u)));
  clock += 300_001;
  assert.equal((await connected(bindings.get('ps-01'))).decision, 'allow');
  const logs = (await readFile(logPath, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.equal(logs.length, 16);
  assert(logs.every(log => log.module === 'persistence'));
  assert(!JSON.stringify(logs).includes('user01'));
});
test('unbound or old alerts and normal events cannot create operational deny rules', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'persistence-unbound-'));
  const rulesPath = join(directory, 'deny-rules.json');
  const logPath = join(directory, 'alerts.log');
  const alerts = JSON.parse(await readFile(new URL('../xdr/fixtures/persistence.json', import.meta.url), 'utf8')).alerts;
  const alert = alerts[0];
  const unbound = createResponder({ rulesPath, logPath, now: () => Date.parse(alert.timestamp) + 1000 });
  assert.equal((await unbound(alert)).outcome, 'not_bound');
  assert.equal((await unbound(alerts[16])).outcome, 'record');
  const old = createResponder({ rulesPath, logPath, now: () => Date.parse(alert.timestamp) + 300_001 });
  assert.equal((await old(alert)).outcome, 'invalid_or_expired_alert');
  await assert.rejects(readFile(rulesPath), { code: 'ENOENT' });
});

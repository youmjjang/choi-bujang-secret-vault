import test from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../src/decider.mjs';
import { fixtureRequests } from '../scripts/fixture-7.mjs';

test('combined fixture requires another login with a reason; normal and region alone allow', async () => {
  const { normal, suspicious } = fixtureRequests();
  assert.equal((await decide(normal)).decision, 'allow');
  const risk = await decide(suspicious);
  assert.equal(risk.decision, 'step_up');
  assert.equal(risk.reasonCode, 'step_up_required');
  assert.deepEqual(risk.ruleIds, ['step_up_required']);
  for (const request of [
    { ...normal, signals: { ...normal.signals, region: 'foreign' } },
    { ...suspicious, signals: { ...suspicious.signals, network: 'usual' } },
    { ...suspicious, signals: { ...suspicious.signals, hour: 14 } },
    { ...suspicious, recentEvents: [{ kind: 'risk_signal', ageSeconds: 60, count: 19 }] },
    { ...suspicious, recentEvents: [{ kind: 'risk_signal', ageSeconds: 301, count: 20 }] },
    { ...suspicious, recentEvents: [] },
  ]) assert.equal((await decide(request)).decision, 'allow');
});

test('device denial takes priority; only fresh verified fixture reauthentication clears risk', async () => {
  const { suspicious } = fixtureRequests();
  assert.equal((await decide({ ...suspicious, deviceRegistered: false })).reasonCode, 'device_not_registered');
  for (const stepUp of [undefined, { verified: false, authAgeSeconds: 60 },
    { verified: true, authAgeSeconds: null }, { verified: true, authAgeSeconds: 901 }]) {
    assert.equal((await decide({ ...suspicious, stepUp })).decision, 'step_up');
  }
  assert.equal((await decide({ ...suspicious, stepUp: { verified: true, authAgeSeconds: 60 } })).decision, 'allow');
});

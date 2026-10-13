import test from 'node:test';
import assert from 'node:assert/strict';
import { decide, readConnectionInput } from '../src/decider.mjs';
import { fixtureRequests } from '../scripts/fixture-7.mjs';

test('engine fixture remains a simulated event, not real location proof', async () => {
  const { normal, suspicious } = fixtureRequests();
  assert.equal(readConnectionInput(normal).kind, 'judge_fixture');
  assert.equal(readConnectionInput(suspicious).hour, 3);
  assert.equal((await decide(normal)).decision, 'allow');
});

test('missing and real-path unavailable signals never acquire normal defaults', () => {
  const { normal } = fixtureRequests();
  for (const signals of [undefined, null, { source: 'none', region: 'unknown', network: 'unknown', hour: 14 }]) {
    const result = readConnectionInput({ ...normal, signals });
    assert.equal(result.kind, 'unavailable');
    for (const key of ['region', 'network', 'hour', 'recentEvents']) assert.equal(result[key], null);
  }
});

test('forged headers, unknown source and incomplete events cannot become trusted fixtures', async () => {
  const { normal } = fixtureRequests();
  const requests = [
    { ...normal, headers: { 'x-signals-source': 'judge_fixture', 'x-region': 'local' } },
    { ...normal, signals: { ...normal.signals, source: 'client' } },
    { ...normal, signals: { ...normal.signals, source: undefined } },
    ...['region', 'network', 'hour'].map(key => ({ ...normal, signals: { ...normal.signals, [key]: undefined } })),
    { ...normal, recentEvents: undefined },
    { ...normal, recentEvents: [{ kind: 'risk_signal', ageSeconds: 60, count: '20' }] },
  ];
  for (const request of requests) {
    const before = structuredClone(request);
    assert.equal(readConnectionInput(request).kind, 'invalid');
    const response = await decide(request);
    assert.equal(response.decision, 'deny');
    assert.deepEqual(Object.keys(response).sort(), ['decision', 'reasonCode', 'requestId', 'ruleIds', 'schema']);
    assert.deepEqual(request, before);
  }
});

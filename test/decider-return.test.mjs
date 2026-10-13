import test from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../src/decider.mjs';
import { fixtureRequests } from '../scripts/fixture-7.mjs';

test('verified identity and device are required before reading reaches the ownership API', () => {
  const request = { schema: 'aleph.decision.v1', requestId: 'synthetic-route-only',
    method: 'GET', route: 'GET /api/notes/:id', deviceRegistered: true,
    subjectId: 'synthetic_reader', deviceId: 'a'.repeat(16),
    path: '/api/notes/aabbccdd-1234-4567-89ab-123456789abc',
    signals: { source: 'unavailable_example' } };
  assert.equal(decide(request).decision, 'allow');
  assert.equal(decide({ ...request, deviceRegistered: false }).decision, 'deny');
  assert.equal(decide({ ...request, route: 'GET /api/notes/all' }).decision, 'deny');
  assert.equal(decide({ ...request, path: '/api/notes/export' }).decision, 'deny');
  assert.equal(decide({ ...request, method: 'PUT' }).decision, 'deny');
  assert.equal(decide({ ...request, subjectId: undefined }).decision, 'deny');
  assert.equal(decide({ ...request, deviceId: undefined }).decision, 'deny');
});

test('direct and awaited callers receive identical complete decisions', async () => {
  const { normal, suspicious } = fixtureRequests();
  const cases = [
    [normal, 'allow'],
    [{ ...normal, deviceRegistered: false }, 'deny'],
    [{ ...normal, path: '/api/notes/all', route: 'GET /api/notes/all' }, 'deny'],
    [{ ...normal, path: '/api/notices/demo', route: 'PUT /api/notices/:id', method: 'PUT' }, 'deny'],
    [suspicious, 'step_up'],
  ];
  for (const [request, expected] of cases) {
    const direct = decide(request);
    assert.equal(direct?.then, undefined);
    assert.equal(direct.decision, expected);
    assert.deepEqual(Object.keys(direct).sort(), ['decision', 'reasonCode', 'requestId', 'ruleIds', 'schema']);
    assert.deepEqual(await decide(request), direct);
  }
});

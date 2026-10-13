import test from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../src/decider.mjs';
import { fixtureRequests } from '../scripts/fixture-7.mjs';

test('method, service, exact path and query cannot disguise another operation', async () => {
  const { normal } = fixtureRequests();
  for (const changed of [
    { path: '/notes/export' }, { path: '/notes/demo/export' },
    { method: 'PUT' }, { service: 'notices' }, { queryLength: 8 },
    { path: '/notices/demo', route: 'PUT /notices/:id', method: 'PUT' },
    { subjectId: '' }, { deviceId: '' },
  ]) {
    const result = await decide({ ...normal, ...changed });
    assert.equal(result.decision, 'deny');
    assert.deepEqual(result.ruleIds, ['resource_boundary']);
  }
  assert.equal((await decide(normal)).decision, 'allow');
});

test('unverified ownership never grants note updates; device denial is preserved', async () => {
  const { normal } = fixtureRequests();
  const request = { ...normal, method: 'PUT', route: 'PUT /notes/:id',
    path: '/notes/aabbccdd-1234-4567-89ab-123456789abc' };
  assert.equal((await decide(request)).decision, 'deny');
  assert.equal((await decide({ ...request, deviceRegistered: false })).reasonCode, 'device_not_registered');
});

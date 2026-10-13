import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecider } from '../src/decider.mjs';
import { fixtureRequests } from '../scripts/fixture-7.mjs';

test('server bindings permit owner read/update and deny other subjects and client role', async () => {
  const { normal } = fixtureRequests();
  const path = '/notes/aabbccdd-1234-4567-89ab-123456789abc';
  const binding = { classId: normal.classId, projectId: normal.projectId,
    subjectId: 'synthetic_owner_a', path, methods: ['GET', 'PUT'] };
  const decide = createDecider([binding]);
  binding.subjectId = 'synthetic_owner_b'; // Caller mutation cannot rewrite the registered policy.
  for (const method of ['GET', 'PUT']) {
    const request = { ...normal, subjectId: 'synthetic_owner_a', path, method,
      route: `${method} /notes/:id` };
    assert.equal((await decide(request)).decision, 'allow');
    assert.equal((await decide({ ...request, subjectId: 'synthetic_owner_b', role: 'teacher' })).decision, 'deny');
    assert.equal((await decide({ ...request, path: '/notes/export' })).decision, 'deny');
    assert.equal((await decide({ ...request, deviceRegistered: false })).decision, 'deny');
  }
  assert.equal((await decide({ ...normal, method: 'PUT', path: '/notices/demo',
    route: 'PUT /notices/:id', role: 'teacher' })).decision, 'deny');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../src/decider.mjs';
import { fixtureRequests } from '../scripts/fixture-7.mjs';

test('direct and awaited callers receive identical complete decisions', async () => {
  const { normal, suspicious } = fixtureRequests();
  const cases = [
    [normal, 'allow'],
    [{ ...normal, deviceRegistered: false }, 'deny'],
    [{ ...normal, path: '/api/notes', route: 'GET /api/notes' }, 'deny'],
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

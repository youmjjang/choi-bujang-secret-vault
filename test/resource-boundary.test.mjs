import test from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../src/decider.mjs';
import { fixtureRequests } from '../scripts/fixture-7.mjs';

test('supplied own-note fixture accepts A read/update and denies B and ambiguous prefixes', () => {
  const { normal } = fixtureRequests();
  for (const prefix of ['', '/api']) for (const method of ['GET', 'PUT']) {
    const own = { ...normal, method, subjectId: 'student_a', path: prefix + '/notes/note-a', route: `${method} ${prefix}/notes/:id` };
    assert.equal(decide(own).decision, 'allow');
    assert.equal(decide({ ...own, subjectId: 'student_b' }).decision, 'deny');
    assert.equal(decide({ ...own, path: prefix + '/notes/note-ab' }).decision, 'deny');
    assert.equal(decide({ ...own, path: prefix + '/notes/note-a-foreign' }).decision, 'deny');
  }
});
test('unknown paths, query functions, client instructor labels and unregistered device deny', () => {
  const { normal } = fixtureRequests();
  for (const change of [{ path: '/notes/export' }, { path: '/notes/demo/export' }, { path: '/apiary/notes/demo' },
    { path: '/notes/demo/' }, { queryLength: 10 }, { method: 'POST' }, { deviceRegistered: false },
    { path: '/notes/instructor-other' }, { path: '/notes/notice-other', role: 'teacher' }, { subjectId: '' }])
    assert.equal(decide({ ...normal, ...change }).decision, 'deny');
});
test('demo belongs only to learner_fixture and cannot be shared with another fixture subject', () => {
  const { normal } = fixtureRequests();
  assert.equal(decide(normal).decision, 'allow');
  assert.equal(decide({ ...normal, subjectId: 'learner_fixture_b' }).decision, 'deny');
});
test('owner-filtered deployed collection works while foreign collection paths deny', () => {
  const { normal } = fixtureRequests();
  for (const path of ['/api/notes', '/api/my/notes']) {
    const own = { ...normal, path, route: `GET ${path}` };
    assert.equal(decide(own).decision, 'allow');
    assert.equal(decide({ ...own, path: '/api/users/b/notes' }).decision, 'deny');
    assert.equal(decide({ ...own, queryLength: 10 }).decision, 'deny');
  }
});
test('real opaque UUID requests continue to reach final ownership-checking API', () => {
  const { normal } = fixtureRequests();
  const live = { ...normal, signals: { source: 'none', region: 'unknown', network: 'unknown', hour: null },
    path: '/api/notes/aabbccdd-1234-4567-89ab-123456789abc', route: 'GET /api/notes/:id' };
  assert.equal(decide(live).decision, 'allow');
  assert.equal(decide({ ...live, deviceRegistered: false }).decision, 'deny');
});

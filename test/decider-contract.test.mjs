import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { decide, RULE_IDS } from '../src/decider.mjs';
import { fixtureRequests } from '../scripts/fixture-7.mjs';

const document = await readFile(new URL('../docs/DECIDER_REQUEST.md', import.meta.url), 'utf8');
const fields = new Set(document.split('\n').filter(line => line.startsWith('| `'))
  .flatMap(line => [...line.split('|')[1].matchAll(/`([a-zA-Z][A-Za-z0-9]*)`/gu)].map(match => match[1])));
assert.equal(fields.size, 18, 'review the published contract if the field list changes');
const responseKeys = ['decision', 'reasonCode', 'requestId', 'ruleIds', 'schema'];

function guarded(object, allowed) {
  return new Proxy(object, {
    get(target, key, receiver) {
      if (typeof key === 'string' && !allowed.has(key)) throw new Error(`undocumented_field:${key}`);
      return Reflect.get(target, key, receiver);
    },
    set() { throw new Error('request_mutation'); },
    deleteProperty() { throw new Error('request_mutation'); },
    defineProperty() { throw new Error('request_mutation'); },
  });
}
function requestGuard(request) {
  return guarded({ ...request,
    signals: guarded(request.signals, new Set(['source', 'region', 'network', 'hour'])),
    stepUp: guarded(request.stepUp, new Set(['verified', 'authAgeSeconds'])),
    recentEvents: request.recentEvents.map(event => guarded(event, new Set(['kind', 'ageSeconds', 'count']))),
  }, fields);
}
function validate(request, response) {
  assert.deepEqual(Object.keys(response).sort(), responseKeys);
  assert.equal(response.schema, 'aleph.decision.v1');
  assert.equal(response.requestId, request.requestId);
  assert(['allow', 'deny', 'step_up'].includes(response.decision));
  assert.match(response.reasonCode, /^[a-z][a-z0-9_]{0,63}$/u);
  assert(Array.isArray(response.ruleIds) && response.ruleIds.length > 0);
  assert.equal(new Set(response.ruleIds).size, response.ruleIds.length);
  assert(response.ruleIds.every(rule => RULE_IDS.includes(rule)));
}

test('documented fields only; response contract holds across 1,296 synthetic combinations', async () => {
  const { normal } = fixtureRequests();
  const paths = ['/notes/demo', '/notes/note-a', '/notes/note-b', '/notes/notice',
    '/notes/export', '/notes', '/unknown', '/notes/note-a?operation=export'];
  const signals = [
    { source: 'none', region: 'unknown', network: 'unknown', hour: null },
    { source: 'judge_fixture', region: 'local', network: 'usual', hour: 14 },
    { source: 'judge_fixture', region: 'foreign', network: 'unusual', hour: 3 },
  ];
  const steps = [{ verified: false, authAgeSeconds: null },
    { verified: true, authAgeSeconds: 0 }, { verified: true, authAgeSeconds: 900 }];
  let count = 0;
  for (const subjectId of ['learner_fixture', 'student_a', 'student_b'])
    for (const deviceRegistered of [true, false])
      for (const path of paths)
        for (const method of ['GET', 'PUT', 'POST'])
          for (const signal of signals)
            for (const stepUp of steps) {
              const query = path.includes('?') ? path.split('?')[1] : '';
              const request = { ...normal, subjectId, deviceRegistered, path, method,
                route: `${method} /notes/:id`, requestId: randomUUID(), at: new Date().toISOString(),
                signals: signal, stepUp, recentEvents: [{ kind: 'risk_signal', ageSeconds: 60, count: 20 }],
                queryLength: query.length, querySha256: createHash('sha256').update(query).digest('hex') };
              const before = JSON.stringify(request);
              validate(request, await decide(requestGuard(request)));
              assert.equal(JSON.stringify(request), before);
              count++;
            }
  assert.equal(count, 1296);
});
test('normal allow, registered-device deny and step-up remain distinct', async () => {
  const { normal, suspicious } = fixtureRequests();
  for (const [request, expected] of [
    [normal, 'allow'], [{ ...normal, deviceRegistered: false }, 'deny'],
    [suspicious, 'step_up'],
    [{ ...suspicious, stepUp: { verified: true, authAgeSeconds: 60 } }, 'allow'],
  ]) {
    const response = await decide(requestGuard(request));
    validate(request, response);
    assert.equal(response.decision, expected);
  }
});

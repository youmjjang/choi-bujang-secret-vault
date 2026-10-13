import test from 'node:test';
import assert from 'node:assert/strict';
import { detect, readEvents, detectVerifiedRequests } from '../src/detect.mjs';
import { fixtureRequests } from '../scripts/fixture-7.mjs';

const start = Date.parse('2026-10-01T00:00:00Z');
const events = (count, subject = 'synthetic_a', spacing = 2000) =>
  Array.from({ length: count }, (_, i) => ({
    at: new Date(start + i * spacing).toISOString(), method: 'GET', identity: { sub: subject },
  }));
test('local contract distinguishes exact threshold, burst and separated subjects/windows', () => {
  assert.deepEqual(detect(events(120)), { action: 'observe' });
  assert.deepEqual(detect(events(121).reverse()), { action: 'propose_revocation', reasonCode: 'burst_read', subject: 'synthetic_a' });
  assert.deepEqual(detect([...events(100), ...events(100, 'synthetic_b')]), { action: 'observe' });
  assert.deepEqual(detect(events(200, 'synthetic_a', 7000)), { action: 'observe' });
  assert.deepEqual(detect(events(200).map(event => ({ ...event, method: 'PUT' }))), { action: 'observe' });
});
test('input projection excludes all content, token and personal fields without mutating input', () => {
  const input = events(1).map(event => ({ ...event, body: 'synthetic_content', token: 'synthetic_token', name: 'synthetic_name' }));
  const before = structuredClone(input);
  const result = JSON.stringify(readEvents(input));
  for (const value of ['synthetic_content', 'synthetic_token', 'synthetic_name']) assert(!result.includes(value));
  assert.deepEqual(input, before);
  assert.throws(() => detect([{ at: 'invalid', method: 'GET', identity: { sub: 'synthetic_a' } }]), /invalid_detection_events/);
});
test('only unusual-network burst on one verified synthetic device proposes revocation', () => {
  const { normal } = fixtureRequests();
  const requestRows = Array.from({ length: 121 }, (_, i) => ({ ...normal,
    at: new Date(start + i * 2000).toISOString(),
    signals: { ...normal.signals, network: 'unusual' } }));
  assert.deepEqual(detectVerifiedRequests(requestRows), { action: 'propose_revocation', reasonCode: 'burst_read',
    subject: normal.subjectId, deviceId: normal.deviceId });
  assert.deepEqual(detectVerifiedRequests(requestRows.slice(0, 120)), { action: 'observe' });
  assert.deepEqual(detectVerifiedRequests(requestRows.map(request => ({ ...request,
    signals: { ...request.signals, network: 'usual', region: 'foreign' } }))), { action: 'observe' });
  assert.deepEqual(detectVerifiedRequests(requestRows.map((request, i) => ({ ...request,
    deviceId: i % 2 ? 'b'.repeat(16) : 'a'.repeat(16) }))), { action: 'observe' });
  assert.deepEqual(detectVerifiedRequests(requestRows.map(request => ({ ...request,
    signals: { source: 'client', network: 'unusual' } }))), { action: 'observe' });
  assert.throws(() => detectVerifiedRequests([{ ...normal, headers: { 'x-network': 'unusual' } }]), /invalid_detection_requests/);
});

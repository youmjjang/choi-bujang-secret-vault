import test from 'node:test';
import assert from 'node:assert/strict';
import { decide, createDecider } from '../xdr/brute-force/decide.mjs';
import { normalize } from '../xdr/brute-force/read-alerts.mjs';
import { denyRule, isBlocked, withXdr } from '../xdr/brute-force/enforce.mjs';
import { askJev } from '../xdr/brute-force/jev.mjs';
const event = { id: 'test-1', timestamp: new Date().toISOString(), data: { srcip: '192.0.2.5', srcuser: 'user01', count: '48' }, rule: { level: 12, mitre: ['T1110'], description: '2분 안 로그인 실패 48건' } };
test('attack evidence independent of fixture ID', async () => assert.equal((await decide(event)).action, 'block'));
test('normal success remains record even with high level', async () => assert.equal((await decide({ ...event, rule: { ...event.rule, description: '로그인이 성공했습니다.' } })).action, 'record'));
test('slow failures remain uncertain', async () => assert.equal((await decide({ ...event, rule: { ...event.rule, description: '60분 로그인 실패 48건' } })).action, 'alert'));
test('Jev unavailable and invalid results alert', async () => {
  const alert = { ...event, data: { ...event.data, count: '4' } };
  for (const jev of [undefined, async () => { throw Error(); }, async () => ({ confidence: NaN })]) assert.equal((await createDecider({ jev })(alert)).action, 'alert');
  for (const [confidence, action] of [[0.49, 'record'], [0.5, 'alert'], [0.85, 'block']]) assert.equal((await createDecider({ jev: async () => ({ confidence }) })(alert)).action, action);
});
test('expiry and original policy are preserved', async () => {
  const now = Date.parse(event.timestamp); const rule = denyRule(event, { action: 'block', confidence: 0.95 }, now);
  assert.ok(isBlocked(event.data.srcip, [rule], now)); assert.ok(!isBlocked(event.data.srcip, [rule], now + 900000));
  assert.equal(denyRule(event, { action: 'alert', confidence: 0.5 }, now), null);
  const deny = async () => ({ decision: 'deny', reasonCode: 'original' });
  assert.deepEqual(await withXdr(deny, { rules: [rule], sourceIp: '192.0.2.99', now })({}), await deny());
});
test('secrets omitted from reader', () => {
  const row = normalize({ ...event, data: { ...event.data, password: 'hidden' }, rule: { ...event.rule, description: 'password=hidden token=hidden' } });
  assert.ok(!JSON.stringify(row).includes('hidden')); assert.equal(Object.keys(row).length, 5);
});
test('official Jev request, bounded probability and API failure', async () => {
  const fetchImpl = async (url, options) => {
    assert.equal(url, 'https://api.typesafe.ai/v1/systemone');
    assert.equal(JSON.parse(options.body).questions.attack.type, 'noul');
    return { ok: true, json: async () => ({ answers: { attack: { noul: 0.7 } } }) };
  };
  assert.deepEqual(await askJev({ failures: 4 }, { apiKey: 'test-only', fetchImpl }), { confidence: 0.7 });
  await assert.rejects(askJev({}, { apiKey: '', fetchImpl }));
  await assert.rejects(askJev({}, { apiKey: 'test-only', fetchImpl: async () => ({ ok: false }) }));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecider, decide } from '../xdr/web-injection/decide.mjs';
import { denyRule, isBlocked } from '../xdr/web-injection/enforce.mjs';
const event = { id: 'example', timestamp: new Date().toISOString(), rule: { level: 12, mitre: ['T1190'], description: 'SQL 구문을 이어 붙인 요청이 반복됐습니다.' }, data: { srcip: '192.0.2.9', count: '12' } };
test('repeated injection blocked without consulting AI', async () => {
  assert.equal((await createDecider({ jev: async () => assert.fail('clear evidence needs no AI') })(event)).action, 'block');
});
test('single keyword never blocked and normal lookup recorded', async () => {
  assert.equal((await decide({ ...event, rule: { ...event.rule, level: 6, description: 'SQL 수업 공지' }, data: { ...event.data, count: '1', url: '/search?q=select-course' } })).action, 'alert');
  assert.equal((await decide({ ...event, rule: { level: 3, mitre: [], description: '정상 검색' }, data: { ...event.data, count: '1', url: '/search?q=select-course' } })).action, 'record');
});
test('repeated ordinary traffic never blocked just because count is high', async () => {
  assert.equal((await decide({ ...event, rule: { level: 3, mitre: [], description: '메모 조회' } })).action, 'record');
});
test('Jev boundaries and failure fallback', async () => {
  const uncertain = { ...event, data: { ...event.data, count: '1' } };
  for (const [confidence, action] of [[0.49, 'record'], [0.5, 'alert'], [0.85, 'block']]) assert.equal((await createDecider({ jev: async () => ({ confidence }) })(uncertain)).action, action);
  assert.equal((await createDecider({ jev: async () => { throw Error(); } })(uncertain)).action, 'alert');
});
test('temporary deny expires and alerts never create deny rules', () => {
  const now = Date.parse(event.timestamp); const rule = denyRule(event, { action: 'block', confidence: 0.95 }, now);
  assert.equal(rule.ruleId, 'xdr.web-injection'); assert.ok(isBlocked(event.data.srcip, [rule], now));
  assert.ok(!isBlocked(event.data.srcip, [rule], now + 900000));
  assert.equal(denyRule(event, { action: 'alert', confidence: 0.5 }, now), null);
});

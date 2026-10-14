import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, createContext } from 'node:vm';

async function isolated() {
  const source = await readFile(new URL('../xdr/exfiltration/decide.mjs', import.meta.url), 'utf8');
  const patterns = JSON.parse(await readFile(new URL('../xdr/exfiltration/patterns.json', import.meta.url), 'utf8')).patterns;
  assert.deepEqual(JSON.parse(source.slice('const PATTERNS = '.length, source.indexOf(';'))), patterns);
  const module = new SourceTextModule(source, { context: createContext({}) });
  await module.link(() => { throw new Error('imports_forbidden'); });
  assert.equal(module.dependencySpecifiers.length, 0);
  await module.evaluate();
  assert.deepEqual(Object.keys(module.namespace), ['decide']);
  return module.namespace.decide;
}
test('isolated exfiltration decider synchronously separates all 30 original alerts', async () => {
  const decide = await isolated();
  const alerts = JSON.parse(await readFile(new URL('../xdr/fixtures/exfiltration.json', import.meta.url), 'utf8')).alerts;
  const counts = { block: 0, alert: 0, record: 0 };
  for (const alert of alerts) {
    const before = JSON.stringify(alert);
    const result = decide(alert);
    const number = Number(alert.id.split('-')[1]);
    assert.equal(result.action, number <= 10 ? 'block' : number <= 20 ? 'alert' : 'record', alert.id);
    assert.deepEqual(Object.keys(result).sort(), ['action', 'confidence', 'reason']);
    assert(result.confidence >= 0 && result.confidence <= 1);
    assert.equal(result.action, result.confidence >= 0.85 ? 'block' : result.confidence >= 0.5 ? 'alert' : 'record');
    assert(!/[\r\n]/u.test(result.reason));
    assert.equal(typeof result.then, 'undefined');
    assert.deepEqual(result, decide(alert));
    assert.equal(JSON.stringify(alert), before);
    counts[result.action]++;
  }
  assert.deepEqual(counts, { block: 10, alert: 10, record: 10 });
});
test('large quantity, destination, clock and severity alone do not block; approved backup and failed transfers stay safe', async () => {
  const decide = await isolated();
  for (const alert of [null, {}, { rule: { level: 15 }, data: { bytes: '900000000', dstip: '203.0.113.99' } },
    { timestamp: '2026-10-14T03:00:00Z', data: { bytes: 'NaN' } },
    { rule: { description: '승인된 백업 전송입니다.', mitre: ['T1048'], level: 12 }, data: { bytes: '900000000' } }])
    assert.equal(decide(alert).action, 'record');
  assert.equal(decide({ rule: { description: '처음 보는 주소로 대용량 전송이 실패했습니다.', level: 12, mitre: ['T1048'] },
    data: { bytes: '900000000' } }).action, 'alert');
});

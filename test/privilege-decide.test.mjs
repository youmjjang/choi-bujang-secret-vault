import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, createContext } from 'node:vm';

async function isolated() {
  const source = await readFile(new URL('../xdr/privilege/decide.mjs', import.meta.url), 'utf8');
  const patterns = JSON.parse(await readFile(new URL('../xdr/privilege/patterns.json', import.meta.url), 'utf8')).patterns;
  assert.deepEqual(JSON.parse(source.slice('const PATTERNS = '.length, source.indexOf(';'))), patterns);
  const module = new SourceTextModule(source, { context: createContext({}) });
  await module.link(() => { throw new Error('imports_forbidden'); });
  assert.equal(module.dependencySpecifiers.length, 0);
  await module.evaluate();
  assert.deepEqual(Object.keys(module.namespace), ['decide']);
  return module.namespace.decide;
}
test('one isolated privilege file synchronously separates clear, uncertain and normal fixture alerts', async () => {
  const decide = await isolated();
  const alerts = JSON.parse(await readFile(new URL('../xdr/fixtures/privilege.json', import.meta.url), 'utf8')).alerts;
  const counts = { block: 0, alert: 0, record: 0 };
  for (const alert of alerts) {
    const before = JSON.stringify(alert);
    const result = decide(alert);
    const number = Number(alert.id.split('-')[1]);
    assert.equal(result.action, number <= 9 ? 'block' : number <= 17 ? 'alert' : 'record', alert.id);
    assert.deepEqual(Object.keys(result).sort(), ['action', 'confidence', 'reason']);
    assert(result.confidence >= 0 && result.confidence <= 1);
    assert.equal(result.action, result.confidence >= 0.85 ? 'block' : result.confidence >= 0.5 ? 'alert' : 'record');
    assert(!/[\r\n]/u.test(result.reason));
    assert.equal(typeof result.then, 'undefined');
    assert.deepEqual(result, decide(alert));
    assert.equal(JSON.stringify(alert), before);
    counts[result.action]++;
  }
  assert.deepEqual(counts, { block: 9, alert: 8, record: 9 });
});
test('severity or group membership alone cannot block; approved changes and missing observations remain safe', async () => {
  const decide = await isolated();
  for (const alert of [null, {}, { rule: { level: 15 }, data: { group: 'administrators' } },
    { rule: { level: 15, description: '승인된 그룹 변경으로 관리자 그룹에 추가했습니다.', mitre: ['T1078'] },
      data: { group: 'administrators' } }]) assert.equal(decide(alert).action, 'record');
  const uncertain = decide({ rule: { level: 8, description: '관리자 명령 실행의 승인 여부를 확인 중입니다.', mitre: ['T1068'] } });
  assert.equal(uncertain.action, 'alert');
  assert(uncertain.confidence < 0.85);
});

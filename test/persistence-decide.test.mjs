import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, createContext } from 'node:vm';

test('standalone persistence file embeds identical patterns and immediately distinguishes all 24 alerts', async () => {
  const source = await readFile(new URL('../xdr/persistence/decide.mjs', import.meta.url), 'utf8');
  const patternDoc = JSON.parse(await readFile(new URL('../xdr/persistence/patterns.json', import.meta.url), 'utf8'));
  assert.deepEqual(JSON.parse(source.slice('const PATTERNS = '.length, source.indexOf(';'))), patternDoc.patterns);
  const module = new SourceTextModule(source, { context: createContext({}) });
  await module.link(() => { throw new Error('imports_forbidden'); });
  assert.equal(module.dependencySpecifiers.length, 0);
  await module.evaluate();
  assert.deepEqual(Object.keys(module.namespace), ['decide']);
  const decide = module.namespace.decide;
  const fixture = JSON.parse(await readFile(new URL('../xdr/fixtures/persistence.json', import.meta.url), 'utf8'));
  const counts = { block: 0, alert: 0, record: 0 };
  for (const alert of fixture.alerts) {
    const before = JSON.stringify(alert);
    const result = decide(alert);
    const number = Number(alert.id.split('-')[1]);
    assert.equal(result.action, number <= 8 ? 'block' : number <= 16 ? 'alert' : 'record', alert.id);
    assert.deepEqual(Object.keys(result).sort(), ['action', 'confidence', 'reason']);
    assert(result.confidence >= 0 && result.confidence <= 1);
    assert.equal(result.action, result.confidence >= 0.85 ? 'block' : result.confidence >= 0.5 ? 'alert' : 'record');
    assert(!/[\r\n]/u.test(result.reason));
    assert.deepEqual(result, decide(alert));
    assert.equal(JSON.stringify(alert), before);
    counts[result.action]++;
  }
  assert.deepEqual(counts, { block: 8, alert: 8, record: 8 });
  assert.equal(decide({ rule: { level: 15 }, data: { path: 'C:\\Temp\\example.exe' } }).action, 'record');
  assert.equal(decide(null).action, 'record');
});

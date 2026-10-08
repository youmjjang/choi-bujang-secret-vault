import { SourceTextModule, createContext } from 'node:vm';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const context = createContext({});
const modules = new Map();
async function load(url) {
  if (modules.has(url.href)) return modules.get(url.href);
  const module = new SourceTextModule(await readFile(url, 'utf8'), { context, identifier: url.href });
  modules.set(url.href, module);
  await module.link(async (specifier, importer) => {
    assert.ok(specifier.startsWith('./') || specifier.startsWith('../'), 'external imports forbidden');
    assert.ok(specifier.endsWith('.mjs'), 'only local JS modules allowed');
    return load(new URL(specifier, importer.identifier));
  });
  return module;
}
const moduleKey = process.argv[2] || 'brute-force';
assert.ok(['brute-force', 'web-injection'].includes(moduleKey));
const module = await load(new URL(`../xdr/${moduleKey}/decide.mjs`, import.meta.url));
await module.evaluate();
const fixture = JSON.parse(await readFile(new URL(`../xdr/fixtures/${moduleKey}.json`, import.meta.url)));
const counts = { block: 0, alert: 0, record: 0 };
for (const alert of fixture.alerts) counts[(await module.namespace.decide(alert)).action]++;
assert.deepEqual(counts, moduleKey === 'brute-force' ? { block: 10, alert: 9, record: 9 } : { block: 8, alert: 9, record: 9 });
console.log('Isolated runtime without Node globals: ' + JSON.stringify(counts));

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { normalize } from './normalize.mjs';
export { normalize, redact } from './normalize.mjs';

export async function readAlerts(path = new URL('../fixtures/brute-force.json', import.meta.url)) {
  const fixture = JSON.parse(await readFile(path, 'utf8'));
  if (!Array.isArray(fixture.alerts)) throw new Error('Invalid alert fixture');
  return fixture.alerts.map(normalize);
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  for (const row of await readAlerts()) console.log(JSON.stringify(row));
}

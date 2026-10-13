// Isolated handler tests with a mock DB and verified identity, not live account tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { resourceId } from '../src/resource-id.mjs';

async function invoke(file, { method = 'GET', data, body, userId = 'fixture_a' } = {}) {
  const filters = [];
  const operations = [];
  const db = {};
  for (const name of ['from', 'select', 'update', 'insert', 'delete']) {
    db[name] = (...args) => { operations.push([name, ...args]); return db; };
  }
  db.eq = (key, value) => { filters.push([key, value]); return db; };
  db.order = db.maybeSingle = async () => ({ data, error: null });
  const context = createContext({ process: { env: { SUPABASE_URL: 'fixture', SUPABASE_SECRET_KEY: 'fixture' } } });
  const module = new SourceTextModule(await readFile(new URL(file, import.meta.url), 'utf8'), { context });
  await module.link(async specifier => {
    const exports = specifier.includes('supabase') ? { createClient: () => db }
      : specifier.includes('verify-login') ? { createLoginVerifier: () => async () => userId ? { userId } : null }
      : specifier.includes('resource-id') ? { resourceId }
      : specifier === 'node:crypto' ? { randomUUID: () => 'aabbccdd-1234-4567-89ab-123456789abc' }
      : { default: {} };
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  const response = { headers: {}, setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; }, end() { return this; } };
  await module.namespace.default({ method, headers: {}, body,
    query: { id: 'aabbccdd-1234-4567-89ab-123456789abc' } }, response);
  return { response, filters, operations };
}

test('direct item GET returns only the verified owner, not another owner', async () => {
  const own = await invoke('../api/notes/[id].js', { data: { owner_id: 'fixture_a', note_id: 'fixture', title: 'mock', content: 'mock' } });
  assert.equal(own.response.code, 200);
  assert(own.filters.some(([key, value]) => key === 'owner_id' && value === 'fixture_a'));
  const other = await invoke('../api/notes/[id].js', { data: { owner_id: 'fixture_b' } });
  assert.equal(other.response.code, 404);
  assert.equal(other.response.headers['X-Aleph-Deny-Reason'], 'not_found_or_not_owned');
  assert.equal(other.response.body.title, undefined);
});

test('direct list cannot return a foreign row and forged role cannot permit update', async () => {
  const list = await invoke('../api/notes.js', { data: [{ owner_id: 'fixture_b' }] });
  assert.equal(list.response.code, 403);
  const update = await invoke('../api/notes/[id].js', { method: 'PUT', data: { owner_id: 'fixture_b' },
    body: { title: 'mock', body: 'mock', role: 'teacher' } });
  assert.equal(update.response.code, 404);
  assert(!update.operations.some(([name]) => name === 'update'));
});

test('notice mutation is denied even with client teacher role; logged-out read is denied', async () => {
  const mutation = await invoke('../api/notices.js', { method: 'PUT', body: { role: 'teacher' } });
  assert.equal(mutation.response.code, 405);
  assert.equal(mutation.response.headers['X-Aleph-Deny-Reason'], 'instructor_permission_unavailable');
  const read = await invoke('../api/notices.js', { userId: null });
  assert.equal(read.response.code, 401);
});

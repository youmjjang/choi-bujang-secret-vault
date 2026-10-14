import test from 'node:test';
import assert from 'node:assert/strict';
import { runAttackChecks } from '../src/attack-check.mjs';

test('bundle sends only HTTPS GET/HEAD and leaves both POST checks not_run', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const evidence = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(url.protocol, 'https:');
    assert(['GET', 'HEAD'].includes(options.method));
    calls.push(url.pathname);
    assert.equal(options.alephEvidence?.requestKey, 'read');
    evidence.push(options.alephEvidence.caseId);
    if (url.pathname === '/') return new Response('<form id="login-form"></form>');
    if (url.pathname === '/data.json') return Response.json({ notes: [] });
    if (url.pathname === '/manifest.json') return Response.json({ name: 'BYTE BACK 내 자료실', start_url: '/', display: 'standalone' });
    if (url.pathname === '/api/device/status') return Response.json({ approved: false, reason: 'device_not_registered' });
    if (url.pathname === '/api/checks') return Response.json({ schema: 'aleph.operations.v1', step: 12,
      summary: { mismatch: 0, liveExecuted: 1 },
      cases: [{ type: 'normal', result: 'matched' }, { type: 'forbidden', result: 'matched' }],
      assault: { total: 41, notRun: 41 } });
    return Response.json({ error: 'login_required' }, { status: 401 });
  };
  try {
    const records = await runAttackChecks({ step: 12, publicAppUrl: 'https://example.invalid' });
    assert.equal(calls.length, 6);
    assert.equal(records.length, 8);
    assert.deepEqual(evidence, records.filter(record => record.observed !== 'not_run').map(record => record.attackId));
    assert.equal(new Set(evidence).size, 6);
    for (const record of records.filter(record => record.observed !== 'not_run'))
      assert.match(record.observed, /^HTTP [1-5][0-9]{2}$/u);
    for (const id of ['unauthenticated_restore', 'device_request_unavailable'])
      assert.equal(records.find(row => row.attackId === id).observed, 'not_run');
    assert(!calls.some(path => path.startsWith('/api/restore/') || path === '/api/device/request'));
  } finally { globalThis.fetch = originalFetch; }
});

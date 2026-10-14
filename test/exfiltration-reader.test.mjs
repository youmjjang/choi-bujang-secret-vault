import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { extractAlert, readAlerts } from '../xdr/exfiltration/read-alerts.mjs';

test('exfiltration reader emits one five-field line per alert and preserves original', async () => {
  const source = new URL('../xdr/fixtures/exfiltration.json', import.meta.url);
  const before = await readFile(source, 'utf8');
  const alerts = JSON.parse(before).alerts;
  const rows = await readAlerts();
  assert.equal(rows.length, alerts.length);
  for (const row of rows) assert.deepEqual(Object.keys(row), ['timestamp', 'sourceIp', 'account', 'level', 'description']);
  const output = execFileSync(process.execPath, ['xdr/exfiltration/read-alerts.mjs'], {
    cwd: new URL('../', import.meta.url), encoding: 'utf8', windowsHide: true,
  });
  assert.equal(output.trim().split('\n').length, alerts.length);
  assert.equal(await readFile(source, 'utf8'), before);
});
test('credentials are redacted and transfer details are not copied', () => {
  const alert = { timestamp: '2026-10-14T01:00:00Z',
    data: { srcip: '203.0.113.10', srcuser: 'token=fixture-secret-value', destination: 'private destination not copied' },
    rule: { level: 12, description: 'password=fixture-password-value' }, full_log: 'private raw log not copied' };
  const before = JSON.stringify(alert);
  const row = extractAlert(alert);
  assert.equal(row.account, '[REDACTED]');
  assert.equal(row.description, '[REDACTED]');
  for (const secret of ['fixture-secret-value', 'fixture-password-value', 'private destination', 'private raw log'])
    assert(!JSON.stringify(row).includes(secret));
  assert.equal(JSON.stringify(alert), before);
  assert.equal(extractAlert({}).account, null);
});

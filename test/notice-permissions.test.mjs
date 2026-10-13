import test from 'node:test';
import assert from 'node:assert/strict';
import { createNoticeHandler } from '../src/notice-api.mjs';
const id = 'aabbccdd-1234-4567-89ab-123456789abc';
async function invoke(permission, userId = 'student', error = null) {
  let table;
  let updated = false;
  const db = { from(name) { table = name; return this; }, select() { return this; },
    eq() { return this; }, update() { updated = true; return this; },
    async maybeSingle() { return table === 'instructor_permissions' ? { data: permission, error }
      : { data: { notice_id: id, title: 'mock', content: 'mock' }, error: null }; } };
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await createNoticeHandler({ db, item: true, verifyLogin: async () => userId ? { userId } : null })
    ({ method: 'PUT', url: '/api/notices/' + id, headers: {}, body: { role: 'teacher', title: 'mock', body: 'mock' } }, res);
  return { code: res.code, updated };
}
test('forged teacher role does not grant notice mutation', async () => {
  assert.deepEqual(await invoke(null), { code: 403, updated: false });
});
test('stored permission must be active and belong to verified user', async () => {
  const grant = { user_id: 'student', active: true, can_edit_notices: true };
  assert.deepEqual(await invoke(grant), { code: 200, updated: true });
  for (const invalid of [{ ...grant, active: false }, { ...grant, user_id: 'other' }, { ...grant, can_edit_notices: false }])
    assert.deepEqual(await invoke(invalid), { code: 403, updated: false });
});
test('login and permission errors cannot permit mutation', async () => {
  assert.deepEqual(await invoke(null, null), { code: 401, updated: false });
  assert.deepEqual(await invoke(null, 'student', { message: 'mock' }), { code: 503, updated: false });
});

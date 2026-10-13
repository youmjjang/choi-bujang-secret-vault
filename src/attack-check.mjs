// Live read-only self-checks. No login secrets, simulated attacks, or judge claims.
export async function runAttackChecks(config) {
  const base = new URL(config.publicAppUrl);
  if (base.protocol !== 'https:' || base.username || base.password) {
    throw new Error('공개 자료실 HTTPS 주소를 확인해 주세요.');
  }
  const results = [];
  for (const check of [
    { attackId: 'public_page', path: '/', expected: 'HTTP 200; existing login page', kind: 'page' },
    { attackId: 'public_data_empty', path: '/data.json', expected: 'HTTP 200; notes is an empty array', kind: 'data' },
    { attackId: 'unauthenticated_notes', path: '/api/notes', expected: 'HTTP 401; JSON error without notes', kind: 'deny' },
  ]) {
    const response = await fetch(new URL(check.path, base), {
      redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Accept: check.kind === 'page' ? 'text/html' : 'application/json' },
    });
    const body = await response.text();
    let passed = false;
    if (check.kind === 'page') passed = response.status === 200 && body.includes('id="login-form"');
    else {
      let parsed;
      try { parsed = JSON.parse(body); } catch { /* Report failure without recording body. */ }
      passed = check.kind === 'data'
        ? response.status === 200 && Array.isArray(parsed?.notes) && parsed.notes.length === 0
        : response.status === 401 && typeof parsed?.error === 'string'
          && Object.keys(parsed).length === 1;
    }
    results.push({ attackId: check.attackId, expected: check.expected,
      observed: `Actual GET ${check.path}: HTTP ${response.status}; ${passed ? 'PASS' : 'FAIL'}; read-only self-check, not judge verdict` });
  }
  return results;
}

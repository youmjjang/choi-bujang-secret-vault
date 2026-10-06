const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

function bodyObject(request) {
  if (!request.body) return {};
  if (typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') {
    try { return JSON.parse(request.body); } catch { return null; }
  }
  return null;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !supabaseSecretKey) {
    return response.status(500).json({ error: 'Server configuration unavailable' });
  }

  const payload = bodyObject(request);
  if (!payload || typeof payload.email !== 'string' || typeof payload.password !== 'string'
      || !payload.email.trim() || !payload.password) {
    return response.status(400).json({ error: '이메일과 비밀번호를 확인해 주세요.' });
  }

  const upstream = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseSecretKey,
    },
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
    }),
    signal: AbortSignal.timeout(10000),
  });

  const data = await upstream.json().catch(() => ({}));
  response.setHeader('Cache-Control', 'no-store');

  if (!upstream.ok || typeof data.access_token !== 'string') {
    return response.status(upstream.status === 400 ? 401 : upstream.status)
      .json({ error: data.error_description || data.msg || '로그인에 실패했습니다.' });
  }

  return response.status(200).json({
    accessToken: data.access_token,
    email: data.user?.email ?? payload.email.trim(),
  });
}

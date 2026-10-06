const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !supabaseSecretKey) {
    return response.status(500).json({ error: 'Server configuration unavailable' });
  }

  const authorization = request.headers.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    return response.status(401).json({ error: '로그인이 필요합니다.' });
  }

  await fetch(`${supabaseUrl}/auth/v1/logout`, {
    method: 'POST',
    headers: {
      apikey: supabaseSecretKey,
      Authorization: authorization,
    },
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);

  response.setHeader('Cache-Control', 'no-store');
  return response.status(204).end();
}

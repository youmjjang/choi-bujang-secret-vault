import config from '../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from '../src/verify-login.mjs';
import { resourceId } from '../src/resource-id.mjs';

const secret = process.env.SUPABASE_SECRET_KEY;
const verifyLogin = secret ? createLoginVerifier({ config, supabaseSecretKey: secret }) : null;

export default async function handler(request, response) {
  response.setHeader('X-Aleph-Resource-Id', resourceId('notices'));
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('X-Aleph-Deny-Reason', 'instructor_permission_unavailable');
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifyLogin) return response.status(500).json({ error: 'Server configuration unavailable' });
  const login = await verifyLogin(request.headers.authorization);
  if (!login) return response.status(401).json({ error: '로그인이 필요합니다.' });
  // No existing notice source was supplied. Do not fabricate notices or reuse private notes.
  return response.status(200).json([]);
}

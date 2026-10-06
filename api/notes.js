import { createClient } from '@supabase/supabase-js';
import config from '../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from '../src/verify-login.mjs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

const supabase = supabaseUrl && supabaseSecretKey
  ? createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const verifyLogin = supabaseSecretKey
  ? createLoginVerifier({ config, supabaseSecretKey })
  : null;

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase || !verifyLogin) {
    return response.status(500).json({ error: 'Server configuration unavailable' });
  }

  const login = await verifyLogin(request.headers.authorization);
  if (!login) {
    return response.status(401).json({ error: '로그인이 필요합니다.' });
  }

  const { data, error } = await supabase
    .from('learning_notes')
    .select('title, content')
    .order('id', { ascending: true });

  if (error) {
    return response.status(500).json({ error: 'Unable to load notes' });
  }

  response.setHeader('Cache-Control', 'no-store');
  return response.status(200).json({ notes: data ?? [] });
}

import { createClient } from '@supabase/supabase-js';
import config from '../../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from '../../src/verify-login.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
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

function bodyObject(request) {
  if (!request.body) return {};
  if (typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') {
    try { return JSON.parse(request.body); } catch { return null; }
  }
  return null;
}

function validText(value, max) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function noteResponse(note) {
  return { id: note.note_id, title: note.title, body: note.content };
}

export default async function handler(request, response) {
  if (!['GET', 'PUT', 'DELETE'].includes(request.method)) {
    response.setHeader('Allow', 'GET, PUT, DELETE');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase || !verifyLogin) {
    return response.status(500).json({ error: 'Server configuration unavailable' });
  }

  const login = await verifyLogin(request.headers.authorization);
  if (!login) {
    return response.status(401).json({ error: '로그인이 필요합니다.' });
  }

  const rawId = Array.isArray(request.query?.id) ? request.query.id[0] : request.query?.id;
  if (typeof rawId !== 'string' || !UUID.test(rawId)) {
    return response.status(400).json({ error: '올바른 메모 UUID가 필요합니다.' });
  }

  response.setHeader('Cache-Control', 'no-store');

  if (request.method === 'GET') {
    const { data, error } = await supabase
      .from('learning_notes')
      .select('note_id, title, content')
      .eq('note_id', rawId)
      .maybeSingle();

    if (error) return response.status(500).json({ error: 'Unable to load note' });
    if (!data) return response.status(404).json({ error: '메모를 찾을 수 없습니다.' });
    return response.status(200).json(noteResponse(data));
  }

  if (request.method === 'PUT') {
    const payload = bodyObject(request);
    if (!payload || !validText(payload.title, 200) || !validText(payload.body, 5000)) {
      return response.status(400).json({ error: 'title과 body를 확인해 주세요.' });
    }

    const { data, error } = await supabase
      .from('learning_notes')
      .update({ title: payload.title.trim(), content: payload.body.trim() })
      .eq('note_id', rawId)
      .select('note_id, title, content')
      .maybeSingle();

    if (error) return response.status(500).json({ error: 'Unable to update note' });
    if (!data) return response.status(404).json({ error: '메모를 찾을 수 없습니다.' });
    return response.status(200).json(noteResponse(data));
  }

  const { data, error } = await supabase
    .from('learning_notes')
    .delete()
    .eq('note_id', rawId)
    .select('note_id')
    .maybeSingle();

  if (error) return response.status(500).json({ error: 'Unable to delete note' });
  if (!data) return response.status(404).json({ error: '메모를 찾을 수 없습니다.' });
  return response.status(204).end();
}

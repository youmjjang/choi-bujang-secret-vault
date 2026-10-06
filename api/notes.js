import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import config from '../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from '../src/verify-login.mjs';

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

function hasOwnerField(payload) {
  return payload && Object.prototype.hasOwnProperty.call(payload, 'owner_id');
}

export default async function handler(request, response) {
  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase || !verifyLogin) {
    return response.status(500).json({ error: 'Server configuration unavailable' });
  }

  const login = await verifyLogin(request.headers.authorization);
  if (!login) {
    return response.status(401).json({ error: '로그인이 필요합니다.' });
  }

  response.setHeader('Cache-Control', 'no-store');

  if (request.method === 'GET') {
    const { data, error } = await supabase
      .from('learning_notes')
      .select('note_id, title, content')
      .eq('owner_id', login.userId)
      .order('created_at', { ascending: true });

    if (error) {
      return response.status(500).json({ error: 'Unable to load notes' });
    }

    return response.status(200).json((data ?? []).map(note => ({
      id: note.note_id,
      title: note.title,
      body: note.content,
    })));
  }

  const payload = bodyObject(request);
  if (!payload || hasOwnerField(payload)) {
    return response.status(400).json({ error: 'owner_id는 요청 본문에서 지정할 수 없습니다.' });
  }
  if (!validText(payload.title, 200) || !validText(payload.body, 5000)) {
    return response.status(400).json({ error: 'title과 body를 확인해 주세요.' });
  }

  const id = payload.id == null || payload.id === '' ? randomUUID() : payload.id;
  if (typeof id !== 'string' || !UUID.test(id)) {
    return response.status(400).json({ error: 'id는 UUID여야 합니다.' });
  }

  const { error } = await supabase
    .from('learning_notes')
    .insert({
      note_id: id,
      owner_id: login.userId,
      title: payload.title.trim(),
      content: payload.body.trim(),
    });

  if (error) {
    if (error.code === '23505') {
      return response.status(409).json({ error: '이미 존재하는 id입니다.' });
    }
    return response.status(500).json({ error: 'Unable to create note' });
  }

  return response.status(201).json({ id });
}

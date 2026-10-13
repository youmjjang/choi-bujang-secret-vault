import { resourceId } from './resource-id.mjs';
export function createNoticeHandler({ db, verifyLogin, item = false }) {
  return async (req, res) => {
    const deny = (code, reason) => { res.setHeader('X-Aleph-Deny-Reason', reason); return res.status(code).json({ error: reason }); };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Aleph-Resource-Id', resourceId('notices'));
    if (!['GET', ...(item ? ['PUT'] : [])].includes(req.method)) return deny(405, 'instructor_permission_unavailable');
    if (!db || !verifyLogin) return deny(503, 'server_configuration_unavailable');
    const login = await verifyLogin(req.headers.authorization);
    if (!login) return deny(401, 'login_required');
    let id;
    if (item) {
      let url;
      try { url = new URL(req.url, 'https://api.invalid'); } catch { return deny(400, 'invalid_resource_path'); }
      const match = /^\/api\/notices\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/iu.exec(url.pathname);
      if (!match || [...url.searchParams.keys()].some(key => key !== 'id')
        || url.searchParams.getAll('id').length > 1
        || url.searchParams.getAll('id').some(value => value.toLowerCase() !== match[1].toLowerCase())) return deny(400, 'invalid_resource_path');
      id = match[1].toLowerCase();
      res.setHeader('X-Aleph-Resource-Id', resourceId('notices', id));
    }
    if (req.method === 'PUT') {
      const grant = await db.from('instructor_permissions').select('user_id,active,can_edit_notices').eq('user_id', login.userId).maybeSingle();
      if (grant.error) return deny(503, 'permission_check_failed');
      if (grant.data?.user_id !== login.userId || grant.data?.active !== true || grant.data?.can_edit_notices !== true) return deny(403, 'instructor_required');
      let body = req.body;
      try { if (typeof body === 'string') body = JSON.parse(body); } catch { return deny(400, 'invalid_body'); }
      if (typeof body?.title !== 'string' || typeof body?.body !== 'string') return deny(400, 'invalid_body');
      const result = await db.from('instructor_notices').update({ title: body.title, content: body.body }).eq('notice_id', id).select('notice_id,title,content').maybeSingle();
      if (result.error) return deny(503, 'notice_update_failed');
      if (!result.data || result.data.notice_id !== id) return deny(404, 'notice_not_found');
      return res.status(200).json({ id, title: result.data.title, body: result.data.content });
    }
    const query = db.from('instructor_notices').select('notice_id,title,content');
    const result = item ? await query.eq('notice_id', id).maybeSingle() : await query.order('created_at', { ascending: false });
    if (result.error) return deny(503, 'notice_read_failed');
    if (item && (!result.data || result.data.notice_id !== id)) return deny(404, 'notice_not_found');
    const serialize = row => ({ id: row.notice_id, title: row.title, body: row.content });
    return res.status(200).json(item ? serialize(result.data) : (result.data ?? []).map(serialize));
  };
}

import notes from '../notes.js';

// Read-only alias; the shared handler verifies login and stored owner_id.
export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.setHeader('X-Aleph-Deny-Reason', 'method_not_allowed');
    return response.status(405).json({ error: 'method_not_allowed' });
  }
  return notes(request, response);
}

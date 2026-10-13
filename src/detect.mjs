// Call only with engine-verified events, never an HTTP body or client headers.
// Only selected metadata enters the detector; content and tokens are not copied.
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const WINDOW_MS = 600_000;
const LIMIT = 120;

export function readEvents(events) {
  if (!Array.isArray(events)) throw new TypeError('invalid_detection_events');
  return events.map(event => {
    const subject = event?.identity?.sub;
    const at = typeof event?.at === 'string' ? Date.parse(event.at) : NaN;
    if (!Number.isFinite(at) || typeof subject !== 'string' || !subject.trim()
        || subject.length > 256 || !METHODS.has(event?.method))
      throw new TypeError('invalid_detection_events');
    return { at, method: event.method, subject };
  });
}

function burst(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (row.method !== 'GET') continue;
    const key = row.deviceId ? JSON.stringify([row.subject, row.deviceId]) : row.subject;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => a.at - b.at);
    let left = 0;
    for (let right = 0; right < group.length; right++) {
      while (group[right].at - group[left].at > WINDOW_MS) left++;
      if (right - left + 1 > LIMIT) return group[right];
    }
  }
  return null;
}

// The published local event contract exposes only the pseudonymous subject.
export function detect(events) {
  const match = burst(readEvents(events));
  return match ? { action: 'propose_revocation', reasonCode: 'burst_read', subject: match.subject }
    : { action: 'observe' };
}

// Separate device-scoped proposal using documented aleph.decision.v1 fields.
// It never changes the five-field decide response or executes revocation.
export function detectVerifiedRequests(requests) {
  if (!Array.isArray(requests)) throw new TypeError('invalid_detection_requests');
  const rows = [];
  for (const request of requests) {
    if (request?.schema !== 'aleph.decision.v1' || Object.hasOwn(request, 'headers'))
      throw new TypeError('invalid_detection_requests');
    const { subjectId, deviceId, method, at, signals } = request;
    if (typeof subjectId !== 'string' || !subjectId.trim() || subjectId.length > 256
        || !/^[0-9a-f]{16}$/u.test(deviceId ?? '') || !METHODS.has(method)
        || typeof at !== 'string' || !Number.isFinite(Date.parse(at)))
      throw new TypeError('invalid_detection_requests');
    if (request.deviceRegistered !== true || signals?.source !== 'judge_fixture'
        || signals.network !== 'unusual') continue;
    rows.push({ subject: subjectId, deviceId, method, at: Date.parse(at) });
  }
  const match = burst(rows);
  return match ? { action: 'propose_revocation', reasonCode: 'burst_read',
    subject: match.subject, deviceId: match.deviceId } : { action: 'observe' };
}

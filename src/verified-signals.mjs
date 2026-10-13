export function readConnectionInput(request) {
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const unavailable = { kind: 'unavailable', region: null, network: null, hour: null, recentEvents: null };
  const invalid = { ...unavailable, kind: 'invalid' };
  if (!object(request) || request.schema !== 'aleph.decision.v1') return invalid;
  if (own(request, 'headers')) return invalid;
  if (!own(request, 'signals') || request.signals == null) return unavailable;
  const signals = request.signals;
  if (!object(signals) || !own(signals, 'source')) return invalid;
  if (signals.source === 'none') return unavailable;
  if (typeof signals.source !== 'string' || !signals.source) return invalid;
  if (signals.source !== 'judge_fixture') return unavailable;
  if (Object.keys(signals).sort().join(',') !== 'hour,network,region,source'
      || typeof signals.region !== 'string' || !signals.region.trim()
      || typeof signals.network !== 'string' || !signals.network.trim()
      || !Number.isInteger(signals.hour) || signals.hour < 0 || signals.hour > 23
      || signals.region === 'unknown' || signals.network === 'unknown'
      || !own(request, 'recentEvents') || !Array.isArray(request.recentEvents)) return invalid;
  if (request.recentEvents.length > 12 || request.recentEvents.some(event =>
    !object(event) || Object.keys(event).sort().join(',') !== 'ageSeconds,count,kind'
    || typeof event.kind !== 'string' || !event.kind.trim()
    || !Number.isFinite(event.ageSeconds) || event.ageSeconds < 0
    || !Number.isInteger(event.count) || event.count < 0)) return invalid;
  return { kind: 'judge_fixture', region: signals.region, network: signals.network,
    hour: signals.hour, recentEvents: request.recentEvents.map(event => ({ ...event })) };
}



// 운영 엔진이 확인한 요청 계약(aleph.decision.v1)만 사용합니다.
// 6단계: 등록 기기의 자료실 읽기만 허용합니다.
import { createResourcePolicy, fixtureBindings } from './resource-policy.mjs';
export const RULE_IDS = Object.freeze(['starter.deny', 'device_registered', 'step_up_required', 'resource_boundary']);

// Only call with the engine's validated decision envelope, never an HTTP body.
// A source label is not authentication. Headers cannot supply or override signals.
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

// Structure follows the supplied decider: device -> zone -> verified signals -> decision.
// Ownership uses stored server bindings and the final API, never identifier spelling.
function parseVerifiedSignals(request) {
  const parsed = readConnectionInput(request);
  return { ...parsed, trusted: parsed.kind === 'judge_fixture' };
}

function checkZoneAccess(request, permitted) {
  return permitted(request)
    && (request.queryLength === undefined || request.queryLength === 0)
    && (request.subjectId === undefined || (typeof request.subjectId === 'string' && request.subjectId.trim().length > 0))
    && (request.deviceId === undefined || /^[0-9a-f]{16}$/u.test(request.deviceId));
}

export function createDecider(bindings) {
  const permitted = createResourcePolicy(bindings);
  return function decide(request) {
    const response = (decision, reasonCode, ruleId) => ({
      schema: 'aleph.decision.v1', requestId: request?.requestId,
      decision, reasonCode, ruleIds: [ruleId],
    });
    if (request?.deviceRegistered !== true)
      return response('deny', 'device_not_registered', 'device_registered');

    const verifiedSignals = parseVerifiedSignals(request);
    if (verifiedSignals.kind === 'invalid')
      return response('deny', 'starter_not_ready', 'starter.deny');
    if (!checkZoneAccess(request, permitted))
      return response('deny', 'starter_not_ready', 'resource_boundary');

    // Keep the existing stage 7 thresholds rather than replacing them with new guesses.
    const isSuspicious = verifiedSignals.trusted && verifiedSignals.hour < 6
      && verifiedSignals.network === 'unusual'
      && verifiedSignals.recentEvents.some(event => event.kind === 'risk_signal'
        && event.ageSeconds <= 300 && event.count >= 20);
    const isStepUpVerified = verifiedSignals.trusted && request.stepUp?.verified === true
      && Number.isInteger(request.stepUp.authAgeSeconds)
      && request.stepUp.authAgeSeconds >= 0 && request.stepUp.authAgeSeconds <= 900;
    if (isSuspicious && !isStepUpVerified)
      return response('step_up', 'step_up_required', 'step_up_required');
    return response('allow', 'approved', 'device_registered');
  };
}

const defaultDecider = createDecider(fixtureBindings);
export function decide(request) {
  return defaultDecider(request);
}

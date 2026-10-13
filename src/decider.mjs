// 운영 엔진이 확인한 요청 계약(aleph.decision.v1)만 사용합니다.
// 6단계: 등록 기기의 자료실 읽기만 허용합니다.
export const RULE_IDS = Object.freeze(['starter.deny', 'device_registered']);

export async function decide(request) {
  const response = (decision, reasonCode, ruleId) => ({
    schema: 'aleph.decision.v1',
    requestId: request.requestId,
    decision,
    reasonCode,
    ruleIds: [ruleId],
  });

  if (request.deviceRegistered !== true) {
    return response('deny', 'device_not_registered', 'device_registered');
  }

  if (request.route === 'GET /notes' || request.route === 'GET /notes/:id') {
    return response('allow', 'approved', 'device_registered');
  }

  return response('deny', 'starter_not_ready', 'starter.deny');
}

// Official contract: https://docs.typesafe.ai/introduction/quickstart
export async function askJev(state, { apiKey = process.env.TYPESAFE_API_KEY, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('Jev unavailable');
  const response = await fetchImpl('https://api.typesafe.ai/v1/systemone', {
    method: 'POST', signal: AbortSignal.timeout(2500),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'jev-latest', state, questions: {
      attack: { type: 'noul', instructions: 'Do these authentication-failure indicators provide evidence of automated password guessing or password spraying rather than ordinary login mistakes? Missing evidence must not be assumed.' },
    } }),
  });
  if (!response.ok) throw new Error('Jev unavailable');
  const data = await response.json();
  const confidence = data?.answers?.attack?.noul;
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error('Invalid Jev answer');
  return { confidence };
}

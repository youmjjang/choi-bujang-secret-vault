export async function askJev(state) {
  const apiKey = typeof process === 'undefined' ? null : process.env.TYPESAFE_API_KEY;
  if (!apiKey) throw new Error('Jev unavailable');
  const response = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST', signal: AbortSignal.timeout(2500),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'jev-latest', state, questions: {
      attack: { type: 'noul', instructions: 'Do these derived web request indicators show an injection or traversal attack rather than ordinary search text? A lone keyword or quote is insufficient to confirm an attack. Do not assume missing evidence.' },
    } }),
  });
  if (!response.ok) throw new Error('Jev unavailable');
  const data = await response.json();
  const confidence = data?.answers?.attack?.noul;
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error('Invalid Jev confidence');
  return { confidence };
}
